from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models import Decision, Agent

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])

@router.get("/")
async def list_decisions(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """List recent ledger decisions across all environments."""
    query = select(Decision).options(selectinload(Decision.agent)).order_by(Decision.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    decisions = result.scalars().all()
    
    logs = []
    for d in decisions:
        # Determine status
        status = "allowed"
        if d.sentinel_assessment:
            verdt = d.sentinel_assessment.get("verdict", "").lower()
            if verdt == "approve":
                status = "allowed"
            elif verdt == "block":
                status = "denied"
            elif verdt == "escalate":
                status = "escalated"

        env = "Cloud (Master)"
        if isinstance(d.input_context, dict):
            env = d.input_context.get("environment", "Cloud (Master)")

        logs.append({
            "id": f"{d.hash[:8]}...{d.hash[-4:]}" if d.hash else "0x000...000",
            "agent": d.agent.agent_code if getattr(d, "agent", None) else str(d.agent_id)[:8],
            "env": env,
            "action": d.decision_type.replace("_", " ").title(),
            "amount": f"₹{float(d.amount_involved):,.0f}" if d.amount_involved is not None and d.amount_involved > 0 else "-",
            "status": status,
            "time": d.timestamp.isoformat() if d.timestamp else "Just now"
        })
    
    return logs
