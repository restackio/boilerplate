# ESLint Config

Shared ESLint configuration for the monorepo workspace.

## Usage

In your `eslint.config.js`:

```javascript
import baseConfig from "@workspace/eslint-config/base"
import nextConfig from "@workspace/eslint-config/next"
import reactConfig from "@workspace/eslint-config/react-internal"

export default [
  ...baseConfig,
  ...nextConfig,   // For Next.js apps
  ...reactConfig,  // For React libraries
]
```

## Configurations

- **base.js** - Core ESLint rules for all JavaScript/TypeScript
- **next.js** - Next.js specific rules and plugins  
- **react-internal.js** - React component library rules

## Rules included

- TypeScript strict mode
- Import sorting and organization
- React hooks linting
- Next.js best practices
- Accessibility checks
- Performance optimizations
