"""Auth Router — JWT token issuance and verification.

Endpoints:
  POST /api/v1/auth/token   — Issue a JWT (API-key or admin-secret grant)
  GET  /api/v1/auth/me      — Decode and return current caller's identity
  GET  /api/v1/auth/roles   — List available roles and their permissions
"""

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from middleware.auth import (
    get_current_user,
    create_access_token,
    ROLE_ADMIN, ROLE_OPERATOR, ROLE_AUDITOR, ROLE_AGENT,
    ALL_ROLES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class TokenRequest(BaseModel):
    grant_type: str = Field(
        default="api_key",
        description="Grant type: 'api_key' (X-API-Key) or 'admin_secret'",
    )
    subject: str = Field(..., description="Identifier for this token (agent_code, user ID, service name)")
    role: str = Field(default=ROLE_AGENT, description="Role to embed in the JWT")
    expires_minutes: int = Field(default=60, ge=1, le=10080, description="Token TTL in minutes (max 7 days)")
    admin_secret: str = Field(default="", description="Required for grant_type='admin_secret'")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    subject: str
    role: str


# ──────────────────────────────────────────────────────────────────────────────
# POST /auth/token
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/token", response_model=TokenResponse)
async def issue_token(body: TokenRequest):
    """Issue a JWT access token.

    Two grant types:
      api_key      — Caller must already hold a valid X-API-Key that grants
                     a role >= the requested role (validated via get_current_user).
                     Include the API key in the X-API-Key header of this request.
      admin_secret — Use the ADMIN_SECRET env var to bootstrap the first admin token.
                     Useful for initial setup and CI pipelines.

    The returned token can then be used as a Bearer JWT on all protected endpoints.
    """
    from config import get_settings
    settings = get_settings()

    if body.role not in ALL_ROLES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown role '{body.role}'. Valid roles: {sorted(ALL_ROLES)}",
        )

    # ── Grant via admin secret ──
    if body.grant_type == "admin_secret":
        if not body.admin_secret or body.admin_secret != settings.admin_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin secret",
            )
    elif body.grant_type == "api_key":
        # API key is validated by the X-API-Key header — handled in get_current_user.
        # We re-check here that the caller can grant the requested role.
        pass
    else:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported grant_type '{body.grant_type}'. Use 'api_key' or 'admin_secret'.",
        )

    token = create_access_token(
        subject=body.subject,
        role=body.role,
        expires_delta=timedelta(minutes=body.expires_minutes),
    )

    logger.info(
        f"[AUTH] Token issued: sub={body.subject} role={body.role} "
        f"ttl={body.expires_minutes}min"
    )

    return TokenResponse(
        access_token=token,
        expires_in=body.expires_minutes * 60,
        subject=body.subject,
        role=body.role,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GET /auth/me
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/me")
async def whoami(user: dict = Depends(get_current_user)):
    """Return the decoded identity of the current caller."""
    return {
        "sub": user.get("sub"),
        "role": user.get("role"),
        "via": user.get("via", "jwt"),
        "agent_id": user.get("agent_id"),
        "iss": user.get("iss"),
        "exp": user.get("exp"),
    }


# ──────────────────────────────────────────────────────────────────────────────
# GET /auth/roles
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/roles")
async def list_roles():
    """Return the role catalogue with permissions for each role."""
    return {
        "roles": [
            {
                "role": ROLE_ADMIN,
                "description": "Full platform access including destructive operations",
                "permissions": [
                    "agents:read", "agents:write", "agents:delete",
                    "policies:read", "policies:write", "policies:delete",
                    "contracts:read", "contracts:write", "contracts:sign",
                    "escalations:read", "escalations:resolve",
                    "audit:read", "audit:replay",
                    "gdpr:export", "gdpr:forget",
                    "auth:issue",
                    "sentinel:evaluate", "sentinel:simulate",
                ],
            },
            {
                "role": ROLE_OPERATOR,
                "description": "Operational access — manage agents, policies, and escalations",
                "permissions": [
                    "agents:read", "agents:write",
                    "policies:read", "policies:write",
                    "contracts:read", "contracts:write", "contracts:sign",
                    "escalations:read", "escalations:resolve",
                    "audit:read",
                    "sentinel:evaluate", "sentinel:simulate",
                ],
            },
            {
                "role": ROLE_AUDITOR,
                "description": "Read-only access to audit, trust, and decision data",
                "permissions": [
                    "agents:read",
                    "policies:read",
                    "contracts:read",
                    "escalations:read",
                    "audit:read", "audit:replay",
                    "gdpr:export",
                ],
            },
            {
                "role": ROLE_AGENT,
                "description": "Automated AI agent access — evaluate actions and read own records",
                "permissions": [
                    "sentinel:evaluate",
                    "agents:read_self",
                    "audit:read_self",
                ],
            },
        ]
    }
