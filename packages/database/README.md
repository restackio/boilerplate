# Database schema

PostgreSQL database schema and seed data for the agent orchestration platform.

## Quick start

```bash
# Setup database with demo data
pnpm infra:start && pnpm db:setup
```

## Files

- `schema.sql` - Complete database schema  
- `workspace-seed.sql` - Basic workspace setup
- `agents-seed.sql` - Demo agents and tasks

## Database schema

### Core tables
- **workspaces** - Organization workspaces
- **teams** - Teams within workspaces  
- **users** - Users and authentication
- **agents** - AI agents with configurations
- **tasks** - Tasks with conversation history
- **mcp_servers** - External tool configurations

## Management commands

```bash
# Reset schema only
pnpm db:reset

# Seed workspace data  
pnpm db:seed:workspace

# Seed agents and tasks
pnpm db:seed:agents

# Reset and seed everything
pnpm db:setup

# Connect to database
pnpm db:connect
```

## Demo data

### Login credentials
- **Email**: `demo@example.com`
- **Password**: `password`

### Seed data
- **1 Workspace**: Demo Company
- **5 Teams**: Customer Support, Sales, Marketing, Engineering, HR  
- **1 User**: Demo User (assigned to all teams)
- **5 Agents**: Specialized agent per team
- **5 Tasks**: Completed tasks with conversation history

### Demo agents
1. **Customer Support**: Zendesk integration with tool orchestration
2. **Sales**: CRM integration for lead management
3. **Marketing**: PostHog analytics for campaign optimization
4. **Engineering**: Technical research with web search
5. **HR**: Automated onboarding workflows

## Production deployment

Use SQL files directly:
```sql
-- Initialize schema
\i schema.sql

-- Add workspace data (required)
\i workspace-seed.sql

-- Add demo agents (optional)
\i agents-seed.sql
```

## Connection

**Development:**
```
postgresql://postgres:postgres@localhost:5432/boilerplate_db
```

**Production:**
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
``` 