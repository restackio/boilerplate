# Contributing to restack boilerplate

Welcome to the developer documentation. This guide covers the technical architecture, development setup with hot reloading, and contribution workflows.

## Contribution scope

This repository focuses on the **orchestration platform** itself. This repository welcomes contributions for improvements to:

- Core platform functionality (agents, tasks, workflows)
- Development experience and tooling
- Documentation and examples
- Performance and reliability improvements
- Bug fixes and security enhancements

**What this repository does not accept:**

- Specific MCP server integrations (create your own repository)
- Production seed data (existing data serves as examples only)
- Domain-specific business logic

For integrations and custom tools, please create separate repositories and reference this boilerplate as your foundation.

## Technical architecture

### Monorepo structure

This Turborepo monorepo has the following architecture:

```
boilerplate/
├── apps/                        # Application services
│   ├── frontend/               # Next.js 15 frontend
│   ├── backend/                # Python + Restack AI workflows
│   ├── mcp_server/             # Example MCP server (reference only)
│   └── webhook/                # Webhook handling service
├── packages/                    # Shared packages
│   ├── ui/                     # Shared React components
│   ├── database/               # Database schema, migrations, example seeds
│   ├── eslint-config/          # Shared ESLint configurations
│   └── typescript-config/      # Shared TypeScript configurations
└── docker-compose.dev.yml      # Development infrastructure
```

### System architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                            │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js App Router  │  shadcn/ui  │  Tailwind CSS   │
│                      │  Components │                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                              HTTP/WebSocket
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                        Orchestration Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│           Restack Engine          │       Python Backend            │
│         (Workflow Engine)         │    (FastAPI + Functions)        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          MCP Protocol/HTTP
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                         Integration Layer                           │
├─────────────────────────────────────────────────────────────────────┤
│    MCP Server     │    External APIs    │    LLM Providers          │
│   (Tool Registry) │   (REST/GraphQL)    │  (OpenAI, Anthropic)      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                Database
                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                           Data Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│      PostgreSQL                  │         ClickHouse               │
│  (Agents, Tasks, Users)          │   (Metrics, Analytics, Logs)     │
└─────────────────────────────────────────────────────────────────────┘
```

## Developer setup (hot reloading)

### Prerequisites

- **[Node.js 20+](https://nodejs.org/)**
- **[Python 3.12+](https://www.python.org/downloads/)**
- **[pnpm](https://pnpm.io/installation)** (package manager)
- **[Docker & Docker Compose](https://docs.docker.com/get-docker/)**
- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** (Python package manager)
- **[ngrok](https://ngrok.com/download)** (for MCP external access)

### Development environment setup

```bash
# Clone and setup
git clone <repository-url>
cd boilerplate

# Setup environment
cp env.development.example .env
# Edit .env with your API keys

# First time setup (installs deps, starts infra, runs migrations)
pnpm localsetup
```

**Or do it step-by-step:**

```bash
# Install dependencies
pnpm install

# Start PostgreSQL, ClickHouse, and Restack Engine in Docker
pnpm infra:start

# Run database migrations
pnpm db:migrate

# Optionally seed admin workspace (admin user, build agent, templates)
pnpm db:admin:insert
```

### Development with hot reloading

**Option A: quick start (recommended for daily use)**

```bash
# Starts infrastructure + all apps with hot reloading
pnpm localdev
```

**Option B: manual start (if infra already running)**

```bash
# Starts all apps with hot reloading
pnpm dev
```

**Option C: start individual services (for debugging)**

```bash
# Make sure infrastructure is running first
pnpm infra:start

# Terminal 1: Frontend (Next.js with hot reload)
cd apps/frontend
pnpm dev

# Terminal 2: Backend (Python with auto-reload)
cd apps/backend
pnpm dev

# Terminal 3: MCP Server (Python with auto-reload)
cd apps/mcp_server
pnpm dev

