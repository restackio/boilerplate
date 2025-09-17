# TypeScript Config

Shared TypeScript configuration for the monorepo workspace.

## Usage

In your `tsconfig.json`:

```json
{
  "extends": "@workspace/typescript-config/base",
  "compilerOptions": {
    "outDir": "dist"
  }
}
```

## Configurations

- **base.json** - Core TypeScript settings for all projects
- **nextjs.json** - Next.js specific configuration
- **react-library.json** - React component library settings

## Settings included

- Strict TypeScript mode
- ES2022 target with modern features
- Path mapping and module resolution
- JSX support for React
- Declaration file generation
- Source map generation for debugging
