# AgentGovern CLI

The open-source AI Agent Governance scanner — *"Black Duck for AI Agents"*.

AgentGovern natively scans your codebase, extracts your AI agent topology (the Agent Bill of Materials / ABOM), and checks it against enterprise and regulatory governance policies (e.g. EU AI Act).

## Installation

```bash
pip install agentgovern
# or via pipx (recommended)
pipx install agentgovern
```

## Quickstart

Initialize governance in a new AI project:

```bash
agentgovern init
```
*(This detects your frameworks and creates a starter `agentgovern.yaml` manifest)*

Scan your project:

```bash
agentgovern scan .
```

Scan and enforce strict enterprise policies (fails CI if violated):

```bash
agentgovern scan . --policy-bundle enterprise --fail-on high
```

## Features

1. **Manifest Parsing**: Reads `agentgovern.yaml` files defining agent tiers, authority limits (spend limits), and allowed actions.
2. **Dependency Scanning**: Detects AI frameworks (CrewAI, LangChain, AutoGen, etc.) in `requirements.txt`, `pyproject.toml`, and more.
3. **Codeprint Analysis**: Performs AST-based inspection of Python code to find hidden agent instantiations and hardcoded API keys.
4. **Policy Engine**: Checks your fleet against bundled policies (`default`, `enterprise`, `eu_ai_act`).
5. **ABOM Generation**: Emits a standard Agent Bill of Materials (JSON).
6. **SARIF Export**: Natively integrates with GitHub Code Scanning.

## Commands

- `agentgovern scan` - Scan the project.
- `agentgovern init` - Create a manifest.
- `agentgovern policy list` - See available rule bundles.
- `agentgovern policy check` - Run policy checks on the manifest (fast path).
- `agentgovern agents register` - Register your agents with the central Governance API.
- `agentgovern audit tail` - Stream the live audit ledger of all agent actions.

## CI/CD Integration

AgentGovern is designed for CI/CD pipelines.

```yaml
# .github/workflows/agentgovern.yml
name: Agent Governance Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pip install agentgovern
      - run: agentgovern scan . --format sarif --output abom.sarif
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: abom.sarif
```
