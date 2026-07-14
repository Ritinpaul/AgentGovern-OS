"""REALTIME Router — Live dashboard telemetry stream.

WebSocket endpoint designed for hackathon/demo reliability:
  WS /ws/live  — Emits periodic heartbeat snapshots with fleet summary
"""

import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select

from database import async_session
from models import Agent, EscalationCase

router = APIRouter(tags=["realtime"])


async def _build_snapshot() -> dict:
    """Build a compact dashboard payload from live DB state."""
    async with async_session() as session:
        total_agents = await session.scalar(select(func.count()).select_from(Agent)) or 0
        active_agents = await session.scalar(
            select(func.count()).select_from(Agent).where(Agent.status == "active")
        ) or 0
        avg_trust = await session.scalar(select(func.avg(Agent.trust_score)))
        pending_escalations = await session.scalar(
            select(func.count()).select_from(EscalationCase).where(EscalationCase.status == "pending")
        ) or 0

    return {
        "type": "heartbeat",
        "ts": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "total_agents": int(total_agents),
            "active_agents": int(active_agents),
            "avg_trust": float(avg_trust) if avg_trust is not None else 0.0,
            "pending_escalations": int(pending_escalations),
        },
    }


@router.websocket("/ws/live")
async def websocket_live_dashboard(websocket: WebSocket):
    """Push periodic telemetry snapshots for the dashboard.

    The stream is intentionally small and resilient so demo environments stay stable.
    """
    await websocket.accept()
    await websocket.send_json({
        "type": "connected",
        "ts": datetime.now(timezone.utc).isoformat(),
        "message": "Live telemetry stream established",
    })

    try:
        while True:
            await websocket.send_json(await _build_snapshot())
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        return
