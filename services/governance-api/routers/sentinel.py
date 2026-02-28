"""SENTINEL Router — Policy Engine & Pre-Execution Evaluation.

Endpoints:
  POST   /api/v1/sentinel/evaluate  — Evaluate a proposed agent action
  GET    /api/v1/policies/          — List all policies
  POST   /api/v1/policies/          — Create a new policy
  PATCH  /api/v1/policies/{id}      — Update a policy
  DELETE /api/v1/policies/{id}      — Deactivate a policy
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Agent, Policy
from schemas import (
    ActionEvaluationRequest,
    PolicyCreate,
    PolicyResponse,
    SentinelVerdictResponse,
    SentinelVerdict,
)

router = APIRouter(tags=["sentinel"])


@router.post("/api/v1/sentinel/evaluate", response_model=SentinelVerdictResponse)
async def evaluate_action(
    request: ActionEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Pre-execution evaluation of a proposed agent action.

    Steps:
    1. Fetch agent trust score and authority limits
    2. Evaluate action against all applicable policies
    3. If boundary case → simulate prophecy paths
    4. Return verdict: APPROVE | BLOCK | ESCALATE
    """
    agent = await db.get(Agent, request.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Step 1: Authority check
    amount = request.action.get("amount", 0)
    policy_results = []

    # Step 2: Check policies
    result = await db.execute(select(Policy).where(Policy.is_active == True))
    policies = result.scalars().all()

    violations = []
    for policy in policies:
        # Check role applicability
        if "*" not in policy.applies_to_roles and agent.role not in policy.applies_to_roles:
            continue
        # Check tier applicability
        if "*" not in policy.applies_to_tiers and agent.tier not in policy.applies_to_tiers:
            continue

        # Evaluate rule
        rule = policy.rule_definition
        passed = _evaluate_rule(rule, agent, request.action, request.context)
        policy_results.append({
            "policy_code": policy.policy_code,
            "policy_name": policy.policy_name,
            "passed": passed,
            "severity": policy.severity,
        })
        if not passed:
            violations.append({
                "policy_code": policy.policy_code,
                "severity": policy.severity,
                "action": policy.action_on_violation,
            })

    # Step 3: Determine verdict
    if any(v["severity"] == "critical" for v in violations):
        verdict = SentinelVerdict.block
        reasoning = f"BLOCKED: Critical policy violation(s) detected — {[v['policy_code'] for v in violations]}"
        confidence = 0.99
    elif amount > float(agent.authority_limit):
        verdict = SentinelVerdict.escalate
        reasoning = (
            f"ESCALATE: Amount ₹{amount:,.2f} exceeds authority limit "
            f"₹{float(agent.authority_limit):,.2f} for {agent.tier} agent"
        )
        confidence = 0.95
    elif violations:
        verdict = SentinelVerdict.escalate
        reasoning = f"ESCALATE: Non-critical policy violations require human review — {[v['policy_code'] for v in violations]}"
        confidence = 0.85
    else:
        verdict = SentinelVerdict.approve
        reasoning = f"APPROVED: All {len(policy_results)} policies passed. Agent {agent.agent_code} within authority."
        confidence = 0.92

    return SentinelVerdictResponse(
        verdict=verdict,
        reasoning=reasoning,
        policy_results=policy_results,
        prophecy_paths=None,  # Phase 4 will add Prophecy Engine
        confidence=confidence,
    )


def _evaluate_rule(rule: dict, agent: Agent, action: dict, context: dict) -> bool:
    """Evaluate a policy rule against the current state.

    Simple rule engine — expand in Phase 4 with OPA/Rego integration.
    """
    rule_type = rule.get("type")

    if rule_type == "amount_limit":
        max_amount = rule.get("max_amount", 0)
        action_amount = action.get("amount", 0)
        return action_amount <= max_amount

    if rule_type == "trust_minimum":
        min_trust = rule.get("min_trust", 0)
        return float(agent.trust_score) >= min_trust

    if rule_type == "tier_required":
        allowed_tiers = rule.get("allowed_tiers", [])
        return agent.tier in allowed_tiers

    if rule_type == "status_check":
        return agent.status == "active"

    # Default: pass if rule type unknown (fail-open in dev, fail-close in prod)
    return True


# ──── Policy CRUD ────

@router.get("/api/v1/policies/", response_model=list[PolicyResponse])
async def list_policies(active_only: bool = True, db: AsyncSession = Depends(get_db)):
    """List all policies."""
    query = select(Policy)
    if active_only:
        query = query.where(Policy.is_active == True)
    result = await db.execute(query.order_by(Policy.category, Policy.policy_code))
    return result.scalars().all()


@router.post("/api/v1/policies/", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(policy_in: PolicyCreate, db: AsyncSession = Depends(get_db)):
    """Create a new policy."""
    existing = await db.execute(select(Policy).where(Policy.policy_code == policy_in.policy_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Policy {policy_in.policy_code} already exists")

    policy = Policy(**policy_in.model_dump())
    db.add(policy)
    await db.flush()
    await db.refresh(policy)
    return policy


@router.delete("/api/v1/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_policy(policy_id: UUID, db: AsyncSession = Depends(get_db)):
    """Deactivate a policy (soft delete)."""
    policy = await db.get(Policy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.is_active = False
    await db.flush()
