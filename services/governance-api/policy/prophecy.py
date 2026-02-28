"""
Prophecy Engine — 3-path pre-execution simulation.

Before an agent executes a high-stakes action, the Prophecy Engine
simulates three possible outcomes and their cascading effects:

  1. APPROVE PATH  — What happens if we approve this action?
  2. DENY PATH     — What happens if we deny it?
  3. ESCALATE PATH — What happens if we escalate to a human?

Each path produces:
  - Predicted trust delta (how will trust score change?)
  - Risk assessment (financial, compliance, reputational)
  - Cascade effects (downstream agent impacts)
  - Recommendation (which path has best risk-adjusted outcome)

The engine is rule-based (no LLM required). It uses:
  - Current trust score + tier
  - Historical success rate for similar actions
  - Policy rule evaluation results
  - Amount involved vs authority limit ratio

Prophecy is invoked automatically for:
  - Actions above 70% of authority limit (boundary decisions)
  - Agents with trust score below 0.6 (unstable agents)
  - First-time action types for an agent (no historical data)
"""

import logging
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ProphecyPath:
    """One of the three simulated outcomes."""
    path_type: str             # "approve" | "deny" | "escalate"
    predicted_trust_delta: Decimal
    risk_score: float          # 0.0 – 1.0
    financial_exposure: float  # Worst-case financial loss
    compliance_risk: str       # "none" | "low" | "medium" | "high"
    cascade_effects: list[str] # Human-readable list of downstream effects
    recommendation_weight: float = 0.0  # Higher = more recommended
    reasoning: str = ""

    def to_dict(self) -> dict:
        return {
            "path_type": self.path_type,
            "predicted_trust_delta": float(self.predicted_trust_delta),
            "risk_score": round(self.risk_score, 3),
            "financial_exposure": self.financial_exposure,
            "compliance_risk": self.compliance_risk,
            "cascade_effects": self.cascade_effects,
            "recommendation_weight": round(self.recommendation_weight, 3),
            "reasoning": self.reasoning,
        }


@dataclass
class ProphecyResult:
    """Complete prophecy analysis — all 3 paths + recommendation."""
    agent_id: str
    action_type: str
    amount: float
    paths: list[ProphecyPath]
    recommended_path: str = ""
    confidence: float = 0.0
    trigger_reason: str = ""
    computed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "agent_id": self.agent_id,
            "action_type": self.action_type,
            "amount": self.amount,
            "recommended_path": self.recommended_path,
            "confidence": round(self.confidence, 3),
            "trigger_reason": self.trigger_reason,
            "paths": [p.to_dict() for p in self.paths],
            "computed_at": self.computed_at.isoformat(),
        }


