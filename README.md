# n8n-cli

A lightweight command-line wrapper for the n8n REST API. Zero external dependencies — uses native Node.js `fetch`.

## Installation

```bash
npm install -g .
```

## Configuration

Set via environment variables or `~/.n8n-cli.json`:

```json
{
  "url": "http://localhost:5678",
  "apiKey": "your-api-key"
}
```

Priority: env vars → `~/.n8n-cli.json` → defaults.

## Commands

```bash
# Workflows
n8n-cli list-workflows
n8n-cli get <id>
n8n-cli activate <id>
n8n-cli deactivate <id>

# Executions
n8n-cli executions [--status success|error]
n8n-cli execute <workflow-id>
n8n-cli stop <execution-id>

# Webhooks
n8n-cli trigger <path> [--method GET|POST] [--body '{}'] [--test]

# Misc
n8n-cli health
```

## Use Case

Designed to be called from shell scripts or AI agent bash tools (e.g. Alice) to trigger and manage n8n workflows programmatically.
