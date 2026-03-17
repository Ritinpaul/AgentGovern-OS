# Connector Integration Guide

AgentGovern connectors wrap existing agent runtimes without replacing business logic.

## Supported connectors

- CrewAI: `connectors/crewai/governed_crew.py`
- LangChain: `connectors/langchain/governed_executor.py`
- OpenAI Agents: `connectors/openai/governed_runner.py`
- Anthropic: `connectors/anthropic/governed_client.py`
- AutoGen: `connectors/autogen/governed_agent.py`
- Generic HTTP: `connectors/generic/gateway.py`

## Common integration pattern

1. Initialize GovCore with governance API URL.
2. Wrap action execution with governed evaluator.
3. Pass action envelope (agent id, action type, amount, context).
4. Enforce verdicts: `approve`, `block`, `escalate`.

## CrewAI example

```python
from connectors.crewai.governed_crew import GovernedCrew

crew = GovernedCrew(
    governance_api_url="http://localhost:8000",
    agent_id="<agent-uuid>",
)

result = crew.run_action(
    action_type="approve_purchase",
    amount=25000,
    context={"source": "sap"},
)
```

## OpenAI Agents SDK example

```python
from connectors.openai.governed_runner import GovernedRunner

runner = GovernedRunner(
    governance_api_url="http://localhost:8000",
    agent_id="<agent-uuid>",
)

runner.run(action_type="access_pii", amount=0, context={"ticket": "INC-100"})
```

## Validation checklist

- Connector sends policy evaluation before side effects.
- Connector propagates escalation metadata to caller.
- Connector logs decision IDs for audit replay.
