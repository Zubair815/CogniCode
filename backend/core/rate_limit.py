"""
Module: backend.core.rate_limit
Purpose: Thread-safe sliding-window rate limiter and per-key concurrency guard
         for authentication and LLM-facing WebSocket endpoints.
"""

import threading
import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter keyed by client/user/endpoint."""

    def __init__(self) -> None:
        self._events: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        """
        Record an attempt if under limit.
        Returns (allowed, retry_after_seconds).
        """
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            dq = self._events[key]
            while dq and dq[0] <= cutoff:
                dq.popleft()

            if len(dq) >= max_requests:
                retry_after = max(1, int(dq[0] + window_seconds - now) + 1)
                return False, retry_after

            dq.append(now)
            return True, 0

    def reset(self) -> None:
        """Clear all recorded windows (intended for isolated unit tests)."""
        with self._lock:
            self._events.clear()


rate_limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP cleanly, honoring X-Forwarded-For left-most address."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_http_rate_limit(
    request: Request,
    bucket: str,
    max_requests: int,
    window_seconds: int,
    extra_key: str = "",
) -> None:
    """Raise HTTP 429 with Retry-After header when the sliding window is exceeded."""
    ip = get_client_ip(request)
    key = f"{bucket}:{ip}:{extra_key}" if extra_key else f"{bucket}:{ip}"
    allowed, retry_after = rate_limiter.check(key, max_requests, window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait and try again.",
            headers={"Retry-After": str(retry_after)},
        )
