"""
Supabase authentication for the admin endpoints.

The admin dashboard signs users in with Supabase Auth and sends the
resulting access token as `Authorization: Bearer <token>`. This module
verifies that token by asking Supabase itself (GET {SUPABASE_URL}/auth/v1/user),
which also rejects revoked sessions and expired tokens.

Only SUPABASE_URL and SUPABASE_ANON_KEY are needed for this -- the anon
key just identifies the project. The service-role key is deliberately not
used: verifying a user's token doesn't require it, and keeping a
key that bypasses all row-level security out of this process limits the
damage if the server is ever compromised.

If either variable is missing the dependency fails CLOSED (503) rather
than letting requests through unauthenticated.

Usage (see api/main.py):
    @app.get("/leads", dependencies=[Depends(get_current_user)])
"""

import hashlib
import logging
import os
import time

import httpx
from dotenv import load_dotenv
from fastapi import Header, HTTPException

load_dotenv()

logger = logging.getLogger("estateiq.api.auth")

# token-hash -> (expires_at, user). Spares a Supabase round trip on every
# request from a page that fires several calls at once. Short TTL so a
# sign-out or revoked session takes effect within seconds.
_CACHE_TTL_SECONDS = 30
_cache: dict[str, tuple[float, dict]] = {}


def _config() -> tuple[str, str]:
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    anon_key = os.environ.get("SUPABASE_ANON_KEY") or ""
    if not url or not anon_key:
        logger.error("SUPABASE_URL / SUPABASE_ANON_KEY are not set; rejecting authenticated request.")
        raise HTTPException(status_code=503, detail="Authentication is not configured on the server.")
    return url, anon_key


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """FastAPI dependency: returns the Supabase user (a dict with at least
    `id` and `email`) for a valid bearer token, else raises 401."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    key = hashlib.sha256(token.encode()).hexdigest()
    cached = _cache.get(key)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    url, anon_key = _config()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{url}/auth/v1/user",
                headers={"apikey": anon_key, "Authorization": f"Bearer {token}"},
            )
    except httpx.HTTPError as exc:
        logger.exception("Could not reach Supabase to verify a token.")
        raise HTTPException(status_code=503, detail="Authentication service unavailable.") from exc

    if resp.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if resp.status_code != 200:
        logger.error("Unexpected Supabase auth response: %s", resp.status_code)
        raise HTTPException(status_code=503, detail="Authentication service unavailable.")

    user = resp.json()
    if len(_cache) > 1000:
        _cache.clear()
    _cache[key] = (time.monotonic() + _CACHE_TTL_SECONDS, user)
    return user
