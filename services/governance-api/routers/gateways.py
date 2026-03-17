"""Gateways Router — Live adapter/edge gateway health for dashboard pages."""

from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends

from config import get_settings
from middleware.auth import require_roles, ROLE_ADMIN, ROLE_OPERATOR, ROLE_AUDITOR

router = APIRouter(
    prefix="/api/v1/gateways",
    tags=["gateways"],
    dependencies=[Depends(require_roles(ROLE_ADMIN, ROLE_OPERATOR, ROLE_AUDITOR))],
)


def _status_from_http(code: int | None) -> str:
    if code is None:
        return "offline"
    if 200 <= code < 300:
        return "online"
    if 300 <= code < 500:
        return "degraded"
    return "offline"


async def _probe_service(client: httpx.AsyncClient, service: dict[str, str]) -> dict[str, Any]:
    started = time.perf_counter()
    http_code: int | None = None
    payload: dict[str, Any] = {}

    try:
        response = await client.get(service["status_url"], timeout=2.5)
        http_code = response.status_code
        if response.headers.get("content-type", "").startswith("application/json"):
            payload = response.json()
    except Exception:
        # Keep defaults for offline handling.
        pass

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    status = _status_from_http(http_code)

    return {
        "id": service["id"],
        "name": service["name"],
        "location": service["location"],
        "status": status,
        "status_url": service["status_url"],
        "latency_ms": latency_ms,
        "mode": payload.get("mode", "unknown"),
        "environment": payload.get("environment", "unknown"),
        "version": payload.get("version", "unknown"),
        "http_code": http_code,
        "raw": payload,
    }


@router.get("/")
async def list_gateways() -> dict[str, Any]:
    """Return live status for fleet gateway services consumed by the dashboard."""
    settings = get_settings()

    services = [
        {
            "id": "edge-gateway",
            "name": "Edge Gateway",
            "location": "Global Edge",
            "status_url": "http://localhost:8001/status",
        },
        {
            "id": "sap-btp-adapter",
            "name": "SAP BTP Adapter",
            "location": "SAP BTP",
            "status_url": "http://localhost:8002/health",
        },
        {
            "id": "ms-copilot-adapter",
            "name": "MS Copilot Adapter",
            "location": "Azure / M365",
            "status_url": "http://localhost:8003/health",
        },
        {
            "id": "sf-agentforce-adapter",
            "name": "Salesforce Agentforce Adapter",
            "location": "Salesforce Cloud",
            "status_url": "http://localhost:8004/health",
        },
        {
            "id": "servicenow-adapter",
            "name": "ServiceNow Adapter",
            "location": "ServiceNow Cloud",
            "status_url": "http://localhost:8005/health",
        },
    ]

    async with httpx.AsyncClient() as client:
        records = [await _probe_service(client, svc) for svc in services]

    online = sum(1 for item in records if item["status"] == "online")
    degraded = sum(1 for item in records if item["status"] == "degraded")
    offline = sum(1 for item in records if item["status"] == "offline")

    return {
        "gateway_id": getattr(settings, "app_name", "AgentGovern OS"),
        "total": len(records),
        "online": online,
        "degraded": degraded,
        "offline": offline,
        "gateways": records,
    }
