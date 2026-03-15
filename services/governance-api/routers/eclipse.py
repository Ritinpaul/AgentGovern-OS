"""
ECLIPSE Router — Human-in-the-loop (HITL) Approval Workbench.

Endpoints:
  GET    /api/v1/escalations          — List pending agent escalations
  GET    /api/v1/escalations/{id}     — Get escalation details
  POST   /api/v1/escalations/{id}/resolve — Human approval or rejection
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database import get_db
from models import EscalationCase, Agent

router = APIRouter(prefix="/api/v1/escalations", tags=["eclipse"])


# ── Schemas ───────────────────────────────────────────────────────────────

class EscalationResolve(BaseModel):
    verdict: str  # "APPROVED" | "REJECTED"
    human_reason: str
    assigned_to: str = "Admin"


class EscalationResponse(BaseModel):
    id: UUID
    agent_id: UUID
    decision_id: UUID
    escalation_reason: str
    priority: str
    status: str
    context_package: dict
    created_at: datetime
    resolved_at: datetime | None
    human_decision: dict | None
    agent_code: str | None = None

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[EscalationResponse])
async def list_escalations(
    status: str = "pending",
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List agent actions waiting for human approval."""
    query = (
        select(EscalationCase, Agent.agent_code)
        .join(Agent, EscalationCase.agent_id == Agent.id)
        .where(EscalationCase.status == status)
        .order_by(desc(EscalationCase.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    
    cases = []
    for row in result.all():
        case = row[0]
        agent_code = row[1]
        data = EscalationResponse.from_orm(case)
        data.agent_code = agent_code
        cases.append(data)
        
    return cases


@router.get("/{case_id}", response_model=EscalationResponse)
async def get_escalation(case_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get full details for a specific escalation case."""
    case = await db.get(EscalationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Escalation case not found")
        
    agent = await db.get(Agent, case.agent_id)
    resp = EscalationResponse.from_orm(case)
    resp.agent_code = agent.agent_code if agent else "unknown"
    return resp


@router.post("/{case_id}/resolve", response_model=EscalationResponse)
async def resolve_escalation(
    case_id: UUID,
    resolution: EscalationResolve,
    db: AsyncSession = Depends(get_db)
):
    """Human decision to APPROVE or REJECT an escalated agent action."""
    case = await db.get(EscalationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Escalation case not found")
        
    if case.status != "pending":
        raise HTTPException(status_code=400, detail=f"Case is already {case.status}")

    # Update case status
    case.status = "resolved"
    case.resolved_at = datetime.now(timezone.utc)
    case.assigned_to = resolution.assigned_to
    case.human_decision = {
        "verdict": resolution.verdict,
        "reason": resolution.human_reason,
        "resolved_by": resolution.assigned_to,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update agent stats
    agent = await db.get(Agent, case.agent_id)
    if agent:
        agent.total_overrides += 1
        agent.last_review_date = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(case)
    
    resp = EscalationResponse.from_orm(case)
    resp.agent_code = agent.agent_code if agent else "unknown"
    return resp
