# UI component library

Shared React component library built with Radix UI + Tailwind CSS for the AI agent platform.

## Quick start

```tsx
// Import UI primitives
import { Button, Card, Input, Dialog } from "@workspace/ui/components/ui"

// Import specialized components
import { AgentConfigForm } from "@workspace/ui/components/agent-config-form"
import { StatusIndicator } from "@workspace/ui/components/status-indicators"
import { WorkspaceSwitcher } from "@workspace/ui/components/workspace-switcher"

// Import AI-specific components
import { PromptInput, Reasoning, Response } from "@workspace/ui/components/ai-elements"

// Import table system
import { DataTable } from "@workspace/ui/components/table"

// Don't forget global styles
import "@workspace/ui/globals.css"
```

## Component categories

### UI primitives
Core building blocks: `Button`, `Input`, `Card`, `Dialog`, `Badge`, `Avatar`, `Tabs`, `Select`, etc.

### AI components
- **Agent Config Form** - Complete agent setup interface
- **AI Elements** - `PromptInput`, `Reasoning`, `Response` for chat interfaces
- **Agent Flow** - Visual workflow representation with auto-layout
- **Status Indicators** - Real-time status badges and displays

### Data and tables
- **DataTable** - Advanced sortable/filterable tables
- **Filter Components** - Search, date ranges, multi-select filters
- **Empty States** - Consistent placeholder interfaces

### Specialized
- **Workspace Switcher** - Multi-workspace navigation
- **Auth Form** - Login/signup with validation states
- **Loading States** - Skeleton loaders and spinners
- **Navigation** - Sidebar, breadcrumbs, tab navigation
- **Form Dialog** - Modal forms with submission handling

## Usage patterns

### Basic components
```tsx
<Card>
  <CardHeader>
    <CardTitle>Agent Configuration</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Agent name" />
    <Button variant="default">Save</Button>
  </CardContent>
</Card>
```

### AI Interface
```tsx
<div className="space-y-4">
  <PromptInput 
    onSubmit={handlePrompt}
    placeholder="Enter your prompt..."
  />
  <Reasoning content={reasoningData} />
  <Response content={responseData} />
</div>
```

### Data tables
```tsx
<DataTable
  data={agents}
  columns={agentColumns}
  filters={[
    { key: "status", type: "select", options: statusOptions },
    { key: "name", type: "search" }
  ]}
  onRowClick={handleAgentClick}
/>
```

### Status and loading
```tsx
<StatusIndicator 
  status="in_progress" 
  label="Agent Running"
/>

<CenteredLoading message="Loading agents..." />

<EmptyState
  title="No agents found"
  description="Create your first agent to get started"
  action={<Button>Create Agent</Button>}
/>
```

## Styling system

### Variants
Components use `class-variance-authority` for consistent variants:

```tsx
<Button variant="default" size="lg">Primary</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="ghost">Minimal</Button>
```

### Theming
Automatic dark/light mode support via CSS custom properties:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
}
```

## Tech stack

- **React 19** - Latest React features
- **Radix UI** - Accessible headless components
- **Tailwind CSS** - Utility-first styling
- **@xyflow/react** - Flow diagrams for agent workflows
- **cmdk** - Command palette interface
- **zod** - Runtime validation

## Development

```bash
# Lint components
pnpm lint

# Type check
pnpm type-check

# Run both
pnpm check
```

### Adding components

1. Create in appropriate directory (`ui/`, `ai-elements/`, etc.)
2. Export from main index
3. Use Radix primitives when available
4. Support dark/light themes
5. Include proper TypeScript types

```tsx
import { cn } from "@workspace/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-background"
      }
    }
  }
)

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = ({ className, variant, ...props }) => (
  <button 
    className={cn(buttonVariants({ variant, className }))}
    {...props} 
  />
)
```

## What goes where

**✅ Include in `@workspace/ui`:**
- Pure UI primitives and patterns
- Framework-agnostic components
- Reusable AI interface elements
- Generic data display components

**❌ Keep in `apps/frontend`:**
- Next.js-specific components
- Business logic and domain forms
- App-specific navigation
- Authentication flows

## Exports

```json
{
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./components/*": "./src/components/*.tsx",
    "./lib/*": "./src/lib/*.ts",
    "./hooks/*": "./src/hooks/*.ts"
  }
}
```

## Related

- [`apps/frontend`](../../apps/frontend/) - Main app using these components
- [Radix UI](https://radix-ui.com) - Headless component primitives
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework

## License

Licensed under the [Apache License, Version 2.0](../../LICENSE).