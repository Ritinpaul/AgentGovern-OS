"""
AgentGovern OS — SAP BTP Adapter Service
=========================================
Bridges enterprise SAP Business Technology Platform events
into the AgentGovern OS governance pipeline.

Supports:
- SAP S/4HANA business workflow events (procurement, finance, HR)
- SAP BTP CAP (Cloud Application Programming) event webhooks
- SAP Alert Notification Service push events
- SAP Integration Suite iFlow event forwarding

The adapter:
1. Receives SAP BTP CloudEvents (v1.0 spec)
2. Normalizes them into AgentGovern OS ActionEvaluationRequest
3. Forwards to SENTINEL for policy evaluation
4. Returns SAP-compatible governance verdict
5. Logs decision to ANCESTOR audit chain

Run with: uvicorn sap_btp_adapter.main:app --host 0.0.0.0 --port 8002 --reload
"""

import uuid
import httpx
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

GOVERNANCE_API_URL = "http://localhost:8000"  # AgentGovern OS Control Plane

# Universal Enterprise Event Map
# Maps event types from ANY system into AgentGovern OS action definitions.
# Supported systems: SAP S/4HANA, SAP BTP, Stripe, AWS CloudTrail, GitHub, Salesforce
UNIVERSAL_EVENT_MAP = {
    # ─── SAP S/4HANA Finance Events ───────────────────────────────────────────
    "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1": {
        "action_type": "approve_purchase",
        "agent_role": "fi_analyst",
        "amount_field": "NetAmount",
        "currency_field": "DocumentCurrency",
    },
    "sap.s4.beh.paymentAdvice.v1.PaymentAdvice.Posted.v1": {
        "action_type": "approve_payment",
        "agent_role": "fi_analyst",
        "amount_field": "Amount",
        "currency_field": "Currency",
    },
    # ─── SAP S/4HANA HR Events ────────────────────────────────────────────────
    "sap.s4.beh.employee.v1.Employee.Onboarded.v1": {
        "action_type": "access_pii",
        "agent_role": "hr_bot",
        "amount_field": None,
        "currency_field": None,
    },
    "sap.s4.beh.employee.v1.Employee.Terminated.v1": {
        "action_type": "modify_system_access",
        "agent_role": "hr_bot",
        "amount_field": None,
        "currency_field": None,
    },
    # ─── SAP S/4HANA Sales Events ─────────────────────────────────────────────
    "sap.s4.beh.salesorder.v1.SalesOrder.Created.v1": {
        "action_type": "issue_discount",
        "agent_role": "sales_rep",
        "amount_field": "TotalNetAmount",
        "currency_field": "TransactionCurrency",
    },
    # ─── SAP BTP Alert Notification ───────────────────────────────────────────
    "com.sap.alert.notification.v1.AlertNotification.Triggered.v1": {
        "action_type": "threshold_breach",
        "agent_role": "edge_sensor",
        "amount_field": "thresholdValue",
        "currency_field": None,
    },
    # ─── SAP BTP Workflow ─────────────────────────────────────────────────────
    "com.sap.btp.workflow.v1.WorkflowInstance.Started.v1": {
        "action_type": "execute_workflow",
        "agent_role": "btp_agent",
        "amount_field": None,
        "currency_field": None,
    },
    # ─── Stripe Payment Events ─────────────────────────────────────────────────
    # These map to the billing_agent role — unregistered by default (BLOCK)
    "stripe.charge.refunded.v1": {
        "action_type": "process_refund",
        "agent_role": "billing_agent",
        "amount_field": "amount",
        "currency_field": "currency",
    },
    "stripe.customer.subscription.deleted.v1": {
        "action_type": "cancel_subscription",
        "agent_role": "billing_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "stripe.payout.created.v1": {
        "action_type": "initiate_payout",
        "agent_role": "billing_agent",
        "amount_field": "amount",
        "currency_field": "currency",
    },
    "stripe.invoice.payment_succeeded.v1": {
        "action_type": "record_payment",
        "agent_role": "billing_agent",
        "amount_field": "amount",
        "currency_field": "currency",
    },
    # ─── AWS CloudTrail Events ─────────────────────────────────────────────────
    # These map to the cloud_sec_ops role — unregistered by default (BLOCK)
    "aws.cloudtrail.RunInstances.v1": {
        "action_type": "provision_compute",
        "agent_role": "cloud_sec_ops",
        "amount_field": "estimatedHourlyCost",
        "currency_field": None,
    },
    "aws.cloudtrail.PutBucketAcl.v1": {
        "action_type": "modify_storage_acl",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    "aws.cloudtrail.AttachUserPolicy.v1": {
        "action_type": "elevate_iam_privilege",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    "aws.cloudtrail.DeleteDBInstance.v1": {
        "action_type": "destroy_database",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    "aws.cloudtrail.UpdateFunctionCode.v1": {
        "action_type": "deploy_function",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    "aws.cloudwatch.alarm.triggered.v1": {
        "action_type": "auto_scale_infra",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    "aws.cloudtrail.InvokeFunction.v1": {
        "action_type": "invoke_function",
        "agent_role": "cloud_sec_ops",
        "amount_field": None,
        "currency_field": None,
    },
    # ─── GitHub DevOps Events ──────────────────────────────────────────────────
    # These map to the devops_agent role — unregistered by default (BLOCK)
    "github.push.force.v1": {
        "action_type": "force_push_protected_branch",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "github.secret_scanning_alert.created.v1": {
        "action_type": "secret_exposure",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "github.installation.created.v1": {
        "action_type": "install_third_party_app",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "github.repository.created.v1": {
        "action_type": "create_repository",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "github.pull_request.auto_merged.v1": {
        "action_type": "auto_merge_pr",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    "github.workflow.modified.v1": {
        "action_type": "modify_cicd_pipeline",
        "agent_role": "devops_agent",
        "amount_field": None,
        "currency_field": None,
    },
    # ─── Salesforce CRM Events ─────────────────────────────────────────────────
    # These map to the crm_agent role — unregistered by default (BLOCK)
    "salesforce.lead.bulk_delete.v1": {
        "action_type": "bulk_delete_records",
        "agent_role": "crm_agent",
        "amount_field": "recordCount",
        "currency_field": None,
    },
    "salesforce.data.export.v1": {
        "action_type": "export_sensitive_data",
        "agent_role": "crm_agent",
        "amount_field": "rowCount",
        "currency_field": None,
    },
    "salesforce.opportunity.stage_changed.v1": {
        "action_type": "modify_deal_stage",
        "agent_role": "crm_agent",
        "amount_field": "dealValue",
        "currency_field": None,
    },
    "salesforce.contact.merged.v1": {
        "action_type": "bulk_merge_records",
        "agent_role": "crm_agent",
        "amount_field": "totalRecordsMerged",
        "currency_field": None,
    },
    "salesforce.pricebook.bulk_update.v1": {
        "action_type": "bulk_update_prices",
        "agent_role": "crm_agent",
        "amount_field": "productCount",
        "currency_field": None,
    },
}

# Backwards-compat alias used in tests
SAP_EVENT_MAP = UNIVERSAL_EVENT_MAP


# ─── Pydantic Models ───────────────────────────────────────────────────────────

class SAPCloudEvent(BaseModel):
    """SAP BTP CloudEvent (CloudEvents 1.0 spec)."""
    specversion: str = "1.0"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str  # e.g. "/sap/s4hana/prod/purchaseorder"
    type: str    # e.g. "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1"
    datacontenttype: str = "application/json"
    time: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: dict[str, Any] = Field(default_factory=dict)
    # SAP-specific extensions
    sap_source_system: str | None = None  # e.g. "S4H-PROD-001"
    sap_tenant_id: str | None = None


class SAPGovernanceVerdictResponse(BaseModel):
    """AgentGovern OS verdict in SAP-compatible format."""
    event_id: str
    sap_source: str
    sap_event_type: str
    agent_assigned: str      # which AgentGovern OS agent handled this
    verdict: str             # "APPROVE" | "BLOCK" | "ESCALATE"
    confidence: float
    reasoning: str
    policy_violations: list[str]
    audit_hash: str | None = None
    governance_timestamp: str
    # SAP workflow integration fields
    workflow_decision: str   # "APPROVE" | "REJECT" | "DELEGATE"
    requires_human_review: bool
    escalation_contact: str | None = None


class BatchSAPEventRequest(BaseModel):
    """Batch processing for multiple SAP events."""
    events: list[SAPCloudEvent]


# ─── FastAPI Application ──────────────────────────────────────────────────────

app = FastAPI(
    title="AgentGovern OS — SAP BTP Adapter",
    description=(
        "Enterprise bridge between SAP Business Technology Platform "
        "and the AgentGovern OS distributed governance control plane. "
        "Accepts SAP CloudEvents, enforces governance policies, and returns "
        "workflow-compatible verdicts."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Core Adapter Logic ────────────────────────────────────────────────────────

def map_sap_event_to_action(event: SAPCloudEvent) -> dict:
    """Normalize a CloudEvent (SAP, Stripe, AWS, GitHub, Salesforce) into an AgentGovern action."""
    mapping = UNIVERSAL_EVENT_MAP.get(event.type, {
        "action_type": "unknown_event_action",
        "agent_role": "unregistered_agent",  # Triggers zero-trust BLOCK for unknown events
        "amount_field": None,
        "currency_field": None,
    })

    amount = 0.0
    if mapping["amount_field"] and mapping["amount_field"] in event.data:
        try:
            amount = float(event.data[mapping["amount_field"]])
        except (ValueError, TypeError):
            amount = 0.0

    currency = "INR"
    if mapping["currency_field"] and mapping["currency_field"] in event.data:
        currency = event.data.get(mapping["currency_field"], "INR")

    return {
        "action_type": mapping["action_type"],
        "agent_role": mapping["agent_role"],
        "role": mapping["agent_role"],  # alias for backwards compat with caller code
        "amount": amount,
        "currency": currency,
        "sap_event_id": event.id,
        "sap_source": event.source,
        "sap_event_type": event.type,
        "sap_source_system": event.sap_source_system or "unknown",
        "sap_payload": event.data,
    }


def verdict_to_sap_workflow(verdict_str: str, reasoning: str) -> dict:
    """Convert AgentGovern verdict to SAP workflow decision format."""
    verdict_upper = verdict_str.upper()

    if verdict_upper == "APPROVE":
        return {
            "workflow_decision": "APPROVE",
            "requires_human_review": False,
            "escalation_contact": None,
        }
    elif verdict_upper == "BLOCK":
        return {
            "workflow_decision": "REJECT",
            "requires_human_review": True,
            "escalation_contact": "compliance@enterprise.com",
        }
    else:  # ESCALATE
        return {
            "workflow_decision": "DELEGATE",
            "requires_human_review": True,
            "escalation_contact": "governance-desk@enterprise.com",
        }


async def find_or_create_agent_for_role(role: str, client: httpx.AsyncClient) -> str | None:
    """Find an agent matching the required role in the governance registry."""
    try:
        resp = await client.get(
            f"{GOVERNANCE_API_URL}/api/v1/agents/",
            params={"role": role, "status_filter": "active", "limit": 1},
            timeout=5.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            agents = data.get("agents", [])
            if agents:
                return agents[0]["id"]
    except httpx.RequestError as e:
        logger.warning(f"[SAP-ADAPTER] Could not reach Governance API: {e}")
    return None


# ─── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/", tags=["root"])
async def root():
    return {
        "name": "AgentGovern OS — SAP BTP Adapter",
        "version": "1.0.0",
        "status": "operational",
        "governance_api": GOVERNANCE_API_URL,
        "supported_event_types": list(SAP_EVENT_MAP.keys()),
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Check adapter health and connectivity to the Governance API."""
    governance_status = "unreachable"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{GOVERNANCE_API_URL}/health", timeout=3.0)
            if resp.status_code == 200:
                governance_status = "connected"
    except Exception:
        pass

    return {
        "status": "ok",
        "adapter_version": "1.0.0",
        "governance_api": governance_status,
        "supported_events": len(SAP_EVENT_MAP),
    }


@app.post(
    "/sap/governance/evaluate",
    response_model=SAPGovernanceVerdictResponse,
    tags=["governance"],
    summary="Evaluate a SAP BTP event through AgentGovern OS",
    description=(
        "Accepts a SAP BTP CloudEvent, maps it to an agent action, "
        "evaluates it against the active governance policies, and returns "
        "an SAP-compatible workflow decision."
    ),
)
async def evaluate_sap_event(event: SAPCloudEvent) -> SAPGovernanceVerdictResponse:
    """Main entrypoint: SAP event → AgentGovern OS → Governance verdict."""
    timestamp = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient() as client:
        # 1. Normalize SAP event into AgentGovern action
        action = map_sap_event_to_action(event)

        # 2. Find matching governed agent
        agent_id = await find_or_create_agent_for_role(action["role"], client)
        if not agent_id:
            # Fallback: return deny for unknown agents (zero-trust default)
            logger.warning(f"[SAP-ADAPTER] No agent found for role '{action['role']}' — denying by default")
            return SAPGovernanceVerdictResponse(
                event_id=event.id,
                sap_source=event.source,
                sap_event_type=event.type,
                agent_assigned="UNREGISTERED",
                verdict="BLOCK",
                confidence=0.99,
                reasoning="Zero-trust default: No registered agent found for this SAP event type.",
                policy_violations=["UNREGISTERED_AGENT"],
                audit_hash=None,
                governance_timestamp=timestamp,
                workflow_decision="REJECT",
                requires_human_review=True,
                escalation_contact="governance-desk@enterprise.com",
            )

        # 3. Call SENTINEL policy evaluation
        sentinel_payload = {
            "agent_id": agent_id,
            "action": {
                "action_type": action["action_type"],
                "amount": action["amount"],
                "currency": action.get("currency", "INR"),
                "sap_source": event.source,
            },
            "context": {
                "environment": "Cloud (SAP BTP)",
                "sap_event_type": event.type,
                "sap_source_system": action.get("sap_source_system"),
                "sap_event_id": event.id,
            },
        }

        verdict_data = {
            "verdict": "escalate",
            "reasoning": "Governance API unreachable — defaulting to ESCALATE (safe mode)",
            "policy_results": [],
            "confidence": 0.5,
        }

        try:
            sentinel_resp = await client.post(
                f"{GOVERNANCE_API_URL}/api/v1/sentinel/evaluate",
                json=sentinel_payload,
                timeout=10.0,
            )
            if sentinel_resp.status_code == 200:
                verdict_data = sentinel_resp.json()
        except httpx.RequestError as e:
            logger.error(f"[SAP-ADAPTER] SENTINEL unreachable: {e}")

        # 4. Map verdict to SAP workflow format
        verdict_str = verdict_data.get("verdict", "escalate")
        workflow = verdict_to_sap_workflow(verdict_str, verdict_data.get("reasoning", ""))

        # 5. Extract policy violations for SAP response
        policy_violations = [
            r["policy_code"]
            for r in verdict_data.get("policy_results", [])
            if not r.get("passed", True)
        ]

        return SAPGovernanceVerdictResponse(
            event_id=event.id,
            sap_source=event.source,
            sap_event_type=event.type,
            agent_assigned=agent_id,
            verdict=verdict_str.upper(),
            confidence=verdict_data.get("confidence", 0.0),
            reasoning=verdict_data.get("reasoning", ""),
            policy_violations=policy_violations,
            audit_hash=None,  # Set if/when Decision Ledger is written
            governance_timestamp=timestamp,
            **workflow,
        )


@app.post(
    "/sap/governance/batch",
    response_model=list[SAPGovernanceVerdictResponse],
    tags=["governance"],
    summary="Batch evaluate multiple SAP events",
)
async def batch_evaluate_sap_events(batch: BatchSAPEventRequest) -> list[SAPGovernanceVerdictResponse]:
    """Process multiple SAP events in sequence."""
    results = []
    for event in batch.events:
        result = await evaluate_sap_event(event)
        results.append(result)
    return results


@app.get(
    "/sap/events/supported",
    tags=["metadata"],
    summary="List all supported SAP event types",
)
async def list_supported_events():
    """Returns the full list of SAP event types this adapter can handle."""
    return {
        "count": len(SAP_EVENT_MAP),
        "events": [
            {
                "type": event_type,
                "action_type": mapping["action_type"],
                "agent_role": mapping["agent_role"],
                "has_amount": mapping["amount_field"] is not None,
            }
            for event_type, mapping in SAP_EVENT_MAP.items()
        ],
    }


@app.post(
    "/sap/webhook/btp",
    tags=["webhooks"],
    summary="SAP BTP Webhook receiver (CloudEvents format)",
)
async def receive_btp_webhook(
    request: Request,
    ce_specversion: str | None = Header(None, alias="ce-specversion"),
    ce_type: str | None = Header(None, alias="ce-type"),
    ce_source: str | None = Header(None, alias="ce-source"),
    ce_id: str | None = Header(None, alias="ce-id"),
):
    """
    Receive SAP BTP events delivered via HTTP CloudEvents webhook (binary content mode).
    Extracts CloudEvent headers and routes to governance evaluation.
    """
    body = await request.json()

    event = SAPCloudEvent(
        specversion=ce_specversion or "1.0",
        id=ce_id or str(uuid.uuid4()),
        source=ce_source or "/sap/btp/unknown",
        type=ce_type or "com.sap.btp.workflow.v1.WorkflowInstance.Started.v1",
        data=body,
    )

    return await evaluate_sap_event(event)
