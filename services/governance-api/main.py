"""
AgentGovern OS — Governance API
================================
Enterprise-grade Digital Colleague Governance Platform.

This is the central FastAPI service that provides:
- GENESIS: Agent Identity & DNA Registry
- PULSE: Dynamic Trust Scoring Engine
- SENTINEL: Policy Engine & Pre-Execution Evaluation
- ANCESTOR: Immutable Decision Ledger (Phase 5)
- CONTRACT: Social Contracts (Phase 6)
- ECLIPSE: Human-in-the-Loop Workbench (Phase 7)
- QICACHE: Query Intelligence Cache

Run with: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import init_db
from routers import genesis, pulse, sentinel, cache

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    # Startup
    if settings.app_env == "development":
        await init_db()
    yield
    # Shutdown (cleanup if needed)


app = FastAPI(
    title="AgentGovern OS — Governance API",
    description=(
        "Enterprise-grade Digital Colleague Governance Platform. "
        "Manages agent identity, trust scoring, policy enforcement, "
        "decision auditing, and human-in-the-loop escalations."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(genesis.router)
app.include_router(pulse.router)
app.include_router(sentinel.router)
app.include_router(cache.router)


@app.get("/", tags=["root"])
async def root():
    return {
        "name": "AgentGovern OS",
        "version": "0.1.0",
        "status": "operational",
        "modules": ["GENESIS", "PULSE", "SENTINEL", "QICACHE"],
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "version": "0.1.0",
        "services": {
            "api": "up",
            "database": "up",  # TODO: actual health check
            "redis": "up",     # TODO: actual health check
            "ollama": "up",    # TODO: actual health check
        },
    }
