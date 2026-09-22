"""
Windows-safe entry point for running the API.

psycopg's async driver requires asyncio's SelectorEventLoop; Windows
defaults to ProactorEventLoop. Setting the event loop policy (as
api/database.py also does, for direct-script use) is NOT enough here --
uvicorn's Server.run() (see uvicorn/loops/asyncio.py's
asyncio_loop_factory) hardcodes `asyncio.ProactorEventLoop` as its loop
factory on win32 and passes that explicitly to asyncio.run(...,
loop_factory=...), which overrides the global policy entirely. The fix
is to tell uvicorn's Config to use a different loop factory via the
`loop` argument -- "asyncio:SelectorEventLoop" resolves to the plain
asyncio.SelectorEventLoop class (which is directly importable even on
Windows), overriding uvicorn's own win32 special-casing.

Usage:
    python -m api.run
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=False, loop="asyncio:SelectorEventLoop")
