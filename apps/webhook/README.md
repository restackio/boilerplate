# Webhook Server

A dedicated FastAPI webhook server that receives webhook events from external services and creates tasks for specific agents in workspaces.

## Features

- **Webhook to Task Creation**: Converts webhook events into tasks
- **Agent-Specific Routing**: Routes webhooks to specific agents based on URL path
- **Workspace Isolation**: Tasks are created within specific workspaces
- **Auto-Formatted Tasks**: Intelligently formats webhook payloads into meaningful task descriptions
- **Support for Multiple Services**: GitHub, Linear, Zendesk, Datadog, PagerDuty, and more

## Quick Start

### Development

```bash
# Install dependencies
uv sync

# Start development server with auto-reload (uses uvicorn --reload)
pnpm dev
# or
uv run dev
```

The development server uses uvicorn's built-in `--reload` feature which automatically restarts the server when Python files change.

### Production

```bash
# Start production server
pnpm start
# or
uv run start
```

## API Endpoints

### Health Check
```
GET /health
```

### Create Task from Webhook
```
POST /webhook/workspace/{workspace_id}/agent/{agent_name}
```

**URL Parameters:**
- `workspace_id`: The workspace UUID where the task should be created
- `agent_name`: The slug name of the agent that should handle the task

**Request Body:**
```json
{
  "title": "Optional custom title",
  "description": "Optional custom description"
}
```

If title/description are not provided, they will be auto-generated from the webhook payload.

**Response:**
```json
{
  "status": "success",
  "message": "Task created for agent {agent_name} in workspace {workspace_id}",
  "task_id": "task-uuid",
  "task_url": "http://localhost:3000/tasks/{task_id}"
}
```

## Examples

### GitHub Webhook
```bash
curl -X POST "http://localhost:8000/webhook/workspace/ws-123/agent/github-pr" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -d '{
    "action": "opened",
    "number": 123,
    "pull_request": {
      "title": "Add new feature"
    }
  }'
```

### Linear Webhook
```bash
curl -X POST "http://localhost:8000/webhook/workspace/ws-123/agent/linear-issues" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Issue",
    "data": {
      "title": "Bug: Login not working"
    }
  }'
```

## Supported Webhook Sources

The server automatically detects and formats webhooks from:
- **GitHub**: Pull requests, pushes, issues
- **Linear**: Issues, projects
- **Zendesk**: Tickets, updates
- **Datadog**: Alerts, monitoring events
- **PagerDuty**: Incidents, alerts
- **Generic**: Any JSON webhook

## Configuration

The server runs on port 8000 by default and connects to the same Restack services as the main backend.

## Architecture

This webhook server is designed to be:
- **Lightweight**: Only handles webhook ingestion and task creation
- **Stateless**: No data persistence, delegates to main backend via Restack workflows
- **Scalable**: Can be deployed independently and scaled separately from main backend
- **Reliable**: Graceful error handling and proper HTTP status codes
