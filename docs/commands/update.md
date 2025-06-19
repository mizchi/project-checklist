# update

Update and organize TODO.md files.

## Synopsis

```bash
pcheck update [file] [options]
pcheck u [file] [options]
```

## Options

### Organization Options
- `--completed` - Move completed tasks to COMPLETED section
- `--priority` - Sort tasks by priority
- `--vacuum` - Remove completed tasks and output them
- `--fix` - Validate and fix formatting before updating

### Code Integration
- `--code` - Extract TODOs from source code and add to TODO.md

### Output Options
- `-o, --output <file>` - Write to different file
- `--dry-run` - Show changes without writing

## Examples

```bash
# Basic update (organize structure)
pcheck update

# Move completed tasks to COMPLETED section
pcheck update --completed

# Sort by priority and move completed
pcheck update --completed --priority

# Extract code TODOs and add to file
pcheck update --code

# Vacuum completed tasks
pcheck update --vacuum > completed-tasks.md

# Fix formatting issues
pcheck update --fix

# Dry run to preview changes
pcheck update --completed --priority --dry-run
```

## Key Features

- `--completed` moves completed tasks to COMPLETED section
- `--priority` sorts tasks by priority (P0 > HIGH > MID > LOW)
- `--code` extracts TODO comments from source files
- `--vacuum` removes completed tasks and outputs them
- `--fix` validates and fixes formatting