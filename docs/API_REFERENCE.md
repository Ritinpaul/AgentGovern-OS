# API Reference

Auto-generated from FastAPI OpenAPI schema.

## `/`
- **GET**: Root
  - Tags: root
  - Responses: 200

## `/api/v1/agents/`
- **GET**: List Agents
  - Tags: genesis
  - Responses: 200, 422
- **POST**: Register Agent
  - Tags: genesis
  - Request body: yes
  - Responses: 201, 422

## `/api/v1/agents/import`
- **POST**: Bulk Import Agents
  - Tags: genesis
  - Request body: yes
  - Responses: 207, 422

## `/api/v1/agents/{agent_id}`
- **DELETE**: Retire Agent
  - Tags: genesis
  - Responses: 204, 422
- **GET**: Get Agent
  - Tags: genesis
  - Responses: 200, 422
- **PATCH**: Update Agent
  - Tags: genesis
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/agents/{agent_id}/dna`
- **GET**: Get Agent Dna
  - Tags: genesis
  - Responses: 200, 422

## `/api/v1/agents/{agent_id}/dna/diff/{other_agent_id}`
- **GET**: Diff Agent Dna
  - Tags: genesis
  - Responses: 200, 422

## `/api/v1/agents/{agent_id}/dna/mutate`
- **POST**: Mutate Agent Dna
  - Tags: genesis
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/agents/{agent_id}/lineage`
- **GET**: Get Agent Lineage
  - Tags: genesis
  - Responses: 200, 422

## `/api/v1/audit/`
- **GET**: List Decisions
  - Tags: audit
  - Responses: 200, 422

## `/api/v1/audit/chain/verify`
- **GET**: Verify Chain
  - Tags: audit
  - Responses: 200, 422

## `/api/v1/audit/{decision_id}`
- **GET**: Get Decision
  - Tags: audit
  - Responses: 200, 422

## `/api/v1/audit/{decision_id}/replay`
- **GET**: Replay Decision
  - Tags: audit
  - Responses: 200, 422

## `/api/v1/auth/me`
- **GET**: Whoami
  - Tags: auth
  - Responses: 200, 422

## `/api/v1/auth/roles`
- **GET**: List Roles
  - Tags: auth
  - Responses: 200

## `/api/v1/auth/token`
- **POST**: Issue Token
  - Tags: auth
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/cache/analytics`
- **GET**: Get Analytics
  - Tags: qicache
  - Responses: 200

## `/api/v1/cache/evict-expired`
- **POST**: Evict Expired
  - Tags: qicache
  - Responses: 200

## `/api/v1/cache/query`
- **POST**: Query Cache
  - Tags: qicache
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/cache/regenerate/{query_hash}`
- **POST**: Regenerate
  - Tags: qicache
  - Responses: 200, 422

## `/api/v1/cache/settings`
- **POST**: Update Cache Settings
  - Tags: qicache
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/cache/settings/{agent_id}`
- **GET**: Get Cache Settings
  - Tags: qicache
  - Responses: 200, 422

## `/api/v1/cache/store`
- **POST**: Store In Cache
  - Tags: qicache
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/cache/{query_hash}`
- **DELETE**: Invalidate Entry
  - Tags: qicache
  - Responses: 200, 422

## `/api/v1/contracts/`
- **GET**: List Contracts
  - Tags: contracts
  - Responses: 200, 422
- **POST**: Create Contract
  - Tags: contracts
  - Request body: yes
  - Responses: 201, 422

## `/api/v1/contracts/agent/{agent_id}`
- **GET**: Get Agent Active Contract
  - Tags: contracts
  - Responses: 200, 422

## `/api/v1/contracts/{contract_id}`
- **DELETE**: Terminate Contract
  - Tags: contracts
  - Responses: 204, 422
- **GET**: Get Contract
  - Tags: contracts
  - Responses: 200, 422
- **PATCH**: Update Contract
  - Tags: contracts
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/contracts/{contract_id}/sign`
- **POST**: Sign Contract
  - Tags: contracts
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/contracts/{contract_id}/violations`
- **GET**: Detect Violations
  - Tags: contracts
  - Responses: 200, 422

## `/api/v1/escalations/`
- **GET**: List Escalations
  - Tags: eclipse
  - Responses: 200, 422
- **POST**: Create Escalation
  - Tags: eclipse
  - Request body: yes
  - Responses: 201, 422

## `/api/v1/escalations/{case_id}`
- **GET**: Get Escalation
  - Tags: eclipse
  - Responses: 200, 422

## `/api/v1/escalations/{case_id}/resolve`
- **POST**: Resolve Escalation
  - Tags: eclipse
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/gateways/`
- **GET**: List Gateways
  - Tags: gateways
  - Responses: 200, 422

## `/api/v1/gdpr/export/{agent_id}`
- **GET**: Export Agent Data
  - Tags: gdpr
  - Responses: 200, 422

## `/api/v1/gdpr/forget/{agent_id}`
- **DELETE**: Forget Agent
  - Tags: gdpr
  - Responses: 200, 422

## `/api/v1/gdpr/report`
- **GET**: Gdpr Report
  - Tags: gdpr
  - Responses: 200, 422

## `/api/v1/policies/`
- **GET**: List Policies
  - Tags: sentinel
  - Responses: 200, 422
- **POST**: Create Policy
  - Tags: sentinel
  - Request body: yes
  - Responses: 201, 422

## `/api/v1/policies/publish`
- **POST**: Publish Policies
  - Tags: sentinel
  - Responses: 200

## `/api/v1/policies/{policy_id}`
- **DELETE**: Deactivate Policy
  - Tags: sentinel
  - Responses: 204, 422
- **PATCH**: Update Policy
  - Tags: sentinel
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/sentinel/evaluate`
- **POST**: Evaluate Action
  - Tags: sentinel
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/sentinel/health`
- **GET**: Sentinel Health
  - Tags: sentinel
  - Responses: 200

## `/api/v1/sentinel/simulate`
- **POST**: Simulate Action
  - Tags: sentinel
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/trust/event`
- **POST**: Record Trust Event
  - Tags: pulse
  - Request body: yes
  - Responses: 200, 422

## `/api/v1/trust/leaderboard`
- **GET**: Trust Leaderboard
  - Tags: pulse
  - Responses: 200, 422

## `/api/v1/trust/{agent_id}`
- **GET**: Get Trust Score
  - Tags: pulse
  - Responses: 200, 422

## `/api/v1/trust/{agent_id}/history`
- **GET**: Get Trust History
  - Tags: pulse
  - Responses: 200, 422

## `/api/v1/trust/{agent_id}/promotion-eligibility`
- **GET**: Get Promotion Eligibility
  - Tags: pulse
  - Responses: 200, 422

## `/api/v1/trust/{agent_id}/velocity`
- **GET**: Get Trust Velocity
  - Tags: pulse
  - Responses: 200, 422

## `/governance/evaluate`
- **POST**: Universal Governance Evaluation
  - Tags: Universal Governance
  - Request body: yes
  - Responses: 200, 422

## `/governance/health`
- **GET**: Governance API health check
  - Tags: Universal Governance, Universal Governance
  - Responses: 200

## `/governance/metrics`
- **GET**: Live governance metrics for the command dashboard
  - Tags: Universal Governance, Universal Governance
  - Responses: 200

## `/health`
- **GET**: Health Check
  - Tags: health
  - Responses: 200

## `/sentinel/policies/bundle`
- **GET**: Get Edge Policy Bundle
  - Tags: sentinel
  - Responses: 200