# Terminal 4: Webhook Server (Python with auto-reload)
cd apps/webhook
pnpm dev
```

### Development URLs

- **Frontend**: http://localhost:3000 (Next.js with HMR)
- **Backend**: Runs locally (Restack AI workflows with auto-reload)
- **MCP Server**: Runs locally (Python with auto-reload)
- **Webhook Server**: http://localhost:8000 (FastAPI with auto-reload)
- **Restack Engine**: http://localhost:5233 (Restack Developer Tracing)
- **PostgreSQL**: localhost:5432
- **ClickHouse**: http://localhost:8123 (metrics and analytics)

### External access setup (optional)

For OpenAI to access your local MCP server:

```bash
# Expose MCP server publicly
ngrok http 8001

# Add to .env
RESTACK_ENGINE_MCP_ADDRESS=https://your-ngrok-url.ngrok-free.app
```

## Key development commands

```bash
# Quick commands
pnpm localsetup         # First time setup (install, infra, migrations)
pnpm localdev           # Start infrastructure + all dev servers

# Development environment
pnpm dev                # Start all applications with hot reloading (infra must be running)
pnpm infra:start        # Start infrastructure (PostgreSQL, ClickHouse, Restack)
pnpm infra:stop         # Stop infrastructure
pnpm infra:restart      # Restart infrastructure
pnpm infra:reset        # Reset infrastructure (⚠️ destroys data)

# Database operations
pnpm db:migrate         # Run database migrations
pnpm db:admin:insert    # Seed admin workspace (admin user, build agent, templates)
pnpm postgres:connect   # Connect to PostgreSQL
pnpm clickhouse:connect # Connect to ClickHouse

# Note: Database scripts use localhost defaults for local development.
# Set DATABASE_URL and CLICKHOUSE_URL env vars to override.

# Code quality
pnpm lint               # Lint all applications
pnpm type-check         # Run TypeScript type checking
```

For the complete list of available commands, check the `package.json` files in the root and individual app directories.

## Technical deep dive

### Frontend architecture (apps/frontend)

**Tech stack**: next.js 15 + App Router + Tailwind + shadcn/ui

```
apps/frontend/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Dashboard routes (protected)
│   │   ├── agents/              # Agent management pages
│   │   ├── tasks/               # Task management pages
│   │   ├── integrations/        # Integration management
│   │   └── layout.tsx           # Dashboard layout
│   ├── actions/                 # Server actions (form handlers)
│   ├── api/                     # API routes (minimal, prefer actions)
│   └── page.tsx                 # Landing page
├── components/                   # React components
│   ├── shared/                  # Reusable components
│   └── providers/               # Context providers
├── hooks/                       # Custom React hooks
└── lib/                         # Utilities and configurations
```

**Key Patterns**:

- Server Components for data fetching
- Server Actions for mutations (avoid API routes when possible)
- Context for workspace scoping
- Custom hooks for complex state management

### Backend architecture (apps/backend)

**Tech stack**: python + FastAPI + Restack AI + PostgreSQL

```
apps/backend/src/
├── functions/                   # Restack functions (business logic)
│   ├── agents_crud.py          # Agent CRUD operations
│   ├── tasks_crud.py           # Task CRUD operations
│   ├── llm_response_stream.py  # LLM streaming responses
│   └── ...                     # Other business functions
├── workflows/                   # Restack workflows (orchestration)
│   └── crud/                   # CRUD workflow definitions
├── database/                    # Database layer
│   ├── models.py               # SQLAlchemy models
│   ├── connection.py           # Database connection
│   └── migrations/             # Database migrations
├── agents/                     # Agent execution logic
└── services.py                 # FastAPI app + Restack service registration
```

**Key Patterns**:

- Functions handle single responsibilities (CRUD operations)
- Workflows orchestrate complex multi-step operations
- Database models use SQLAlchemy ORM
- Async/await throughout for performance
- Type hints for better developer experience

### Model context protocol server architecture

**Purpose**: example MCP server implementation (reference only)

> **Note**: The included MCP server is for development. For production use, create your own MCP server in a separate repository tailored to your specific integrations and tools.

```
apps/mcp_server/src/
├── functions/                   # Example tool implementations
│   ├── generate_random_data.py # Example: Random data generation
│   └── llm_response.py         # Example: LLM response handling
├── schemas/                     # Pydantic schemas for validation
└── services.py                 # MCP protocol implementation
```

**Key Patterns**:

- Each function becomes a tool available for workflows
- Auto-discovery of functions through introspection
- Pydantic schemas for input/output validation
- Async functions for external API calls

## Development patterns

### Adding new backend functions

1. **Create Function** (`apps/backend/src/functions/my_function.py`):

```python
from restack_ai import function

