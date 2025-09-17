# Frontend application

Next.js 15 + React 19 frontend for the AI agent management platform.

## Quick start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build && pnpm start
```

## Tech stack

- **Framework**: Next.js 15 with App Router
- **React**: React 19 with Server Components
- **UI**: `@workspace/ui` component library + Tailwind CSS
- **State**: Restack AI workflows + RxJS for real-time updates
- **Auth**: Server Actions + localStorage

## Key features

### Agent management
- Visual agent builder with form-based configuration
- Real-time testing in playground environment
- Tool approval and management workflows

### Task execution
- Live task monitoring with conversation interfaces
- Split-view for task details and chat
- Scheduled task automation

### Integrations
- MCP server management and configuration
- OAuth token handling for external services
- Real-time tool testing and validation

## Architecture

```
app/
├── (dashboard)/           # Protected routes
│   ├── agents/           # Agent management
│   ├── tasks/            # Task execution & monitoring
│   ├── integrations/     # MCP servers & OAuth
│   └── playground/       # Agent testing
├── actions/              # Server actions (preferred over API routes)
├── components/           # App-specific components
└── hooks/                # Custom React hooks

components/
├── auth/                 # Authentication & guards
├── layout/               # Navigation & layout
└── providers/            # Context providers

hooks/
├── use-workspace-*.ts    # Workspace operations
└── use-oauth-flow.ts     # OAuth integration
```

## Development patterns

### Server actions (primary)
```tsx
// Preferred for mutations
import { executeWorkflow } from "@/app/actions/workflow"

const result = await executeWorkflow("AgentCreateWorkflow", {
  name: "My Agent",
  instructions: "..."
})
```

### Real-time updates
```tsx
// RxJS for live conversations
import { useRxjsConversation } from "./hooks/use-rxjs-conversation"

const { messages, sendMessage } = useRxjsConversation(taskId)
```

### Component usage
```tsx
// Import from shared UI library
import { Button, Card } from "@workspace/ui/components/ui"
import { AgentConfigForm } from "@workspace/ui/components/agent-config-form"
import { StatusIndicator } from "@workspace/ui/components/status-indicators"
```

## Environment variables

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Restack Engine
RESTACK_ENGINE_ID=your_engine_id
RESTACK_ENGINE_ADDRESS=http://localhost:5233
RESTACK_ENGINE_API_KEY=your_api_key

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Scripts

- `pnpm dev` - Development server with Turbopack
- `pnpm build` - Production build
- `pnpm start` - Production server
- `pnpm lint` - ESLint
- `pnpm type-check` - TypeScript checking

## Integration patterns

### Workflow execution
```tsx
// Execute backend workflows
const { workflowId, runId } = await runWorkflow({
  workflowName: "TaskCreateWorkflow",
  input: { title: "New Task" }
})

const result = await getWorkflowResult({ workflowId, runId })
```

### Agent communication
```tsx
// Send messages to agents
await sendAgentMessage({
  agentId: "agent-123",
  message: "Hello"
})

// Handle MCP approvals
await sendMcpApproval({
  agentId: "agent-123",
  approvalId: "approval-456",
  approved: true
})
```

### Workspace context
```tsx
// Multi-tenant workspace scoping
const { currentWorkspaceId, workspaces } = useDatabaseWorkspace()
const { agents, tasks, createAgent } = useWorkspaceScopedActions()
```

## Component guidelines

**Keep in Frontend App:**
- Next.js-specific components (using `useRouter`, `Link`)
- Business logic and domain-specific forms
- Page layouts and navigation
- Authentication flows

**Move to `@workspace/ui`:**
- Reusable UI primitives
- Generic AI interface patterns
- Framework-agnostic utilities

## Deployment

```bash
# Docker
docker-compose up --build frontend

# Or with production optimizations
pnpm build && pnpm start
```

## Related packages

- [`@workspace/ui`](../../packages/ui/) - Shared component library
- [`@workspace/eslint-config`](../../packages/eslint-config/) - Linting rules
- [`@workspace/typescript-config`](../../packages/typescript-config/) - TS config