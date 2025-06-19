# Documentation Site Configuration Example

This example shows configuration optimized for documentation sites and content
management.

## Features

- **Markdown-focused**: Only scans markdown files by default
- **Code scanning disabled**: Focus on content, not code
- **MDX support**: Includes .mdx files for component-based docs
- **Clean output**: No line numbers, only shows files with tasks
- **Framework exclusions**: Ignores Docusaurus, Next.js build directories

## Configuration Highlights

```json
{
  "code": {
    "enabled": false
  },
  "markdown": {
    "extensions": ["md", "mdx", "markdown"],
    "checklistOnly": true
  },
  "display": {
    "showLineNumbers": false,
    "showEmptyTodos": false
  }
}
```

## Usage

```bash
# Scan all documentation
pcheck

# Focus on specific content directory
pcheck docs/

# Enable code scanning temporarily
pcheck --code

# Check blog posts
pcheck blog/
```

## Directory Structure

```
documentation-site/
├── pcheck.config.json
├── TODO.md
├── docs/
│   ├── intro.md
│   └── api/
│       └── reference.md
├── blog/
│   └── 2024-01-01-welcome.md
└── content/
    └── tutorials/
        └── getting-started.mdx
```
