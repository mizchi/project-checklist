# validate

Validate TODO.md structure and formatting.

## Synopsis

```bash
pcheck validate [file] [options]
```

## Options

- `--fix` - Automatically fix formatting issues
- `-j, --json` - Output validation results as JSON

## Examples

```bash
# Validate current TODO.md
pcheck validate

# Validate specific file
pcheck validate ./src/TODO.md

# Auto-fix issues
pcheck validate --fix

# Get JSON report
pcheck validate --json
```

## Validation Rules

- File must start with `# TODO`
- Sections use `##` headings
- Tasks use `- [ ]` or `- [x]` format
- Consistent 2-space indentation
- Priority tags in brackets: `[P0]`, `[HIGH]`, `[1]`

## Common Issues Fixed

```markdown
❌ -[] Task        → ✅ - [ ] Task
❌ P1 Fix bug      → ✅ [P1] Fix bug
❌ 3 space indent  → ✅ 2 space indent
```

## Output

```
Validating ./TODO.md...
✗ Line 1: Missing # TODO header
✗ Line 5: Invalid checkbox format
✓ Line 12: Valid task
Found 2 issues
```