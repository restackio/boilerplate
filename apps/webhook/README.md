# Webhook server

FastAPI server that converts webhook events from external services into agent tasks.

## Quick start

```bash
# Development with hot reload
pnpm dev

# Production mode
pnpm start
```

## Features

- **Webhook to Task**: Converts webhook events into agent tasks
- **Smart Routing**: Routes webhooks to specific agents by URL path
- **Auto-Formatting**: Intelligently formats payloads into task descriptions
- **Multi-Service**: GitHub, Linear, Zendesk, Datadog, PagerDuty support

## API

### Create task from webhook
```
POST /webhook/workspace/{workspace_id}/agent/{agent_name}
```

**Parameters:**
- `workspace_id`: Target workspace UUID
- `agent_name`: Target agent slug name

**Body** (optional):
```json
{
  "title": "Custom title",
  "description": "Custom description"  
}
```

**Response:**
```json
{
  "status": "success",
  "task_id": "task-uuid",
  "task_url": "http://localhost:3000/tasks/{task_id}"
}
```

## Examples

### Github pull request
```bash
curl -X POST "http://localhost:8000/webhook/workspace/ws-123/agent/github-pr" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -d '{"action": "opened", "pull_request": {"title": "Add feature"}}'
```

### Linear issue  
```bash
curl -X POST "http://localhost:8000/webhook/workspace/ws-123/agent/linear-issues" \
  -H "Content-Type: application/json" \
  -d '{"type": "Issue", "data": {"title": "Bug: Login broken"}}'
```

## Supported services

Auto-detects and formats webhooks from:
- **GitHub**: Pull requests, pushes, issues
- **Linear**: Issues, projects  
- **Zendesk**: Tickets, updates
- **Datadog**: Alerts, monitoring
- **PagerDuty**: Incidents, alerts
- **Generic**: Any JSON webhook

## Development

```bash
# Install dependencies
uv sync

# Start development server
uv run dev

# Health check
curl http://localhost:8000/health
```

## Architecture

- **Lightweight**: Webhook ingestion only
- **Stateless**: Delegates to backend via Restack
- **Scalable**: Independent deployment and scaling
- **Reliable**: Graceful error handling

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE).
