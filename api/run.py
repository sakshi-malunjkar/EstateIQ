"""
Entry point for running the API on both Windows (local dev) and Linux
(Render).

Usage:
    python -m api.run

Binds to 0.0.0.0 on $PORT (Render assigns its own port; defaults to 8000
locally).

Windows only: psycopg's async driver requires asyncio's
SelectorEventLoop, but uvicorn's Server.run() hardcodes
asyncio.ProactorEventLoop as its loop factory on win32 and passes it
explicitly to asyncio.run(..., loop_factory=...), which overrides any
global event loop policy. Setting the policy alone is therefore NOT
enough; uvicorn's `loop` argument must name the selector loop
("asyncio:SelectorEventLoop" resolves to the plain
asyncio.SelectorEventLoop class, importable on every platform). On Linux
the default ("auto", uvloop when installed) is correct and is left alone.
"""

import os
import sys

import uvicorn


def main():
    loop = "auto"
    if sys.platform == "win32":
        import asyncio

        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        loop = "asyncio:SelectorEventLoop"

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        reload=False,
        loop=loop,
        log_level="info",
    )


if __name__ == "__main__":
    main()
