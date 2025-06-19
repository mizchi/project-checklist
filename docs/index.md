---
layout: home

hero:
  name: "project-checklist"
  text: "AI-friendly TODO management"
  tagline: Manage project tasks efficiently with AI-powered CLI tool `pcheck`
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/mizchi/project-checklist

features:
  - title: AI-First Design
    details: Built specifically for AI assistants to understand and manage your project tasks efficiently
  - title: Multiple Search Engines
    details: Supports ripgrep, git-grep, grep, and native Deno search for maximum compatibility
  - title: Flexible Task Management
    details: Add, check, update, and merge tasks across multiple TODO.md files with ease
  - title: Interactive Mode
    details: Select and manage tasks interactively with multi-select support
  - title: Validation & Formatting
    details: Ensure consistent TODO.md structure with built-in validation and auto-fix capabilities
  - title: Configuration Support
    details: Customize behavior with pcheck.config.json for project-specific needs
---

## Quick Start

```bash
# Install
deno install -g --allow-read --allow-run --allow-env jsr:@mizchi/project-checklist/cli

# Basic usage
pcheck                    # Show all TODOs
pcheck add -m "Fix bug"   # Add task
pcheck check abc123       # Toggle task
pcheck update             # Organize tasks
```

## Key Features

- **AI-First Design** - Clear output for AI assistants
- **Fast Search** - Multiple search engines (ripgrep, git-grep, native)
- **Task Management** - Add, check, update, and merge TODOs
- **Validation** - Auto-fix markdown formatting
- **Git Integration** - Works seamlessly with repositories
