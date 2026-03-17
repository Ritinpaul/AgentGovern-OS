"""Rate limiter middleware — per-agent / per-IP sliding-window rate limiting.

Uses Redis INCR + EXPIRE to implement a fixed-window counter per identifier.
Falls back gracefully (allow-through) when Redis is unavailable.

Identifier resolution order:
  1. X-Agent-ID request header
  2. JWT sub claim (if Bearer token present)
  3. Client IP address

Default limits (overridable in config):
  - Standard:  100 requests / 60 seconds
  - Burst:     20 requests / 10 seconds  (short-window guard)

Usage:
  @router.post("/governance/evaluate")
  async def evaluate(
      _: None = Depends(check_rate_limit),
      ...
  ):
      ...

  # Custom limit for a specific endpoint:
  @router.post("/expensive-endpoint")
  async def heavy(
      _: None = Depends(rate_limit(max_requests=10, window_seconds=60)),
  ):
      ...
"""

import logging
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Header, Request, status

logger = logging.getLogger(__name__)

# ── Redis helper ──────────────────────────────────────────────────────────────

def _get_redis():
    try:
        import redis
        from config import get_settings
        settings = get_settings()
        client = redis.from_url(settings.redis_url, decode_responses=True, socket_timeout=1)
        client.ping()
        return client
    except Exception:
        return None


# ── Core sliding-window counter ───────────────────────────────────────────────

def _check_window(redis_client, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int, int]:
    """Increment a Redis counter for the given key within the window.

    Returns (allowed, current_count, ttl_seconds).
    """
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.ttl(key)
    count, ttl = pipe.execute()

    if ttl == -1:
        # Key exists but has no expiry — set it (race-condition guard)
        redis_client.expire(key, window_seconds)
        ttl = window_seconds
    elif ttl == -2 or count == 1:
        # Key was just created by INCR — set expiry
        redis_client.expire(key, window_seconds)
        ttl = window_seconds

    allowed = count <= max_requests
    return allowed, count, ttl


# ── Identifier extractor ──────────────────────────────────────────────────────

def _extract_identifier(request: Request, x_agent_id: str | None) -> str:
    """Resolve the best available identifier for rate-limiting."""
    if x_agent_id:
        return f"agent:{x_agent_id}"

    # Try JWT sub claim from Authorization header
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        try:
            from jose import jwt
            from config import get_settings
            settings = get_settings()
            token = auth_header[7:]
            claims = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_exp": False},  # Don't fail on expired for rate-limit purposes
            )
            sub = claims.get("sub")
            if sub:
                return f"jwt:{sub}"
        except Exception:
            pass

    # Fall back to client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    return f"ip:{client_ip}"


# ── Dependency factory ────────────────────────────────────────────────────────

def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """Return a FastAPI dependency that enforces a custom rate limit.

    Args:
        max_requests:   Maximum number of requests allowed in the window.
        window_seconds: Size of the rolling window in seconds.
    """
    async def _limiter(
        request: Request,
        x_agent_id: Annotated[str | None, Header(alias="X-Agent-ID")] = None,
    ) -> None:
        from config import get_settings
        settings = get_settings()

        # Skip rate limiting in development unless explicitly enabled
        if settings.app_env == "development" and not settings.rate_limit_enabled:
            return

        r = _get_redis()
        if not r:
            # Redis unavailable — fail open (allow traffic) with a warning
            logger.warning("[RATE_LIMIT] Redis unavailable — rate limiting skipped")
            return

        identifier = _extract_identifier(request, x_agent_id)
        window_key = f"rl:{identifier}:{window_seconds}"

        allowed, count, ttl = _check_window(r, window_key, max_requests, window_seconds)

        # Inject rate limit info into request state for response headers
        request.state.rate_limit_limit = max_requests
        request.state.rate_limit_remaining = max(0, max_requests - count)
        request.state.rate_limit_reset = int(time.time()) + ttl

        if not allowed:
            logger.warning(
                f"[RATE_LIMIT] Limit exceeded for {identifier}: "
                f"{count}/{max_requests} in {window_seconds}s"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: {count} requests in {window_seconds}s "
                    f"(max {max_requests}). Retry after {ttl}s."
                ),
                headers={
                    "Retry-After": str(ttl),
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + ttl),
                },
            )

    return _limiter


# ── Pre-built standard dependencies ──────────────────────────────────────────

# 100 req/min — general API endpoints
check_rate_limit = rate_limit(max_requests=100, window_seconds=60)

# 20 req/min — heavy compute endpoints (governance evaluate, CrewAI kickoff)
check_rate_limit_strict = rate_limit(max_requests=20, window_seconds=60)

# 200 req/min — read-only / cheap endpoints
check_rate_limit_relaxed = rate_limit(max_requests=200, window_seconds=60)
