# Command Reference

## Command Structure

```bash
pcheck [command] [options]
```

## Available Commands

### Core Commands

- [`scan`](./scan.md) - Scan and display TODO items (default)
- [`add`](./add.md) - Add new tasks to TODO.md
- [`check`](./check.md) - Toggle task completion status
- [`update`](./update.md) - Update and organize TODO.md files
- [`merge`](./merge.md) - Merge TODO files from subdirectories

### Utility Commands

- [`validate`](./validate.md) - Validate TODO.md structure
- [`doctor`](./doctor.md) - Check environment and search engines
- [`init`](./init.md) - Initialize TODO.md and configuration

## Common Options

- `-h, --help` - Show help
- `-v, --version` - Show version
- `-j, --json` - JSON output
- `--code` - Include code TODOs
- `-u, --unchecked` - Only unchecked items
- `--show-ids` - Show task IDs
- `--engine <name>` - Search engine (rg, git-grep, grep, native)

## Quick Examples

```bash
pcheck                      # Show all TODOs
pcheck --code               # Include code TODOs
pcheck add -m "Fix bug"     # Add task
pcheck check abc123         # Toggle task
pcheck update --completed   # Organize tasks
pcheck merge                # Merge TODO files
pcheck validate --fix       # Fix formatting
```