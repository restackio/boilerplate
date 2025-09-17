# Frontend application

A Next.js 15 application built with React 19 that provides the user interface for the AI agent management platform.

## Overview

This main frontend application allows users to manage AI agents, tasks, integrations, and workflows through a modern web interface. Built with Next.js, it leverages the shared UI component library from `@workspace/ui`.

## Architecture

- **Framework**: Next.js 15 with App Router
- **React**: React 19 with modern features
- **UI Components**: Shared component library (`@workspace/ui`)
- **Styling**: Tailwind CSS with Radix UI primitives
- **State Management**: Restack AI workflows for agent interactions
- **Authentication**: OAuth integration with backend services

## Key features

### 🤖 Agent management
- Create, configure, and manage AI agents
- Agent versioning and deployment
- Tool approval and management
- Real-time agent status monitoring

### 📋 Task management
- Interactive task execution and monitoring
- Real-time conversation interface
- Task scheduling and automation
- Historical task tracking

### 🔌 Integrations
- MCP (Model Context Protocol) server management
- OAuth token management
- Tool approval workflows
- Integration setup and configuration

### 📊 Dashboard
- Comprehensive overview of agents and tasks
- Performance metrics and analytics
- Team collaboration features
- Workspace management

### 🎮 Playground
- Interactive agent testing environment
- Real-time tool execution
- Debugging and development tools

## Project structure

```
app/
├── (dashboard)/          # Dashboard layout group
│   ├── agents/          # Agent management pages
│   ├── tasks/           # Task management and execution
│   ├── integrations/    # MCP servers and OAuth
│   ├── playground/      # Agent testing environment
│   └── teams/           # Team and workspace management
├── actions/             # Server actions
├── api/                 # API routes
├── login/              # Authentication pages
└── workspace/          # Workspace creation

components/             # App-specific components
├── auth-guard.tsx     # Authentication wrapper
├── app-sidebar.tsx    # Main navigation
├── workspace-guard.tsx # Workspace access control
└── providers/         # Context providers

hooks/                 # Custom React hooks
├── use-agent-state.ts
├── use-oauth-flow.ts
├── use-tools-manager.ts
└── use-workspace-*.ts

lib/                   # Utilities and contexts
├── workspace-context.tsx
├── database-workspace-context.tsx
└── demo-data/
```

## Development

### Prerequisites

- Node.js 18+
- pnpm (package manager)

### Getting started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```

3. **Build for production**:
   ```bash
   pnpm build
   ```

4. **Start production server**:
   ```bash
   pnpm start
   ```

### Available scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm check` - Run both type checking and linting
- `pnpm clean` - Clean build artifacts

## Configuration

### Next.js configuration

The app configuration includes:
- Transpile the shared UI package (`@workspace/ui`)
- Handle external packages for Restack AI
- Use Turbopack for fast development builds

### Environment variables

Set up your environment variables based on the backend configuration:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Key technologies

### Core stack
- **Next.js 15**: Full-stack React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling

### State and data
- **Restack AI**: Workflow orchestration and AI agent management
- **RxJS**: Reactive programming for real-time updates
- **Server Actions**: Form handling and mutations

### UI and UX
- **@workspace/ui**: Shared component library
- **Radix UI**: Accessible primitive components
- **Lucide React**: Icon library
- **next-themes**: Dark/light mode support

### Analytics and monitoring
- **PostHog**: Product analytics and feature flags

## Integration with backend

The frontend communicates with the backend through:

1. **Server Actions**: Direct function calls for mutations
2. **Restack Workflows**: Real-time agent execution
3. **REST API**: Data fetching and OAuth flows

## Deployment

Deploy this app alongside the backend services using Docker:

```bash
# Build and run with Docker Compose
docker-compose up --build frontend
```

The Dockerfile includes multi-stage builds for optimized production deployments.

## Contributing

### Component organization

**✅ Keep in this frontend app:**
- **Domain-specific business logic** (AgentConfigurationForm, agent-specific workflows)
- **Next.js-dependent components** (components using useRouter, Link, server actions)
- **App-specific layouts and navigation** (app-sidebar, workspace-specific components)
- **Authentication and authorization** (login forms, auth guards)
- **Page-specific components** (components tied to specific routes)
- **Backend integration logic** (components calling server actions)

**✅ Move to `@workspace/ui` package:**
- **Reusable AI interface patterns** (ChatInput, ToolsList, ContentDisplay)
- **Generic components** that other frontends could use
- **Framework-agnostic utilities** (no Next.js dependencies)

### Development guidelines

1. Follow the established code patterns and component structure
2. Use the shared UI components from `@workspace/ui`
3. Use proper TypeScript types
4. Write responsive and accessible interfaces
5. Test across different screen sizes and themes
6. Keep domain-specific logic in this app, not the shared UI package
7. Consider reusability when creating new components

## Related packages

- [`@workspace/ui`](../packages/ui/) - Shared UI component library
- [`@workspace/eslint-config`](../packages/eslint-config/) - ESLint configuration
- [`@workspace/typescript-config`](../packages/typescript-config/) - TypeScript configuration
