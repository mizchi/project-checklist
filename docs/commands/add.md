# add

Add new tasks to TODO.md files.

## Synopsis

```bash
pcheck add [file] [type] -m <message> [options]
```

## Options

- `-m, --message <text>` - Task description (required)
- `-p, --priority <value>` - Task priority:
  - Named: `high`, `mid`, `low`
  - Numeric: 1-99 (1 = highest)
  - For bugs: `p0`, `p1`, `p2`, `p3`

## Examples

```bash
# Add a simple task
pcheck add -m "Update documentation"

# Add to specific file
pcheck add ./src/TODO.md -m "Refactor database module"

# Add a high priority task
pcheck add -m "Fix critical security issue" -p high

# Add a bug with priority
pcheck add bug -m "Login button not working" -p p1

# Add a feature request
pcheck add feature -m "Add dark mode support" -p mid

# Add with numeric priority
pcheck add -m "Optimize build process" -p 10
```

## Priority Format

- Named: `high`, `mid`, `low`
- Bugs: `p0`, `p1`, `p2`, `p3`
- Numeric: 1-99 (lower = higher priority)