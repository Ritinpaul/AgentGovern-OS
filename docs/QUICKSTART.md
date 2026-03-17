# Quickstart

This guide gets AgentGovern OS demo-ready in under 10 minutes.

## Prerequisites

- Docker Desktop with Compose
- Python 3.11+
- Node.js 18+

## 1. Start core services

```bash
docker compose up -d
```

## 2. Verify health

```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## 3. Seed demo data

```bash
d:/webDev/more-projects/hackathons/SAP/.venv/Scripts/python.exe scripts/seed_demo.py
```

## 4. Run frontend dashboard

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## 5. Run judge sanity check

```bash
make judge-check
```

## Demo flow

Use the scripted scenario:

```bash
d:/webDev/more-projects/hackathons/SAP/.venv/Scripts/python.exe scripts/demo_flow.py --seed
```

This runs cross-service governance events and produces auditable verdict outputs.
