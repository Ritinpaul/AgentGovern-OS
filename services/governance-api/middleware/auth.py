"""Auth middleware — JWT token validation, API key verification, and RBAC.

Provides FastAPI dependencies that guard endpoints by:
  1. Validating a Bearer JWT (HS256) issued by this platform
  2. OR validating an X-API-Key header against the configured key store
  3. Extracting the caller's role from claims and enforcing role requirements

Role hierarchy (least → most privileged):
  agent    — automated AI agents calling the governance API
  auditor  — read-only access to audit ledger and trust data
  operator — can trigger evaluations and manage escalations
  admin    — full access including policy and contract management

Usage example:
  @router.delete("/policies/{id}")
  async def delete_policy(
      _: dict = Depends(require_roles("admin", "operator")),
  ):
      ...
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

# ── Role constants ────────────────────────────────────────────────────────────

ROLE_AGENT = "agent"
ROLE_AUDITOR = "auditor"
ROLE_OPERATOR = "operator"
ROLE_ADMIN = "admin"

ALL_ROLES = {ROLE_AGENT, ROLE_AUDITOR, ROLE_OPERATOR, ROLE_ADMIN}

# Privilege hierarchy: each role includes all roles below it
_ROLE_HIERARCHY: dict[str, set[str]] = {
    ROLE_ADMIN: {ROLE_ADMIN, ROLE_OPERATOR, ROLE_AUDITOR, ROLE_AGENT},
    ROLE_OPERATOR: {ROLE_OPERATOR, ROLE_AUDITOR, ROLE_AGENT},
    ROLE_AUDITOR: {ROLE_AUDITOR, ROLE_AGENT},
    ROLE_AGENT: {ROLE_AGENT},
}

# ── JWT bearer scheme (optional — does not auto-raise 403) ───────────────────
_bearer = HTTPBearer(auto_error=False)


# ── Core helpers ──────────────────────────────────────────────────────────────

def _decode_jwt(token: str) -> dict:
    """Decode and validate a HS256 JWT. Returns the claims dict."""
    try:
        from jose import jwt, JWTError
        from config import get_settings
        settings = get_settings()
        claims = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return claims
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired JWT: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _validate_api_key(api_key: str) -> dict:
    """Validate an API key against configured keys. Returns synthetic claims."""
    from config import get_settings
    settings = get_settings()

    # Check master admin key
    if api_key == settings.admin_api_key and settings.admin_api_key:
        return {"sub": "admin-api-key", "role": ROLE_ADMIN, "via": "api_key"}

    # Check per-role static keys (comma-separated KEY:ROLE pairs in config)
    for entry in (settings.api_keys or "").split(","):
        entry = entry.strip()
        if not entry:
            continue
        if ":" in entry:
            key_val, role = entry.rsplit(":", 1)
            if api_key == key_val.strip() and role.strip() in ALL_ROLES:
                return {"sub": f"apikey-{role.strip()}", "role": role.strip(), "via": "api_key"}
        elif api_key == entry:
            # Key without role → default to operator
            return {"sub": "apikey-operator", "role": ROLE_OPERATOR, "via": "api_key"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
        headers={"WWW-Authenticate": "ApiKey"},
    )


# ── Primary auth dependency ───────────────────────────────────────────────────

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
    x_api_key: Annotated[str | None, Header(alias="X-API-Key")] = None,
) -> dict:
    """Extract and validate the caller identity.

    Resolution order:
      1. Bearer JWT in Authorization header
      2. X-API-Key header
      3. Development bypass (when app_env == 'development')

    Returns a claims dict with at least: sub, role.
    """
    from config import get_settings
    settings = get_settings()

    # ── 1. JWT ──
    if credentials and credentials.credentials:
        claims = _decode_jwt(credentials.credentials)
        if "role" not in claims:
            claims["role"] = ROLE_AGENT  # Default role for tokens without explicit role
        logger.debug(f"[AUTH] JWT auth: sub={claims.get('sub')} role={claims.get('role')}")
        return claims

    # ── 2. API Key ──
    if x_api_key:
        claims = _validate_api_key(x_api_key)
        logger.debug(f"[AUTH] API key auth: sub={claims.get('sub')} role={claims.get('role')}")
        return claims

    # ── 3. Development bypass ──
    if settings.app_env == "development":
        return {"sub": "dev-bypass", "role": ROLE_ADMIN, "via": "dev_bypass"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide a Bearer JWT or X-API-Key header.",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── Role guard factory ────────────────────────────────────────────────────────

def require_roles(*allowed_roles: str):
    """Return a FastAPI dependency that enforces role membership.

    The check uses the privilege hierarchy: an admin satisfies any role requirement.

    Usage:
        @router.post("/contracts/{id}/sign")
        async def sign(user=Depends(require_roles("admin", "operator"))):
            ...
    """
    allowed_set = set(allowed_roles)

    async def _guard(user: dict = Depends(get_current_user)) -> dict:
        caller_role = user.get("role", ROLE_AGENT)
        # Expand the caller role via hierarchy
        effective_roles = _ROLE_HIERARCHY.get(caller_role, {caller_role})
        if not effective_roles & allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{caller_role}' is not authorised for this operation. "
                    f"Required: {sorted(allowed_set)}"
                ),
            )
        return user

    return _guard


# Convenience shortcuts
require_admin = require_roles(ROLE_ADMIN)
require_operator = require_roles(ROLE_ADMIN, ROLE_OPERATOR)
require_auditor = require_roles(ROLE_ADMIN, ROLE_OPERATOR, ROLE_AUDITOR)


# ── Token issuance (for /auth/token endpoint) ─────────────────────────────────

def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    from jose import jwt
    from config import get_settings
    settings = get_settings()

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.jwt_expire_minutes)
    )
    claims = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "agentgovern-os",
    }
    return jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
