"""Tiny in-memory rate limiter for auth endpoints (single-instance deployment)."""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(name: str, limit: int, window_s: int):
    """FastAPI dependency: allow `limit` calls per client IP per `window_s` seconds."""
    def dep(request: Request) -> None:
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
            request.client.host if request.client else "?"
        )
        key = f"{name}:{ip}"
        now = time.monotonic()
        q = _hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="Too many attempts — please wait and try again")
        q.append(now)
    return dep


def reset() -> None:
    _hits.clear()