@function.defn(name="my_function")
async def my_function(data: dict) -> dict:
    """Function description for UI"""
    # Implementation
    return {"result": "success"}
```

2. **Register in Services** (`apps/backend/src/services.py`):

```python
from .functions.my_function import my_function

# Add to services list
services = [my_function, ...]
```

3. **Create Workflow** (if needed):

```python
from restack_ai import workflow

@workflow.defn(name="my_workflow")
class MyWorkflow:
    @workflow.run
    async def run(self, input: dict) -> dict:
        result = await workflow.step(my_function, input)
        return result
```

### Adding model context protocol tools (reference only)

> **Important**: This section serves as reference only. The boilerplate's MCP server provides an example implementation. For your own integrations, create a separate MCP server repository.

**For your own MCP server implementation:**

1. **Create Tool Function** (`your-mcp-server/src/functions/my_tool.py`):

```python
async def my_tool(param1: str, param2: int = 10) -> dict:
    """Tool description for workflows"""
    # External API call or business logic
    return {"data": "result"}
```

2. **Auto-Discovery**: MCP servers automatically discover functions and expose them as tools.

### Adding frontend components

**First, decide where the component belongs:**

**📱 Frontend App (`apps/frontend/components/`)** - for:

- Domain-specific business logic (AgentConfigurationForm)
- Next.js-dependent components (useRouter, Link, server actions)
- App-specific layouts and navigation
- Authentication and authorization components
- Page-specific components

**📦 Shared UI Package (`packages/ui/src/components/`)** - for:

- Pure UI primitives (Button, Input, Card)
- Framework-agnostic components
- Reusable AI interface patterns (ChatInput, ToolsList)
- Generic data display components
- Design system components

**Example - Frontend Component:**

```tsx
"use client";
import { executeWorkflow } from "@/app/actions/workflow";
import { Button } from "@workspace/ui/components/ui/button";

interface AgentFormProps {
  onAgentCreated: () => void;
}

