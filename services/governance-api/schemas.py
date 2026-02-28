"""Pydantic schemas for request/response validation across all modules."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


# ============================================================
# Enums
# ============================================================
class AgentStatus(str, Enum):
    active = "active"
    suspended = "suspended"
    retired = "retired"
    probation = "probation"


class AgentTier(str, Enum):
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"
    T4 = "T4"


class DecisionType(str, Enum):
    auto_resolved = "auto_resolved"
    escalated = "escalated"
    overridden = "overridden"
    simulated = "simulated"


class SentinelVerdict(str, Enum):
    approve = "approve"
    block = "block"
    escalate = "escalate"


# ============================================================
# GENESIS: Agent Schemas
# ============================================================
class AgentCreate(BaseModel):
    agent_code: str = Field(..., max_length=20, examples=["AGENT-7749"])
    display_name: str = Field(..., max_length=100, examples=["Dispute Resolver Alpha"])
    role: str = Field(..., max_length=50, examples=["dispute_resolver"])
    crewai_role: str
    crewai_backstory: str
    tier: AgentTier = AgentTier.T4
    dna_profile: dict = Field(default_factory=dict)
    platform_bindings: list = Field(default_factory=list)


class AgentResponse(BaseModel):
    id: uuid.UUID
    agent_code: str
    display_name: str
    role: str
    status: AgentStatus
    trust_score: Decimal
    authority_limit: Decimal
    tier: AgentTier
    generation: int
    total_decisions: int
    total_escalations: int
    total_overrides: int
    dna_profile: dict
    social_contract: dict
    employed_date: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]
    total: int


# ============================================================
# PULSE: Trust Schemas
# ============================================================
class TrustEventCreate(BaseModel):
    agent_id: uuid.UUID
    event_type: str = Field(..., max_length=30)
    trigger_decision_id: uuid.UUID | None = None
    reason: str


class TrustEventResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    event_type: str
    delta: Decimal
    previous_score: Decimal
    new_score: Decimal
    authority_change: dict | None
    reason: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class TrustScoreResponse(BaseModel):
    agent_id: uuid.UUID
    agent_code: str
    current_score: Decimal
    tier: AgentTier
    authority_limit: Decimal
    velocity_7d: float
    trend: str  # "rising", "falling", "stable"


# ============================================================
# SENTINEL: Policy & Evaluation Schemas
# ============================================================
class PolicyCreate(BaseModel):
    policy_code: str = Field(..., max_length=50, examples=["POL-DISPUTE-LIMIT-001"])
    policy_name: str = Field(..., max_length=200)
    category: str = Field(..., max_length=50, examples=["authority"])
    description: str
    rule_definition: dict
    applies_to_roles: list[str] = Field(default=["*"])
    applies_to_tiers: list[str] = Field(default=["*"])
    severity: str = "medium"
    action_on_violation: str = "block"


class PolicyResponse(BaseModel):
    id: uuid.UUID
    policy_code: str
    policy_name: str
    category: str
    severity: str
    is_active: bool
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ActionEvaluationRequest(BaseModel):
    agent_id: uuid.UUID
    action: dict = Field(..., description="Proposed action to evaluate")
    context: dict = Field(default_factory=dict, description="Additional context")


class SentinelVerdictResponse(BaseModel):
    verdict: SentinelVerdict
    reasoning: str
    policy_results: list[dict]
    prophecy_paths: list[dict] | None = None
    confidence: float


# ============================================================
# ANCESTOR: Decision/Audit Schemas
# ============================================================
class DecisionResponse(BaseModel):
    id: uuid.UUID
    agent_id: uuid.UUID
    decision_type: DecisionType
    dispute_id: str | None
    output_action: dict
    confidence_score: Decimal | None
    risk_score: Decimal | None
    amount_involved: Decimal | None
    hash: str
    prev_hash: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ChainVerificationResponse(BaseModel):
    valid: bool
    total_links: int
    broken_links: list[uuid.UUID]
    verified_at: datetime


# ============================================================
# ECLIPSE: Escalation Schemas
# ============================================================
class EscalationCreate(BaseModel):
    decision_id: uuid.UUID
    agent_id: uuid.UUID
    escalation_reason: str = Field(..., max_length=50)
    priority: str = "medium"
    context_package: dict


class EscalationResponse(BaseModel):
    id: uuid.UUID
    decision_id: uuid.UUID
    agent_id: uuid.UUID
    escalation_reason: str
    priority: str
    status: str
    assigned_to: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


# ============================================================
# QICACHE: Cache Schemas
# ============================================================
class CacheQueryRequest(BaseModel):
    query_text: str
    agent_role: str
    context: dict = Field(default_factory=dict)
    cache_enabled: bool = True
    save_enabled: bool = True
    bypass: bool = False


class CacheQueryResponse(BaseModel):
    hit: bool
    response: str | None = None
    source: str  # "redis_hot", "postgres_warm", "llm"
    tokens_saved: int = 0
    query_hash: str


class CacheAnalyticsResponse(BaseModel):
    total_queries: int
    cache_hits: int
    cache_misses: int
    hit_rate: float
    tokens_saved: int
    cost_saved: Decimal


# ============================================================
# Health Check
# ============================================================
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    services: dict[str, str]
