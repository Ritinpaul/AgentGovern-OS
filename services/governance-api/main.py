"""
AgentGovern OS — Governance API
================================
Enterprise-grade Digital Colleague Governance Platform.

This is the central FastAPI service that provides:
- GENESIS:   Agent Identity & DNA Registry
- PULSE:     Dynamic Trust Scoring Engine
- SENTINEL:  Policy Engine & Pre-Execution Evaluation
- ANCESTOR:  Immutable Decision Ledger
- CONTRACT:  Social Contracts
- ECLIPSE:   Human-in-the-Loop Workbench
- QICACHE:   Query Intelligence Cache
- AUTH:      JWT / API-Key Authentication (Phase 5)
- GDPR:      Data Export & Right-to-Erasure (Phase 5)

Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_env == "development":
        await init_db()
    yield


app = FastAPI(
    title="AgentGovern OS — Governance API",
    description=(
        "Enterprise-grade Digital Colleague Governance Platform. "
        "Manages agent identity, trust scoring, policy enforcement, "
        "decision auditing, and human-in-the-loop escalations."
    ),
    version="0.5.0",
    lifespan=lifespan,
)

# ── Phase 5: Security Headers + Comprehensive API Access Log ─────────────────
from middleware.security_headers import SecurityHeadersMiddleware, APIAccessLogMiddleware

app.add_middleware(SecurityHeadersMiddleware, hsts_enabled=(settings.app_env != "development"))
app.add_middleware(APIAccessLogMiddleware, persist_to_db=True)

# ── CORS (must be registered after SecurityHeaders for correct ordering) ──────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "development" else settings.allowed_origins.split(",") if hasattr(settings, "allowed_origins") and settings.allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-API-Key", "X-Agent-ID", "X-Timestamp", "X-Signature"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers import genesis, pulse, sentinel, cache, audit, eclipse
from routers import governance  # Phase 2: Universal Connector
from routers import contract    # Phase 4: Social Contracts
from routers import auth        # Phase 5: JWT / API-Key Auth
from routers import gdpr        # Phase 5: GDPR Data Export & Erasure
from routers import gateways    # Phase 9.3: Live Gateways dashboard data
from routers import realtime    # Phase 9.3: WebSocket live telemetry

app.include_router(genesis.router)
app.include_router(pulse.router)
app.include_router(sentinel.router)
app.include_router(cache.router)
app.include_router(audit.router)
app.include_router(eclipse.router)
app.include_router(governance.router)
app.include_router(contract.router)
app.include_router(auth.router)   # Phase 5: POST /auth/token, GET /auth/me
app.include_router(gdpr.router)   # Phase 5: GET /gdpr/export, DELETE /gdpr/forget
app.include_router(gateways.router)
app.include_router(realtime.router)


# ── Root & Health ─────────────────────────────────────────────────────────────

@app.get("/", tags=["root"])
async def root():
    return {
        "name": "AgentGovern OS",
        "version": "0.5.0",
        "status": "operational",
        "modules": [
            "GENESIS", "PULSE", "SENTINEL", "QICACHE",
            "ANCESTOR", "ECLIPSE", "CONTRACT",
            "AUTH", "GDPR",
        ],
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health_check():
    db_ok = True
    redis_ok = True

    try:
        from database import async_session_factory
        from sqlalchemy import text
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    try:
        import redis
        r = redis.from_url(settings.redis_url, socket_timeout=1)
        r.ping()
    except Exception:
        redis_ok = False

    overall = "ok" if db_ok and redis_ok else "degraded"

    return {
        "status": overall,
        "version": "0.5.0",
        "services": {
            "api": "up",
            "database": "up" if db_ok else "down",
            "redis": "up" if redis_ok else "down",
        },
    }
