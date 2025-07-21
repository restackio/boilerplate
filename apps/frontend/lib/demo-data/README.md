# Demo Data Structure

This directory contains consolidated dummy data for different demo workspaces in the application.

## Structure

### Files

- `types.ts` - TypeScript interfaces for workspace data structure
- `demo-company.ts` - Full-featured enterprise demo workspace
- `startup-workspace.ts` - Startup-focused demo workspace with different data
- `empty-workspace.ts` - Empty workspace for testing empty states
- `index.ts` - Main export file with workspace management utilities

### Workspace Data Structure

Each workspace contains:

```typescript
interface WorkspaceData {
  workspace: {
    name: string;
    logo: React.ElementType;
    plan: string;
  };
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  navigation: {
    teams: Array<{
      name: string;
      url: string;
      icon: React.ElementType;
      items: Array<{
        title: string;
        url: string;
      }>;
    }>;
  };
  tasks: Task[];
  agents: AgentExperiment[];
}
```

## Available Workspaces

### 1. DemoCompany (`demo-company`)

- **Plan**: Enterprise
- **User**: Philippe (philippe@demo.com)
- **Teams**: Customer Support, Technical Support, Engineering Support, Customer Success
- **Tasks**: 5 sample tasks with various statuses
- **Agents**: 4 agent experiments with different channels and performance metrics

### 2. StartupCorp (`startup-corp`)

- **Plan**: Startup
- **User**: Alex Chen (alex@startupcorp.com)
- **Teams**: Product Support, Developer Relations, Community
- **Tasks**: 3 developer-focused tasks
- **Agents**: 2 community-focused agents

### 3. New Workspace (`empty`)

- **Plan**: Free
- **User**: Philippe (philippe@demo.com)
- **Teams**: None
- **Tasks**: None
- **Agents**: None
- **Purpose**: Testing empty states in the UI

## Usage

### Basic Usage

```typescript
import { getCurrentWorkspaceData } from "@/lib/demo-data";

const workspace = getCurrentWorkspaceData("demo-company");
```

### With React Context

```typescript
import { useWorkspace } from "@/lib/workspace-context";

function MyComponent() {
  const { currentWorkspace, switchWorkspace } = useWorkspace();

  // Use currentWorkspace.tasks, currentWorkspace.agents, etc.
  // Switch workspaces with switchWorkspace("startup-corp")
}
```

### Getting All Workspaces

```typescript
import { getAllWorkspaces } from "@/lib/demo-data";

const workspaces = getAllWorkspaces();
// Returns array of { key, name, logo, plan }
```

## Adding New Workspaces

1. Create a new file in this directory (e.g., `my-workspace.ts`)
2. Export a workspace data object following the `WorkspaceData` interface
3. Add the workspace to the `workspaces` object in `index.ts`
4. Add the workspace key to the `WorkspaceKey` type

Example:

```typescript
// my-workspace.ts
import { WorkspaceData } from "./types";

export const myWorkspaceData: WorkspaceData = {
  workspace: {
    name: "My Workspace",
    logo: MyIcon,
    plan: "Pro",
  },
  // ... rest of the data
};

// index.ts
export const workspaces = {
  "demo-company": demoCompanyData,
  "startup-corp": startupWorkspaceData,
  empty: emptyWorkspaceData,
  "my-workspace": myWorkspaceData, // Add here
} as const;
```

## Demo Page

Visit `/demo` to see the workspace switcher in action and explore the different workspaces interactively.
