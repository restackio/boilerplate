# Backend service

Python backend using Restack AI workflow orchestration engine for agent management.

## Quick start

```bash
# Development with hot reload
pnpm dev

# Production mode  
pnpm start
```

## Features

- **Agent Orchestration**: Restack workflows for AI agent management
- **Task Management**: Multi-step workflow execution with full traceability  
- **MCP Integration**: Model Context Protocol for external tool integration
- **Real-time Streaming**: LLM response streaming with event handling
- **Database ORM**: SQLAlchemy models with async PostgreSQL
- **Developer UI**: Visual workflow debugging and replay at localhost:5233

## Architecture

```
src/
├── functions/          # Restack functions (business logic)
├── workflows/          # Multi-step orchestration workflows  
├── database/           # SQLAlchemy models and connections
├── agents/             # Agent execution logic
└── services.py         # Restack service registration
```

## Restack engine

The backend runs on the **Restack Engine** which provides:

- **Workflow Orchestration**: Reliable execution of multi-step agent tasks
- **Developer UI**: Visual debugging interface at http://localhost:5233
- **Function Registry**: Auto-discovery of Python functions as workflow steps
- **Replay & Debug**: Step-by-step workflow replay for troubleshooting

### Developer UI features
- **Runs**: Replay entire workflows or restart from any step
- **Functions**: Test individual functions with custom inputs
- **Schedules**: Manage workflow schedules and cron jobs
- **Timeline**: Visual execution flow with timing details

Access the Developer UI at: http://localhost:5233

## Development

### Local setup
```bash
# Install dependencies
uv sync

# Start development server (with file watching)
uv run dev

# Or start without file watching
uv run start
```

### Database
```bash
# Connect to database
pnpm postgres:connect

# Reset and seed database
pnpm postgres:setup
```

### Debugging workflows

Use the Developer UI at http://localhost:5233 to:

1. **Test Functions**: Execute individual functions with custom inputs
2. **Replay Workflows**: Debug failed runs step-by-step
3. **View Schedules**: See upcoming and recent scheduled runs
4. **Trace Execution**: Follow parent-child workflow relationships

## Deployment

Deploy on [Restack Cloud](https://console.restack.io) with:
- **Dockerfile**: `apps/backend/Dockerfile`
- **App folder**: `apps/backend`

Or use the local Docker setup:
```bash
# Run Restack engine locally
docker run -d --pull always --name restack \
  -p 5233:5233 -p 6233:6233 -p 7233:7233 \
  ghcr.io/restackio/restack:main
```

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE).
