# Boilerplate

A sample repository to build an agent orchestration platform with tasks, agents, and a low code editor with React Flow.

See the full documentation on our [Boilerplate](https://docs.restack.io/boilerplate/introduction) page.

## 🚀 Quick Start with Docker

The easiest way to get started is using Docker Compose, which will build and run all services automatically.

### Prerequisites

- **Docker & Docker Compose**
- **Git**

### 1. Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd boilerplate

# Build and start all services
pnpm docker:reset
```

This will start:
- **Frontend**: http://localhost:3000
- **Webhook Server**: http://localhost:8000
- **PostgreSQL**: localhost:5432
- **Restack Engine**: localhost:5233

The backend and MCP server run internally and communicate through the Docker network.

### 2. Set up Environment (Optional)

For advanced features, copy and configure environment variables:

```bash
# Copy environment file
cp env.development.example .env

# Update the values in .env with your actual API keys
```

### 3. Access the Application

Open your browser and navigate to http://localhost:3000 to start using the platform.

## 🐳 Docker Commands

```bash
# Build all services
pnpm docker:build

# Start all services
pnpm docker:up

# Stop all services  
pnpm docker:down

# View logs
pnpm docker:logs

# Restart services
pnpm docker:restart

# Reset everything (rebuild and restart)
pnpm docker:reset

# Check service status
pnpm docker:ps
```

## 📋 Services Overview

### Apps

- **frontend**: Next.js application with React Flow editor
- **backend**: Python backend with Restack AI workflows  
- **mcp_server**: Model Context Protocol server
- **webhook**: Webhook handling service

### Infrastructure

- **PostgreSQL**: Database for storing agents, tasks, and workflows
- **Restack Engine**: AI workflow orchestration engine

## 🗄️ Database Schema

The platform includes a PostgreSQL database with the following tables:

- **workspaces**: Organization workspaces
- **users**: Users within workspaces  
- **agents**: AI agents with configurations
- **agent_runs**: Execution history of agents
- **tasks**: Tasks assigned to agents
- **feedbacks**: User feedback on agent responses
- **rules**: Rules for agent behavior
- **experiments**: A/B testing experiments

## 🤖 Running Agents

### From the UI

You can run agents from the web interface by clicking the "Run" button in the agent management section.

### From API

Execute agents using the REST API:

```bash
POST http://localhost:8000/api/agents/agentFlow
```

### Send Events to Agents

Send events to running agents:

```bash
PUT http://localhost:8000/api/agents/agentFlow/:agentId/:runId
```

With payload:
```json
{
  "name": "idVerification", 
  "input": {
    "type": "id",
    "documentNumber": "1234567890"
  }
}
```

## 🌐 Deploy on Cloud

### Deploy Frontend on Vercel

1. Connect your repository to Vercel
2. Set root directory: `apps/frontend`
3. Build command: `turbo run build --filter=boilerplate-frontend`

### Deploy Backend on Restack Cloud

1. Create account at [https://console.restack.io](https://console.restack.io)
2. Use custom Dockerfile path: `apps/backend/Dockerfile`
3. Set application folder: `apps/backend`

## 🛠️ Development

For development setup, local development commands, and contributing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📚 Documentation

- [Full Documentation](https://docs.restack.io/boilerplate/introduction)
- [Restack AI](https://restack.io/)
- [React Flow](https://reactflow.dev/)

## 📄 License

This project is licensed under the MIT License.