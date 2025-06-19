# Monorepo Configuration Example

This example shows how to configure pcheck for a monorepo structure with
multiple packages and apps.

## Features

- **Package-aware scanning**: Searches specific package directories
- **Workspace support**: Handles nested TODO.md files across packages
- **Test exclusion**: Ignores test directories in all packages
- **Build artifact exclusion**: Skips dist, build, and framework-specific
  directories

## Structure

```
monorepo/
├── pcheck.config.json
├── TODO.md              # Root-level tasks
├── packages/
│   ├── ui/
│   │   └── TODO.md     # UI package tasks
│   ├── core/
│   │   └── TODO.md     # Core package tasks
│   └── utils/
│       └── TODO.md     # Utils package tasks
└── apps/
    ├── web/
    │   └── TODO.md     # Web app tasks
    └── mobile/
        └── TODO.md     # Mobile app tasks
```

## Usage

```bash
# Scan entire monorepo
pcheck

# Scan specific package
pcheck packages/ui

# Include code from all packages
pcheck --code

# Filter by package type
pcheck --filter-dir packages
pcheck --filter-dir apps
```

## Configuration Highlights

The configuration uses glob patterns to handle the monorepo structure:

```json
{
  "include": [
    "**/TODO.md",
    "packages/*/src/**/*",
    "apps/*/src/**/*"
  ],
  "exclude": [
    "**/node_modules/**",
    "packages/*/test/**",
    "apps/*/test/**"
  ]
}
```