export function AgentForm({ onAgentCreated }: AgentFormProps) {
  const handleSubmit = async () => {
    await executeWorkflow("CreateAgent", data);
    onAgentCreated();
  };
  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Example - Shared UI Component:**

```tsx
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  return <div>...</div>; // No Next.js or app-specific dependencies
}
```

### Database schema changes

**PostgreSQL**:

1. **Create Migration** (`packages/database/migrations/postgres/00X_description.sql`)
2. **Update Models** (if needed, `apps/backend/src/database/models.py`)
3. **Update Admin Seed** (optional, `packages/database/admin/postgres-admin.sql`) - only if admin workspace schema changes

**ClickHouse**:

1. **Create Migration** (`packages/database/migrations/clickhouse/00X_description.sql`)

**Test Changes**:

```bash
# Test migrations locally
pnpm infra:reset      # Reset infrastructure
pnpm db:migrate       # Run migrations
pnpm db:admin:insert  # Seed admin workspace (optional)

# Or connect directly to databases
pnpm postgres:connect
pnpm clickhouse:connect
```

**Migration Guidelines**:

- Name migrations with sequential numbers: `002_add_user_roles.sql`
- Never change existing migrations - create new ones
- Migrations run automatically on backend startup in production
- For local development, run manually with `pnpm db:migrate`

> **Note**: Demo data serves development and testing purposes only. Do not add production-specific data to the boilerplate.

## Git workflow and contribution

### Branch strategy

```bash
# Create feature branch
git checkout -b feature/new-feature
git checkout -b fix/database-connection
git checkout -b docs/api-documentation

# Keep updated with main
git fetch origin
git rebase origin/main
```

### Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new agent functionality
fix: resolve PostgreSQL connection pool exhaustion
docs: update MCP integration guide
refactor: simplify workflow orchestration logic
perf: optimize database queries for large datasets
```

### Pull request process

1. **Pre-PR Checklist**:

```bash
pnpm lint           # Fix all linting issues
pnpm type-check     # Fix all type errors
pnpm build          # Ensure clean build
```

2. **PR Template**:

```markdown
## Summary

Brief description of changes

## Technical Details

- List specific changes made
- Include any database schema updates
- Note frontend modifications

## Testing

- [ ] Manual testing completed
- [ ] Code quality checks pass

## Breaking Changes

List any breaking changes
```

3. **Review Process**:

- Code review required
- All CI checks must pass
- Documentation updated

### Code standards

**TypeScript/React**:

```typescript
// Good: Explicit types, descriptive names
interface AgentProps {
  agentId: string
  name: string
  onUpdate: (data: AgentData) => void
}

// Good: Server Component pattern
async function AgentList({ workspaceId }: { workspaceId: string }) {
  const agents = await getAgents(workspaceId)
  return <AgentSelector agents={agents} />
}
```

**Python/Backend**:

```python
# Good: Type hints, async/await, descriptive names
@function.defn(name="agent_create")
async def agent_create(
    workspace_id: str,
    agent_data: AgentData
) -> Agent:
    """Create a new agent with the provided data."""
    async with get_db_session() as session:
        agent = Agent(**agent_data.model_dump())
        session.add(agent)
        await session.commit()
        return agent
```

## Debugging and troubleshooting

### Common issues

**1. Hot Reloading Not Working**

```bash
# Check if processes are running
pnpm infra:ps
ps aux | grep uvicorn

# Restart development servers
pnpm dev
```

**2. Database Connection Issues**

```bash
# Check PostgreSQL status
pnpm infra:logs | grep postgres

# Check ClickHouse status
pnpm infra:logs | grep clickhouse

# Reset infrastructure and rerun migrations
pnpm infra:reset
pnpm db:migrate
pnpm db:admin:insert   # Optional: seed admin workspace
```

**3. MCP Server Not Responding**

```bash
# Check MCP server logs
cd apps/mcp_server
uv run uvicorn src.services:app --reload --log-level debug

# Test MCP endpoint
curl http://localhost:8001/health
```

**4. Frontend Build Errors**

```bash
# Clear Next.js cache
cd apps/frontend
rm -rf .next

# Check TypeScript errors
pnpm type-check
```

### Performance debugging

```bash
# Profile PostgreSQL queries
EXPLAIN ANALYZE SELECT * FROM agents WHERE workspace_id = 'xxx';

# Query ClickHouse metrics
curl 'http://localhost:8123/' --data 'SELECT * FROM boilerplate_clickhouse.task_metrics LIMIT 10'

# Monitor Restack workflows
curl http://localhost:5233/workflows

# Check memory usage
docker stats
```

### Advanced debugging

```python
# Add logging to functions
import logging
logger = logging.getLogger(__name__)

@function.defn(name="debug_function")
async def debug_function(data: dict) -> dict:
    logger.info(f"Processing data: {data}")
    # ... function logic
    logger.info(f"Result: {result}")
    return result
```

## Learning resources

### Technical documentation

- [Restack AI Framework](https://docs.restack.io/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [Pydantic](https://docs.pydantic.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [ClickHouse](https://clickhouse.com/docs)

### Architecture patterns

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Turborepo](https://turbo.build/repo/docs)
- [Monorepo Best Practices](https://nx.dev/concepts/more-concepts/why-monorepos)

### Platform-specific

- [Vercel Deployment](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [ClickHouse Performance](https://clickhouse.com/docs/en/operations/performance)

### Development tools

- [pnpm Documentation](https://pnpm.io/motivation)
- [uv Documentation](https://docs.astral.sh/uv/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)

## Next steps for contributors

1. **Start Small**: Pick up "good first issue" labels
2. **Read Code**: Explore existing functions and workflows
3. **Setup Environment**: Ensure your development setup works correctly
4. **Ask Questions**: Use [GitHub Discussions](../../discussions) for help
5. **Share Ideas**: Propose improvements via [GitHub Issues](../../issues)

## License and contributor license agreement

By contributing, you agree that your contributions get licensed under the MIT License. No CLA required.
