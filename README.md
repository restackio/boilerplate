# Boilerplate

A sample repository to build an agent orchestration platform with tasks, agents, and a low code editor with React Flow.

See the full documentation on our [Boilerplate](https://docs.restack.io/boilerplate/introduction) page.

### Apps

- `frontend`: a [Next.js](https://nextjs.org/) app
- `backend`: a [Restack](https://restack.io/) app (TypeScript)
- `backend_py`: a [Restack](https://restack.io/) app (Python)

## Requirements

- **Node 20+**
- **Python 3.10+**
- **pnpm** (recommended)
- **Docker & Docker Compose**

## Quick Start

### 1. Start Infrastructure
```bash
# Start PostgreSQL and Restack
pnpm run infra:start
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set up Environment
```bash
# Copy environment file
cp env.development.example .env

# Update the values in .env with your actual API keys
```

### 4. Seed Database
```bash
pnpm run db:seed
```

### 5. Start Development
```bash
# Start all applications
pnpm run dev
```

This will start:
- Frontend: http://localhost:3000
- TypeScript Backend: http://localhost:8000
- Python Backend: http://localhost:8001

## Development Commands

```bash
# Infrastructure management
pnpm run infra:start    # Start PostgreSQL and Restack
pnpm run infra:stop     # Stop infrastructure
pnpm run infra:restart  # Restart infrastructure
pnpm run infra:logs     # View infrastructure logs
pnpm run infra:reset    # Reset database and restart

# Database management
pnpm run db:connect     # Connect to PostgreSQL
pnpm run db:reset       # Reset database schema
pnpm run db:seed        # Add seed data to database
pnpm run db:clean       # Remove all data but keep schema

# Application development
pnpm run dev            # Start all applications
pnpm run build          # Build all applications
pnpm run lint           # Lint all applications
```

## Database Schema

The platform includes a PostgreSQL database with the following tables:

- **workspaces**: Organization workspaces
- **users**: Users within workspaces
- **agents**: AI agents with configurations
- **agent_runs**: Execution history of agents
- **tasks**: Tasks assigned to agents
- **feedbacks**: User feedback on agent responses
- **rules**: Rules for agent behavior
- **experiments**: A/B testing experiments

## Python Backend Features

The Python backend provides CRUD operations through Restack functions:

### Agent Operations
- `agents_read()` - List all agents
- `agents_create(agent_data)` - Create new agent
- `agents_update(agent_id, updates)` - Update agent
- `agents_delete(agent_id)` - Delete agent
- `agents_get_by_id(agent_id)` - Get specific agent
- `agents_get_by_status(status)` - Get agents by status

### Task Operations
- `tasks_read()` - List all tasks
- `tasks_create(task_data)` - Create new task
- `tasks_update(task_id, updates)` - Update task
- `tasks_delete(task_id)` - Delete task
- `tasks_get_by_id(task_id)` - Get specific task
- `tasks_get_by_status(status)` - Get tasks by status

## Run agents

### From frontend

![Run agents from frontend](./agent-reactflow.png)

### from UI

You can run agents from the UI by clicking the "Run" button.

![Run agents from UI](./agent-post.png)

### from API

You can run agents from the API by using the generated endpoint:

`POST http://localhost:6233/api/agents/agentFlow`

### from any client

You can run agents with any client connected to Restack, for example:

```bash
pnpm schedule-agent
```

executes `scheduleAgent.ts` which will connect to Restack and execute the `agentFlow` agent.

## Send events to the Agent

### from Backend Developer UI

You can send events like or end from the UI.

![Send events from UI](./agent-event.png)

And see the events in the run:

![See events in UI](./agent-run.png)

### from API

You can send events to the agent by using the following endpoint:

`PUT http://localhost:6233/api/agents/agentFlow/:agentId/:runId`

with the payload:

```json
{
  "name": "idVerification",
  "input": {
    "type": "id",
    "documentNumber": "1234567890"
  }
}
```

to send messages to the agent.

or

```json
{
  "eventName": "end"
}
```

to end the conversation with the agent.

### from any client

You can send event to the agent with any client connected to Restack, for example:

Modify agentId and runId in eventAgent.ts and then run:

```bash
pnpm event-agent
```

It will connect to Restack and send an events to the agent.

## Deploy on Cloud

### Deploy frontend on Vercel

Choose root directory as the project root.

Root directory

```
agent-reactflow/apps/frontend
```

Build command

```bash
turbo run build --filter=@agent-reactflow/frontend
```

### Deploy backend on Restack Cloud

To deploy the application on Restack, you can create an account at [https://console.restack.io](https://console.restack.io)

Custom Dockerfile path

```
/agent-reactflow/Dockerfile
```

Application folder

```
/agent-reactflow
```
