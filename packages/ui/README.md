# UI component library

A comprehensive React component library built with Radix UI primitives and Tailwind CSS, designed for the AI agent management platform.

## Overview

This package provides a collection of reusable, accessible, and customizable UI components shared across the entire workspace. Built on top of Radix UI primitives with Tailwind CSS styling, it ensures consistency and maintainability across all applications.

## Architecture

- **Base**: Radix UI headless components for accessibility
- **Styling**: Tailwind CSS with CSS-in-JS patterns
- **Theming**: Dark/light mode support with `next-themes`
- **Variants**: `class-variance-authority` for component variants
- **Icons**: Lucide React icon library

## Component categories

### 🎨 UI primitives
Core building blocks for the design system:

- **Button** - Primary, secondary, outline, ghost variants
- **Input** - Text inputs with validation states
- **Label** - Accessible form labels
- **Card** - Content containers with headers and footers
- **Badge** - Status indicators and tags
- **Avatar** - User profile images with fallbacks
- **Separator** - Visual dividers

### 📋 Data display
Components for presenting information:

- **Table** - Advanced data tables with sorting and filtering
- **Progress** - Progress bars and loading indicators
- **Skeleton** - Loading placeholders
- **Empty State** - Placeholder for empty data sets
- **Tooltip** - Contextual information on hover

### 🗂️ Navigation
Components for navigation and organization:

- **Tabs** - Tab navigation with content panels
- **Breadcrumb** - Hierarchical navigation
- **Navigation Menu** - Complex navigation structures
- **Sidebar** - Collapsible side navigation

### 📝 Forms and inputs
Interactive form components:

- **Checkbox** - Multi-select options
- **Switch** - Toggle controls
- **Select** - Dropdown selection
- **Slider** - Range input controls
- **Textarea** - Multi-line text input
- **Calendar** - Date selection
- **Command** - Command palette interface

### 🪟 Overlays
Dialog and popup components:

- **Dialog** - Dialog dialogs and confirmations
- **Popover** - Contextual popovers
- **Dropdown Menu** - Action menus
- **Sheet** - Slide-out panels
- **Drawer** - Mobile-optimized dialogs

### 🤖 AI-specific components
Specialized components for AI agent interfaces:

- **Agent Flow** - Visual workflow representation
- **Agent Status Badge** - Real-time status indicators
- **AI Elements** - Reasoning display and response formatting
- **Flow Components** - Node-based workflow visualization

### 📊 Data tables
Advanced table functionality:

- **Data Table** - Sortable, filterable tables
- **Filter Components** - Advanced filtering controls
- **Active Filters** - Filter management interface
- **Hooks** - Custom hooks for table state management

### 🛠️ Specialized components
Domain-specific components:

- **Agents Table** - Agent management interface
- **Tasks Table** - Task listing and management
- **Schedules Table** - Schedule management
- **Tokens Table** - API token management
- **MCPs Table** - MCP server management
- **Integrations Table** - Integration management
- **Workspace Switcher** - Multi-workspace navigation
- **Lucide Icon Picker** - Icon selection interface

## Project structure

```
src/
├── components/
│   ├── ui/                    # Base UI primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── table/                 # Advanced table components
│   │   ├── components/        # Filter and control components
│   │   ├── core/             # Table logic and types
│   │   ├── hooks/            # Table-specific hooks
│   │   ├── lib/              # Utility functions
│   │   └── ui/               # Table UI components
│   ├── flow/                  # Workflow visualization
│   │   ├── baseNode.tsx
│   │   ├── workflowEdge.tsx
│   │   └── ...
│   ├── ai-elements/           # AI-specific UI
│   │   ├── reasoning.tsx
│   │   └── response.tsx
│   └── *.tsx                  # Domain-specific components
├── hooks/
│   └── use-mobile.ts          # Responsive design hooks
├── lib/
│   ├── utils.ts              # Utility functions
│   ├── types.ts              # Shared type definitions
│   └── get-lucide-icon.ts    # Icon utilities
└── styles/
    └── globals.css           # Global styles and CSS variables
```

## Installation and usage

This internal workspace package becomes automatically available to other packages in the monorepo.

### In frontend applications

```tsx
import { Button, Card, Badge } from "@workspace/ui/components/ui"
import { AgentsTable } from "@workspace/ui/components/agents-table"

function MyComponent() {
  return (
    <Card>
      <AgentsTable />
      <Button variant="primary">
        Action
      </Button>
    </Card>
  )
}
```

### Styling

Import the global styles in your app:

```tsx
import "@workspace/ui/globals.css"
```

## Development

### Prerequisites

- Node.js 18+
- pnpm (package manager)

### Scripts

- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm type-check` - Run TypeScript type checking
- `pnpm check` - Run both type checking and linting

### Adding new components

1. **Create the component** in the appropriate directory
2. **Export it** from the main index file
3. **Add proper TypeScript types**
4. **Follow accessibility guidelines**
5. **Support theming** (dark/light mode)

Example component structure:

```tsx
import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Design system

### Colors

The design system uses CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Typography

Font sizes and spacing follow a consistent scale defined in the Tailwind configuration.

### Spacing

Uses Tailwind's default spacing scale (4px base unit).

## Key technologies

### Core dependencies
- **React 19**: Latest React with concurrent features
- **Radix UI**: Accessible headless components
- **Tailwind CSS**: Utility-first styling
- **class-variance-authority**: Component variant management
- **clsx**: Conditional class name utility

### Specialized libraries
- **@xyflow/react**: Flow-based node visualization
- **react-day-picker**: Calendar and date picker
- **cmdk**: Command palette interface
- **vaul**: Mobile drawer component

### Development tools
- **TypeScript**: Type safety and developer experience
- **ESLint**: Code quality and consistency
- **Tailwind**: Responsive design utilities

## Exports

The package exports components through a structured export system:

```json
{
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./lib/*": "./src/lib/*.ts",
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts"
  }
}
```

## Accessibility

All components follow WCAG guidelines and include:

- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast support

## Theming

Components support both light and dark themes automatically through CSS custom properties and `next-themes` integration.

## Contributing

### What belongs in this package

**✅ Include in `@workspace/ui`:**
- **Pure UI primitives** (Button, Input, Card, etc.)
- **Framework-agnostic components** (no Next.js, React Router dependencies)
- **Reusable AI interface patterns** (ChatInput, ToolsList, ContentDisplay)
- **Generic data display components** (Table infrastructure, filters)
- **Design system components** (themes, icons, layouts)

**❌ Keep in `apps/frontend`:**
- **Domain-specific business logic** (AgentConfigurationForm, specific table implementations)
- **Next.js-dependent components** (components using useRouter, Link, server actions)
- **App-specific layouts and navigation** (app-sidebar, workspace-specific components)
- **Authentication and authorization** (login forms, guards)
- **Page-specific components** (components tied to specific routes)

### Component contribution rules

1. **Follow the established patterns** for component structure
2. **Use Radix UI primitives** as the foundation when available
3. **Use proper TypeScript types** with generic support
4. **Support both light and dark themes**
5. **Include proper ARIA attributes** for accessibility
6. **Test across different screen sizes**
7. **Document component props** and usage examples
8. **No framework dependencies** - components must work with any React setup
9. **Generic interfaces** - use generic props rather than specific data models

## Related packages

- [`apps/frontend`](../../apps/frontend/) - Main application using these components
- [`@workspace/eslint-config`](../eslint-config/) - ESLint configuration
- [`@workspace/typescript-config`](../typescript-config/) - TypeScript configuration
