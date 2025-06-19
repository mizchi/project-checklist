# Quick Start

Get up and running with `pcheck` in minutes.

## Installation

```bash
deno install -g --allow-read --allow-run --allow-env \
  jsr:@mizchi/project-checklist/cli
```

## Basic Usage

```bash
# Initialize a new TODO.md
pcheck init

# Show all TODOs
pcheck

# Add a task
pcheck add -m "Implement user authentication" -p high

# Mark task as done
pcheck check abc123

# Update and organize
pcheck update --completed
```

## Typical Workflow

### 1. Start a Project

```bash
mkdir my-project && cd my-project
pcheck init
```

Creates:

```markdown
# TODO

## Tasks

- [ ] Initial project setup
- [ ] Add documentation
- [ ] Write tests
```

### 2. Add Tasks as You Work

```bash
pcheck add -m "Set up CI/CD pipeline" -p high
pcheck add bug -m "Fix login timeout" -p p1
pcheck add feature -m "Dark mode support"
```

### 3. Track Progress

```bash
# Show all tasks
pcheck

# Show only unchecked
pcheck -u

# Include code TODOs
pcheck --code
```

### 4. Complete Tasks

```bash
# See task IDs
pcheck --show-ids

# Toggle completion
pcheck check ff5d5f83

# Organize completed
pcheck update --completed
```

### 5. Clean Up for Commits

```bash
# Remove completed tasks
pcheck update --vacuum > completed-2024-01.md

# Validate structure
pcheck validate --fix
```

## AI Assistant Integration

`pcheck` is designed for AI assistants:

```bash
# Clear structured output
pcheck --json

# Consistent task IDs
pcheck --show-ids

# Batch operations
pcheck update --completed --priority --fix
```

## Configuration (Optional)

Create `pcheck.config.json`:

```json
{
  "searchEngine": "rg",
  "exclude": ["node_modules/**", "dist/**"],
  "codePatterns": ["TODO", "FIXME", "HACK"]
}
```

## Next Steps

- [Explore commands](../commands/index.md)
- [Configure pcheck](./config.md)
