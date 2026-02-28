# AgentGovern OS

**Enterprise-grade Digital Colleague Governance Platform**

> *"We didn't just use CrewAI. We governed it."*

## What Is This?

AgentGovern OS is a platform that brings governance, accountability, and trust to autonomous AI agents operating within enterprise systems. It treats AI agents as *Digital Colleagues* — with identity, DNA, social contracts, career paths, and trust scores that expand and contract based on proven performance.

## Architecture

- **Governance API** (FastAPI) — GENESIS, PULSE, SENTINEL, ANCESTOR, CONTRACT, ECLIPSE, QICACHE modules
- **CrewAI Engine** — 9 agents (5 Core + 4 Meta) with hierarchical orchestration
- **Local LLM** — Ollama (phi4-mini) with cloud fallbacks (OpenAI, Anthropic)
- **Data Layer** — PostgreSQL + TimescaleDB, ChromaDB, Redis

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env

# 2. Start all services
docker compose up -d

# 3. Wait for services to be healthy, then seed demo data
python scripts/seed_demo.py

# 4. Open API docs
# Governance API: http://localhost:8000/docs
# CrewAI Engine:  http://localhost:8001/docs
```

## Project Structure

```
├── docs/                         # Planning & reference documents
├── services/
│   ├── governance-api/           # FastAPI backend (GENESIS, PULSE, SENTINEL, QICACHE)
│   └── crewai-engine/            # 9-agent CrewAI orchestration engine
├── data/migrations/              # PostgreSQL schema (init.sql)
├── infra/                        # Prometheus config
├── scripts/                      # Seed data and utilities
├── docker-compose.yml            # Full development stack
├── pyproject.toml                # Python project config
└── Makefile                      # Common dev commands
```

## The 9 Agents

| # | Agent | Role | Runs |
|---|-------|------|------|
| 1 | Evidence Collector | Document forensics | Per dispute |
| 2 | Risk Evaluator | Credit & fraud risk | Per dispute |
| 3 | Negotiation Strategist | Settlement optimization | Per dispute |
| 4 | Dispute Resolver (Agent-7749) | Final decision maker | Per dispute |
| 5 | Governance Sentinel | Policy enforcement + Prophecy | Per dispute |
| 6 | Historian | Performance drift detection | Daily/Weekly |
| 7 | Gene Auditor | DNA integrity auditing | On spawn/retire |
| 8 | Red Teamer | Adversarial vulnerability testing | Every 6 hours |
| 9 | Compliance Synthesizer | Regulatory → executable rules | On regulation change |

## Key Innovations

- **QICACHE** — Token-saving response cache (68% LLM cost reduction)
- **Dynamic Trust Scoring** — Agents earn/lose autonomy based on performance
- **Decision DNA** — Genetic lineage tracking for agent behaviors
- **Prophecy Engine** — Pre-execution 3-path simulation
- **Social Contracts** — Formal employment agreements for AI agents
- **Red Team Agent** — Built-in adversarial testing