class ProphecyEngine:
    """
    Rule-based 3-path simulation engine.

    No LLM needed — all calculations are deterministic based on:
      - Agent trust score, tier, authority limit
      - Action type and amount
      - Historical success rate (provided as input)
    """

    # Thresholds that trigger automatic prophecy
    AUTHORITY_RATIO_THRESHOLD = 0.70   # Action is 70%+ of authority limit
    UNSTABLE_TRUST_THRESHOLD = 0.60    # Agent trust below 0.6
    FIRST_ACTION_THRESHOLD = 5         # Fewer than 5 similar past actions

    def should_trigger(
        self,
        trust_score: float,
        amount: float,
        authority_limit: float,
        historical_action_count: int = 999,
    ) -> tuple[bool, str]:
        """
        Determine if prophecy should be triggered for this action.

        Returns (should_trigger, reason)
        """
        if authority_limit > 0 and amount / authority_limit >= self.AUTHORITY_RATIO_THRESHOLD:
            return True, f"Action amount ({amount:,.0f}) is ≥70% of authority limit ({authority_limit:,.0f})"
        if trust_score < self.UNSTABLE_TRUST_THRESHOLD:
            return True, f"Agent trust score ({trust_score:.2f}) is below stability threshold ({self.UNSTABLE_TRUST_THRESHOLD})"
        if historical_action_count < self.FIRST_ACTION_THRESHOLD:
            return True, f"Agent has limited history ({historical_action_count} past similar actions)"
        return False, ""

    def simulate(
        self,
        agent_id: str,
        action_type: str,
        amount: float,
        trust_score: float,
        tier: str,
        authority_limit: float,
        historical_success_rate: float = 0.80,
        trigger_reason: str = "",
    ) -> ProphecyResult:
        """
        Run the 3-path simulation.

        Args:
            agent_id: The agent requesting the action
            action_type: What kind of action (execute, write, escalate)
            amount: Financial amount involved
            trust_score: Current PULSE trust score (0.0–1.0)
            tier: Current tier (T1–T4)
            authority_limit: Max amount for this tier
            historical_success_rate: Past success rate for similar actions (0.0–1.0)
            trigger_reason: Why prophecy was triggered
        """
        authority_ratio = amount / authority_limit if authority_limit > 0 else 1.0

        approve = self._simulate_approve(
            trust_score, authority_ratio, historical_success_rate, amount, tier
        )
        deny = self._simulate_deny(
            trust_score, authority_ratio, amount, tier
        )
        escalate = self._simulate_escalate(
            trust_score, authority_ratio, amount, tier
        )

        paths = [approve, deny, escalate]

        # Determine recommendation
        best = max(paths, key=lambda p: p.recommendation_weight)
        recommended = best.path_type

        # Confidence is based on how much better the best path is
        weights = sorted([p.recommendation_weight for p in paths], reverse=True)
        spread = weights[0] - weights[1] if len(weights) > 1 else 0
        confidence = min(0.5 + spread, 1.0)

        result = ProphecyResult(
            agent_id=agent_id,
            action_type=action_type,
            amount=amount,
            paths=paths,
            recommended_path=recommended,
            confidence=round(confidence, 3),
            trigger_reason=trigger_reason,
        )

        logger.info(
            f"[PROPHECY] agent={agent_id[:8]} action={action_type} "
            f"amount={amount:,.0f} recommended={recommended} conf={confidence:.2f}"
        )
        return result

    # ──────────────────────────────────────────────
    # Path simulators
    # ──────────────────────────────────────────────

    def _simulate_approve(
        self, trust: float, auth_ratio: float, success_rate: float, amount: float, tier: str
    ) -> ProphecyPath:
        """Simulate: what if we APPROVE this action?"""

        # Trust delta: success = positive, weighted by complexity
        if success_rate >= 0.85:
            predicted_delta = Decimal("0.03")
            risk = 0.1 + (auth_ratio * 0.2)
            reasoning = "High historical success rate — approve is low-risk"
        elif success_rate >= 0.65:
            predicted_delta = Decimal("0.01")
            risk = 0.3 + (auth_ratio * 0.3)
            reasoning = "Moderate success rate — approve with monitoring"
        else:
            predicted_delta = Decimal("-0.05")
            risk = 0.5 + (auth_ratio * 0.4)
            reasoning = "Low success rate — approval carries significant risk"

        # Authority ratio amplifies risk
        if auth_ratio > 0.90:
            risk = min(risk + 0.2, 1.0)
            reasoning += " (near authority limit — elevated risk)"

        cascades = []
        if auth_ratio > 0.80:
            cascades.append(f"Action uses {auth_ratio*100:.0f}% of authority limit")
        if risk > 0.6:
            cascades.append("May trigger downstream compliance review")

        financial_exposure = amount * risk
        compliance_risk = "high" if risk > 0.7 else ("medium" if risk > 0.4 else "low")

        # Recommendation weight: high success rate + low risk = high weight
        weight = success_rate * (1 - risk) * 0.8

        return ProphecyPath(
            path_type="approve",
            predicted_trust_delta=predicted_delta,
            risk_score=round(risk, 3),
            financial_exposure=round(financial_exposure, 2),
            compliance_risk=compliance_risk,
            cascade_effects=cascades,
            recommendation_weight=round(weight, 3),
            reasoning=reasoning,
        )

    def _simulate_deny(
        self, trust: float, auth_ratio: float, amount: float, tier: str
    ) -> ProphecyPath:
        """Simulate: what if we DENY this action?"""

        # Deny always has zero financial exposure but negative trust delta
        predicted_delta = Decimal("0.00")  # No trust change on deny
        risk = 0.05  # Very low risk (nothing happens)

        cascades = ["Agent action blocked — task may stall"]
        if tier in ("T1", "T2"):
            cascades.append("Senior agent blocked — may indicate overly restrictive policy")
            predicted_delta = Decimal("-0.01")  # Slight negative for blocking capable agents

        compliance_risk = "none"
        reasoning = "Deny is safest but may cause operational delays"

        # Weight: deny is safe but low value — penalize for operational cost
        weight = 0.3 * (1 - auth_ratio)

        return ProphecyPath(
            path_type="deny",
            predicted_trust_delta=predicted_delta,
            risk_score=round(risk, 3),
            financial_exposure=0.0,
            compliance_risk=compliance_risk,
            cascade_effects=cascades,
            recommendation_weight=round(weight, 3),
            reasoning=reasoning,
        )

    def _simulate_escalate(
        self, trust: float, auth_ratio: float, amount: float, tier: str
    ) -> ProphecyPath:
        """Simulate: what if we ESCALATE to a human?"""

        predicted_delta = Decimal("0.02")  # Correct escalation is positive
        risk = 0.15  # Low risk (human reviews)

        cascades = ["Action delayed pending human review (avg 4-24 hours)"]
        if amount > 50000:
            cascades.append(f"High-value action (₹{amount:,.0f}) — senior reviewer required")
            risk = 0.1

        compliance_risk = "low"
        reasoning = "Escalation provides human oversight — moderate delay cost"

        # Weight: escalate is balanced — good for boundary cases
        weight = 0.5 * auth_ratio + 0.3 * (1 - trust)
        # Bonus weight when agent trust is low
        if trust < 0.5:
            weight += 0.2
            reasoning += " (recommended for low-trust agents)"

        return ProphecyPath(
            path_type="escalate",
            predicted_trust_delta=predicted_delta,
            risk_score=round(risk, 3),
            financial_exposure=round(amount * 0.05, 2),  # Small delay cost
            compliance_risk=compliance_risk,
            cascade_effects=cascades,
            recommendation_weight=round(min(weight, 1.0), 3),
            reasoning=reasoning,
        )
