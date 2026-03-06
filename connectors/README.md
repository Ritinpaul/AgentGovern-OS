# AgentGovern OS — Connector Usage Examples

This directory contains end-to-end usage examples for each connector.

## Quick Start: Any Agent in 2 Lines

### CrewAI Agent
```python
from crewai import Agent, Crew, Task
from connectors.crewai import govern_crew

# Your existing crew
crew = Crew(
    agents=[finance_analyst, risk_manager],
    tasks=[analyze_task, approve_task],
)

# Wrap it with governance (one line)
governed = govern_crew(
    crew,
    agent_codes={"finance_analyst": "FI-ANALYST-001", "risk_manager": "RISK-MGR-001"},
    calling_system="SAP_S4HANA",
)
result = governed.kickoff()
# → Automatically pre-authorizes each agent through AgentGovern OS
```

### LangChain Agent
```python
from langchain.agents import AgentExecutor
from connectors.langchain import GovernedAgentExecutor

executor = AgentExecutor(agent=my_agent, tools=my_tools)
governed = GovernedAgentExecutor(executor, agent_code="SUPPORT-BOT-001")
result = governed.invoke({"input": "Issue refund of $500 to customer #4821"})
# If amount exceeds authority → {"output": "[BLOCKED by AgentGovern] ..."}
```

### Anthropic Claude
```python
import anthropic
from connectors.anthropic import GovernedAnthropicClient

raw_client = anthropic.Anthropic()
client = GovernedAnthropicClient(raw_client, agent_code="LEGAL-REVIEW-001")

# Identical API to the real anthropic client:
message = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Analyze this contract for risks..."}]
)
```

### OpenAI Agents SDK
```python
import asyncio
from agents import Agent
from connectors.openai import GovernedRunner

agent = Agent(name="Triage Agent", instructions="Route customer queries.")
gov_runner = GovernedRunner(agent_code="SUPPORT-001", calling_system="Zendesk")

result = asyncio.run(gov_runner.run(agent, "Customer wants a $5000 refund"))
# → BLOCKED if agent's authority_limit < 5000
```

### AutoGen (Microsoft)
```python
import autogen
from connectors.autogen import GovernedAssistantAgent

raw_assistant = autogen.AssistantAgent(
    name="coder",
    llm_config={"model": "gpt-4o"},
)
governed = GovernedAssistantAgent(raw_assistant, agent_code="DEV-BOT-001")

proxy = autogen.UserProxyAgent("user", human_input_mode="NEVER")
proxy.initiate_chat(governed, message="Write code to delete all user records")
# → governed.generate_reply() is intercepted, action BLOCKED (delete_records denied)
```

### Custom / Any Agent — The Universal Decorator
```python
from connectors.generic import governed_action

@governed_action(
    agent_code="FI-ANALYST-001",
    action="approve_payment",
    context_from_kwargs=["amount", "currency"],
)
def approve_payment(amount: float, currency: str, vendor: str) -> dict:
    # This code only runs if AgentGovern APPROVES
    return {"status": "success", "amount": amount, "vendor": vendor}

# Usage:
result = approve_payment(amount=45000.0, currency="USD", vendor="ACME Corp")
# → If authority_limit < 45000, raises PermissionError("[AgentGovern] blocked...")
```

### Webhook/HTTP Middleware
```python
from connectors.generic import WebhookMiddleware
from fastapi import FastAPI

app = FastAPI()
middleware = WebhookMiddleware(agent_code="SAP-AGENT-001", calling_system="SAP_BTP")

@app.post("/agent/execute")
async def execute_agent_action(event: dict):
    result = middleware.handle(event)  # {"action": "approve_po", "context": {"amount": 10000}}
    if not result["approved"]:
        return {"error": result["reason"]}, 403
    # Proceed with the actual action...
    return {"status": "executed", "audit_id": result["audit_id"]}
```

## Environment Variables

Set these wherever your agent runs:

```bash
AGENTGOVERN_SERVER=http://your-governance-server.com
AGENTGOVERN_API_KEY=agk_live_xxxxxxxxxxxx
AGENTGOVERN_FAIL_OPEN=false   # "false" = block if server unreachable (strict mode)
```

## What Happens When the Server is Unreachable?

| `AGENTGOVERN_FAIL_OPEN` | Behavior |
|---|---|
| `true` (default) | Action is **allowed** with a warning. Agent proceeds normally. |
| `false` | Action is **blocked**. Raises `PermissionError`. Safe for production. |
