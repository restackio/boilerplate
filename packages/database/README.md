# Database Package

This package contains the database schema and seed data for the boilerplate agent orchestration platform.

## Files

- `schema.sql` - Database schema with all tables, indexes, and triggers
- `workspace-seed.sql` - Basic workspace, teams, users, and MCP servers
- `agents-seed.sql` - AI agents and completed tasks with realistic conversation history

## Database Schema

The platform includes a PostgreSQL database with the following tables:

### Core Tables
- **workspaces** - Organization workspaces
- **teams** - Teams within workspaces
- **users** - Users within workspaces
- **user_workspaces** - User-workspace relationships
- **agents** - AI agents with configurations
- **agent_tools** - Tools and MCP servers available to agents
- **mcp_servers** - MCP (Model Context Protocol) server configurations
- **tasks** - Tasks assigned to agents with conversation history

## Quick Start

### 🚀 Complete Setup (Recommended)
Start the infrastructure and set up demo data in one command:

```bash
# Start infrastructure with database and seed demo data
pnpm infra:start && pnpm db:setup
```

### 🔄 Database Management

```bash
# Reset database schema only
pnpm db:reset

# Seed workspace data (teams, users, MCP servers)
pnpm db:seed:workspace

# Seed agents and completed tasks
pnpm db:seed:agents

# Seed everything (workspace + agents)
pnpm db:seed

# Complete database reset and reseed
pnpm db:setup
```

### 🔌 Database Connection

```bash
# Connect to database for manual queries
pnpm db:connect
```

## Demo Environment

### 👤 Demo Login
- **Email**: `demo@example.com`
- **Password**: `password`

### 🏢 Demo Data Overview

The seed creates a complete demo environment with:

**1 Workspace**: Demo Company
**5 Teams**: Customer Support, Sales, Marketing, Engineering, HR
**1 User**: Demo User (assigned to all teams)
**5 Agents**: One specialized agent per team
**5 Completed Tasks**: Realistic conversation history showing tool usage

### 🤖 Demo Agents by Team

1. **Customer Support**: `zendesk-support-orchestrator`
   - Tools: Zendesk, Knowledge Base, PagerDuty, Datadog, Linear, GitHub
   - Demo: Login issue resolution with tool orchestration

2. **Sales**: `sales-lead-manager`
   - Tools: CRM integration
   - Demo: Enterprise lead qualification and opportunity creation

3. **Marketing**: `campaign-analytics-optimizer`
   - Tools: PostHog analytics
   - Demo: Q1 campaign performance analysis and optimization

4. **Engineering**: `technical-research-assistant`
   - Tools: Knowledge base, web search, documentation
   - Demo: Microservices architecture research

5. **HR**: `hr-operations-assistant`
   - Tools: HR system integration
   - Demo: Automated onboarding workflow design

### 📋 Demo Tasks Features

- **Realistic Conversations**: Each task shows complete agent-user interactions
- **Tool Usage Examples**: See how agents call MCP tools and process results
- **Approval Workflow**: Customer Support includes a tool approval declined example
- **Rich Context**: Tasks demonstrate complex problem-solving across different domains

### 🔧 Tool Integration Examples

- **MCP Server Integration**: Zendesk, PostHog, Salesforce, BambooHR
- **Built-in Tools**: Web search, file search, code interpreter
- **Approval Workflows**: Configurable tool approval requirements
- **Error Handling**: Examples of tool failures and graceful degradation

## Production Deployment

For production deployments, use the SQL files directly:

```sql
-- 1. Initialize schema
\i schema.sql

-- 2. Add workspace data (required)
\i workspace-seed.sql

-- 3. Add agents and demo tasks (optional)
\i agents-seed.sql
```

## Database Connection

Default development connection:
```
postgresql://postgres:postgres@localhost:5432/boilerplate_db
```

For production, set `DATABASE_URL` environment variable:
```
DATABASE_URL=postgresql://username:password@host:port/database_name
``` 