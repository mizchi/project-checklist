# check

Toggle task completion status by ID.

## Synopsis

```bash
pcheck check <id> [options]
```

## Options

- `--off` - Only uncheck (don't toggle)

## Examples

```bash
# Toggle task completion
pcheck check abc123

# Uncheck a task (won't check if already unchecked)
pcheck check abc123 --off

# Workflow: Find and check tasks
pcheck --show-ids          # List all tasks with IDs
pcheck check def456        # Toggle specific task
pcheck -u                  # Show remaining unchecked tasks
```

## Finding Task IDs

```bash
pcheck --show-ids     # Show all tasks with IDs
pcheck check abc123   # Toggle specific task
```