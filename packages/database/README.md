# Database Package

This package contains the database schema and seed data for the boilerplate agent orchestration platform.

## Files

- `schema.sql` - Database schema with all tables, indexes, and triggers
- `seed.sql` - Seed data for development and testing

## Database Schema

The platform includes a PostgreSQL database with the following tables:

### Core Tables
- **workspaces** - Organization workspaces
- **users** - Users within workspaces
- **agents** - AI agents with configurations
- **agent_runs** - Execution history of agents
- **tasks** - Tasks assigned to agents

### Advanced Features
- **feedbacks** - User feedback on agent responses
- **rules** - Rules for agent behavior
- **experiments** - A/B testing experiments

## Usage

### Development
The database is automatically initialized when starting the infrastructure:

```bash
# Start infrastructure (includes database initialization)
pnpm run infra:start

# Reset database with fresh schema and seed data
pnpm run db:reset

# Add seed data to existing database
pnpm run db:seed
```

### Production
For production deployments, you can use these SQL files to initialize your database:

```sql
-- Initialize schema
\i schema.sql

-- Add seed data (optional)
\i seed.sql
```

## Database Connection

The database connection string format:
```
postgresql://username:password@host:port/database_name
```

Default development connection:
```
postgresql://postgres:postgres@localhost:5432/boilerplate_db
```

## Seed Data

The seed data includes:
- 1 demo workspace (Demo Company - Enterprise plan)
- 1 demo user (Philippe - philippe@demo.com)
- 5 demo agents (GitHub, Slack, Email, Alerts, Intercom support agents)
- 5 demo tasks with various statuses and priorities
- Sample agent runs, feedbacks, rules, and experiments

This provides a complete demo environment for testing the agent orchestration platform. 