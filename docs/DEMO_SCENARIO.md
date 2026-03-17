# Demo Scenario Script

Use this runbook for hackathon judge demos.

## Goal

Show end-to-end governance across API, adapters, audit ledger, and dashboard.

## Steps (3-5 minutes)

1. Start stack:

```bash
docker compose up -d
```

2. Seed records:

```bash
d:/webDev/more-projects/hackathons/SAP/.venv/Scripts/python.exe scripts/seed_demo.py
```

3. Trigger live flow:

```bash
d:/webDev/more-projects/hackathons/SAP/.venv/Scripts/python.exe scripts/demo_flow.py --seed
```

4. Show evidence in UI:

- Fleet page updates trust and tier state
- Policy page shows active governance rules
- Audit Ledger shows immutable chain verification
- QICACHE page shows token/cost savings

5. Show API-level observability:

- `GET /health`
- `GET /metrics`
- `GET /api/v1/audit/chain/verify`

## Judge talking points

- Policy-first execution with pre-action checks.
- Human-in-the-loop escalation for risky actions.
- Immutable audit replay for compliance.
- Framework-agnostic connector architecture.
