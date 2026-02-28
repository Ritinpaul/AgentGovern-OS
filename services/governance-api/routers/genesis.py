"""GENESIS Router — Agent Identity & DNA Management.

Endpoints:
  POST   /api/v1/agents/           — Register a new agent
  GET    /api/v1/agents/           — List all agents
  GET    /api/v1/agents/{id}       — Get agent by ID
  PATCH  /api/v1/agents/{id}       — Update agent
  DELETE /api/v1/agents/{id}       — Retire agent
  GET    /api/v1/agents/{id}/dna   — Get agent DNA profile
  GET    /api/v1/agents/{id}/lineage — Get agent lineage tree
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Agent, AgentGene
from schemas import AgentCreate, AgentResponse, AgentListResponse

router = APIRouter(prefix="/api/v1/agents", tags=["genesis"])


@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def register_agent(agent_in: AgentCreate, db: AsyncSession = Depends(get_db)):
    """Register a new agent in the GENESIS registry."""
    existing = await db.execute(select(Agent).where(Agent.agent_code == agent_in.agent_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Agent {agent_in.agent_code} already exists")

    agent = Agent(
        agent_code=agent_in.agent_code,
        display_name=agent_in.display_name,
        role=agent_in.role,
        crewai_role=agent_in.crewai_role,
        crewai_backstory=agent_in.crewai_backstory,
        tier=agent_in.tier.value,
        dna_profile=agent_in.dna_profile,
        platform_bindings=agent_in.platform_bindings,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.get("/", response_model=AgentListResponse)
async def list_agents(
    status_filter: str | None = None,
    tier: str | None = None,
    role: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all agents with optional filters."""
    query = select(Agent)
    if status_filter:
        query = query.where(Agent.status == status_filter)
    if tier:
        query = query.where(Agent.tier == tier)
    if role:
        query = query.where(Agent.role == role)

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit).order_by(Agent.trust_score.desc()))
    agents = result.scalars().all()

    return AgentListResponse(agents=agents, total=total)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single agent by ID."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: UUID, updates: dict, db: AsyncSession = Depends(get_db)):
    """Update agent fields (partial update)."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    allowed_fields = {"display_name", "status", "tier", "dna_profile", "platform_bindings", "metadata"}
    for key, value in updates.items():
        if key in allowed_fields:
            setattr(agent, key if key != "metadata" else "metadata_", value)

    await db.flush()
    await db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def retire_agent(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    """Retire an agent (soft delete — sets status to 'retired')."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.status = "retired"
    await db.flush()


@router.get("/{agent_id}/dna")
async def get_agent_dna(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get agent's Decision DNA profile with all genes."""
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    result = await db.execute(select(AgentGene).where(AgentGene.agent_id == agent_id))
    genes = result.scalars().all()

    return {
        "agent_code": agent.agent_code,
        "dna_profile": agent.dna_profile,
        "genes": [
            {
                "gene_name": g.gene_name,
                "gene_type": g.gene_type,
                "acquired_from": g.acquired_from,
                "strength": float(g.strength),
                "version": g.version,
                "mutations": g.mutation_log,
            }
            for g in genes
        ],
        "generation": agent.generation,
        "parent_agent_id": str(agent.parent_agent_id) if agent.parent_agent_id else None,
    }
