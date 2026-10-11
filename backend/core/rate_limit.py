"""
Module: backend.core.rate_limit
Purpose: In-memory rate limiter for sensitive endpoints.

         Design choices:
         - Simple sliding-window counter keyed by a tuple of
           (identifier, endpoint). No external dependency (Redis,
           memcached) — fine for single-instance deployment and
           the university-scale load (<200 concurrent users).
         - NOT suitable for multi-instance deployments. When we
           scale horizontally, swap this for Redis-backed limiting
           without changing the public API.
         - Two presets are exposed:
             login_limit    — 5 attempts / 15 minutes per IP
             register_limit — 3 attempts / 60 minutes per IP
         - Failed attempts count toward the limit; successful
           attempts do not reset the counter automatically
           (prevents "spray-and-pray" attacks).

Author: Abdullah (BSEF23M526)
Created: 10/10/2026
"""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Tuple

from fastapi import HTTPException, Request, status


# --- Storage ---
# Maps bucket_key -> deque of timestamps (unix seconds) of attempts.
_buckets: dict[str, Deque[float]] = defaultdict(deque)
_lock = Lock()


# --- Presets ---
class RateLimit:
    """A reusable rate-limit preset."""

    def __init__(self, max_attempts: int, window_seconds: int, name: str):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.name = name


# Login: 5 attempts per 15 minutes per IP.
login_limit = RateLimit(max_attempts=5, window_seconds=15 * 60, name="login")

# Register: 3 attempts per 60 minutes per IP (anti-spam).
register_limit = RateLimit(max_attempts=3, window_seconds=60 * 60, name="register")


# =============================================================================
# INTERNAL HELPERS
# =============================================================================
def _client_ip(request: Request) -> str:
    """
    Best-effort client IP extraction.

    Prefers X-Forwarded-For when present (behind a proxy), falling
    back to the direct client address. In production behind a
    trusted proxy, only the first hop should be trusted.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def _check_and_record(bucket_key: str, preset: RateLimit) -> None:
    """
    Enforce the preset for the given bucket key.

    Records the current attempt if allowed. Raises HTTPException 429
    when the limit is exceeded.

    Thread-safe via a global lock — acceptable at our scale.
    """
    now = time.time()
    cutoff = now - preset.window_seconds

    with _lock:
        bucket = _buckets[bucket_key]

        # Drop timestamps outside the sliding window.
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= preset.max_attempts:
            retry_after = int(bucket[0] + preset.window_seconds - now) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many {preset.name} attempts. "
                    f"Please try again in {retry_after} seconds."
                ),
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)


# =============================================================================
# PUBLIC API
# =============================================================================
def enforce_login_limit(request: Request) -> None:
    """Rate-limit decorator body for the login endpoint."""
    _check_and_record(f"login:{_client_ip(request)}", login_limit)


def enforce_register_limit(request: Request) -> None:
    """Rate-limit decorator body for the register endpoint."""
    _check_and_record(f"register:{_client_ip(request)}", register_limit)


def reset_all() -> None:
    """
    Clear all buckets. Intended for tests only — never call this
    from production code.
    """
    with _lock:
        _buckets.clear()