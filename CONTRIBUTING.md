# Contributing to Boilerplate

Thank you for your interest in contributing to the Boilerplate project! This guide will help you set up a development environment and understand our development workflow.

## 🛠️ Development Setup

### Prerequisites

- **Node 20+**
- **Python 3.12+** 
- **pnpm** (recommended package manager)
- **Docker & Docker Compose**
- **uv** (Python package manager)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd boilerplate
```

### 2. Start Infrastructure Services

Start the required infrastructure (PostgreSQL and Restack Engine):

```bash
# Start PostgreSQL and Restack Engine
pnpm infra:start
```

### 3. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies for backend
cd apps/backend
uv sync
cd ../..

# Install Python dependencies for MCP server  
cd apps/mcp_server
uv sync
cd ../..
```

### 4. Set up Environment

```bash
# Copy environment file
cp env.development.example .env

# Update the values in .env with your actual API keys
```

### 5. Set up ngrok (Optional)

To have OpenAI call local MCP servers, expose your local server using ngrok:

```bash
ngrok http 11233
```

Add the ngrok URL to your `.env` file:
```
MCP_URL=https://your-ngrok-url.ngrok-free.app/mcp
```

### 6. Initialize Database

```bash
# Set up database schema and seed data
pnpm db:setup
```

### 7. Start Development Servers

```bash
# Start all applications in development mode
pnpm dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000  
- **MCP Server**: http://localhost:8001

## 📋 Development Commands

### Infrastructure Management

```bash
pnpm infra:start    # Start PostgreSQL and Restack Engine
pnpm infra:stop     # Stop infrastructure services
pnpm infra:restart  # Restart infrastructure services
pnpm infra:logs     # View infrastructure logs
pnpm infra:reset    # Reset database and restart services
pnpm infra:ps       # Show running services
```

### Database Management

```bash
pnpm db:connect     # Connect to PostgreSQL CLI
pnpm db:reset       # Reset database schema
pnpm db:seed        # Add seed data to database
pnpm db:setup       # Reset and seed database
pnpm db:clean       # Remove all data but keep schema
```

### Application Development

```bash
pnpm dev            # Start all applications in development mode
pnpm build          # Build all applications
pnpm start          # Start all applications in production mode
pnpm lint           # Lint all applications
pnpm lint:fix       # Fix linting issues
pnpm type-check     # Run TypeScript type checking
pnpm check          # Run type checking and linting
```

### Docker Development

```bash
pnpm docker:build   # Build Docker images
pnpm docker:up      # Start services with Docker
pnpm docker:down    # Stop Docker services
pnpm docker:logs    # View Docker logs
pnpm docker:restart # Restart Docker services
pnpm docker:reset   # Reset Docker environment
pnpm docker:ps      # Show Docker service status
```

## 🏗️ Project Structure

```
boilerplate/
├── apps/
│   ├── frontend/          # Next.js frontend application
│   ├── backend/           # Python backend with Restack AI
│   ├── mcp_server/        # Model Context Protocol server
│   └── webhook/           # Webhook handling service
├── packages/
│   ├── ui/               # Shared UI components
│   ├── database/         # Database schema and seeds
│   ├── eslint-config/    # Shared ESLint configuration
│   └── typescript-config/ # Shared TypeScript configuration
└── docker-compose.dev.yml # Development infrastructure
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific app
cd apps/frontend && pnpm test
cd apps/backend && uv run pytest
```

### Linting and Code Quality

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type checking
pnpm type-check

# Format code
pnpm format
```

## 🔧 Backend Development

### Python Backend Features

The Python backend provides CRUD operations through Restack functions:

#### Agent Operations
- `agents_read()` - List all agents
- `agents_create(agent_data)` - Create new agent  
- `agents_update(agent_id, updates)` - Update agent
- `agents_delete(agent_id)` - Delete agent
- `agents_get_by_id(agent_id)` - Get specific agent
- `agents_get_by_status(status)` - Get agents by status

#### Task Operations  
- `tasks_read()` - List all tasks
- `tasks_create(task_data)` - Create new task
- `tasks_update(task_id, updates)` - Update task
- `tasks_delete(task_id)` - Delete task
- `tasks_get_by_id(task_id)` - Get specific task
- `tasks_get_by_status(status)` - Get tasks by status

### Adding New Functions

1. Create function in `apps/backend/src/functions/`
2. Register function in `apps/backend/src/services.py`
3. Add corresponding workflow if needed
4. Update database models if required

## 🎨 Frontend Development

### Technology Stack

- **Next.js 15** - React framework
- **React Flow** - Node-based editor
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **TypeScript** - Type safety

### Adding New Components

1. Create component in `apps/frontend/components/`
2. Export from `apps/frontend/components/index.ts`
3. Add to UI package if reusable: `packages/ui/src/components/`

## 🚀 Deployment

### Local Production Build

```bash
# Build all services
pnpm build

# Start in production mode
pnpm start
```

### Docker Production Build

```bash
# Build and run with Docker
pnpm docker:reset
```

## 📝 Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional components with hooks

### Python

- Follow PEP 8 style guidelines
- Use type hints
- Follow Ruff linting rules
- Use async/await for I/O operations

### Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run tests and linting
4. Create pull request
5. Address review feedback
6. Merge after approval

### Commit Messages

Use conventional commit format:
```
feat: add new agent creation workflow
fix: resolve database connection issue  
docs: update API documentation
refactor: simplify task management logic
```

## 🐛 Debugging

### Backend Debugging

```bash
# View backend logs
pnpm infra:logs

# Connect to database
pnpm db:connect

# Check Restack Engine status
curl http://localhost:5233/health
```

### Frontend Debugging

- Use browser developer tools
- Check Next.js logs in terminal
- Use React Developer Tools extension

## 📚 Resources

- [Restack Documentation](https://docs.restack.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Flow Documentation](https://reactflow.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Getting Help

- Create an issue for bugs or feature requests
- Join our community discussions
- Check existing documentation and issues first

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
