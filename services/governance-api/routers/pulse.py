"""PULSE Router — Dynamic Trust Scoring Engine.

Endpoints:
  GET    /api/v1/trust/{agent_id}         — Get current trust score
  GET    /api/v1/trust/{agent_id}/history — Trust event history
  GET    /api/v1/trust/{agent_id}/velocity — Trust velocity (7d rolling window)
  POST   /api/v1/trust/event              — Record a trust event
  GET    /api/v1/trust/leaderboard        — Fleet trust leaderboard
"""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Agent, TrustEvent
from schemas import TrustEventCreate, TrustEventResponse, TrustScoreResponse

router = APIRouter(prefix="/api/v1/trust", tags=["pulse"])

# Trust event deltas
TRUST_DELTAS: dict[str, Decimal] = {
    "decision_success_simple": Decimal("0.01"),
    "decision_success_complex": Decimal("0.03"),
    "decision_success_boundary": Decimal("0.05"),
    "correct_escalation": Decimal("0.02"),
    "learning_milestone": Decimal("0.02"),
    "zero_incident_streak_7d": Decimal("0.03"),
    "zero_incident_streak_30d": Decimal("0.05"),
    "decision_failure_minor": Decimal("-0.05"),
    "decision_failure_major": Decimal("-0.15"),
    "human_override": Decimal("-0.03"),
    "policy_violation_low": Decimal("-0.05"),
    "policy_violation_high": Decimal("-0.10"),
    "policy_violation_critical": Decimal("-0.20"),
    "unnecessary_escalation": Decimal("-0.01"),
    "time_decay_daily": Decimal("-0.001"),
}

TIER_THRESHOLDS = {
    "T4": (Decimal("0.00"), Decimal("0.60"), Decimal("0.00")),
    "T3": (Decimal("0.60"), Decimal("0.75"), Decimal("10000.00")),
    "T2": (Decimal("0.75"), Decimal("0.90"), Decimal("50000.00")),
    "T1": (Decimal("0.90"), Decimal("1.00"), Decimal("100000.00")),
}


def _compute_tier(score: Decimal) -> tuple[str, Decimal]:
    """Determine tier and authority limit from trust score."""
    for tier, (low, high, limit) in TIER_THRESHOLDS.items():
        if low <= score < high:
            return tier, limit
    return "T1", Decimal("100000.00")


@router.get("/{agent_id}", response_model=TrustScoreResponse)
async def get_trust_score(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get current trust score with tier and velocity."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Calculate 7-day velocity
    velocity = await _calculate_velocity(db, agent_id, days=7)
    trend = "rising" if velocity > 0.001 else "falling" if velocity < -0.001 else "stable"

    return TrustScoreResponse(
        agent_id=agent.id,
        agent_code=agent.agent_code,
        current_score=agent.trust_score,
        tier=agent.tier,
        authority_limit=agent.authority_limit,
        velocity_7d=velocity,
        trend=trend,
    )


@router.post("/event", response_model=TrustEventResponse)
async def record_trust_event(event_in: TrustEventCreate, db: AsyncSession = Depends(get_db)):
    """Record a trust event and update the agent's score."""
    agent = await db.get(Agent, event_in.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    delta = TRUST_DELTAS.get(event_in.event_type, Decimal("0.00"))
    previous_score = agent.trust_score
    new_score = max(Decimal("0.00"), min(Decimal("1.00"), previous_score + delta))

    # Check tier change
    old_tier = agent.tier
    new_tier, new_limit = _compute_tier(new_score)
    authority_change = None
    if old_tier != new_tier:
        authority_change = {
            "old_tier": old_tier,
            "new_tier": new_tier,
            "old_limit": float(agent.authority_limit),
            "new_limit": float(new_limit),
        }

    # Update agent
    agent.trust_score = new_score
    agent.tier = new_tier
    agent.authority_limit = new_limit

    # Create trust event
    event = TrustEvent(
        agent_id=event_in.agent_id,
        event_type=event_in.event_type,
        trigger_decision_id=event_in.trigger_decision_id,
        delta=delta,
        previous_score=previous_score,
        new_score=new_score,
        authority_change=authority_change,
        reason=event_in.reason,
    )
    db.add(event)
    await db.flush()
    await db.refresh(event)
    return event


@router.get("/{agent_id}/history", response_model=list[TrustEventResponse])
async def get_trust_history(
    agent_id: UUID, limit: int = 50, db: AsyncSession = Depends(get_db)
):
    """Get trust event history for an agent."""
    result = await db.execute(
        select(TrustEvent)
        .where(TrustEvent.agent_id == agent_id)
        .order_by(desc(TrustEvent.timestamp))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/leaderboard")
async def trust_leaderboard(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Fleet trust leaderboard — top agents by trust score."""
    result = await db.execute(
        select(Agent)
        .where(Agent.status == "active")
        .order_by(desc(Agent.trust_score))
        .limit(limit)
    )
    agents = result.scalars().all()
    return [
        {
            "rank": i + 1,
            "agent_code": a.agent_code,
            "display_name": a.display_name,
            "trust_score": float(a.trust_score),
            "tier": a.tier,
            "total_decisions": a.total_decisions,
        }
        for i, a in enumerate(agents)
    ]


async def _calculate_velocity(db: AsyncSession, agent_id: UUID, days: int = 7) -> float:
    """Calculate trust velocity over a rolling window."""
    from datetime import datetime, timedelta

    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(func.sum(TrustEvent.delta))
        .where(TrustEvent.agent_id == agent_id)
        .where(TrustEvent.timestamp >= cutoff)
    )
    total_delta = result.scalar() or Decimal("0.00")
    return float(total_delta) / days
