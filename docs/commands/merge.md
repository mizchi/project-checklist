# merge

Merge TODO.md files from subdirectories.

## Synopsis

```bash
pcheck merge [path] [options]
```

## Options

### Merge Options

- `--target <file>` - Target file to merge into (default: `./TODO.md`)
- `--all` - Merge all files without interactive selection
- `--preserve` - Keep source files after merging
- `--skip-empty` - Skip files with no tasks

### Interactive Options

- Default behavior is interactive selection
- Use `--all` to skip interaction

### Output Options

- `--dry-run` - Preview merge without making changes
- `-j, --json` - Output merge plan as JSON

## Examples

```bash
# Interactive merge
pcheck merge

# Merge all TODO.md files
pcheck merge --all

# Merge to specific target
pcheck merge --target ./project-TODO.md

# Keep source files
pcheck merge --preserve

# Dry run to see what would be merged
pcheck merge --dry-run

# Merge from specific directory
pcheck merge ./src --all
```

## Interactive Selection

```
Found TODO.md files:
? Select files to merge (Space to select, Enter to confirm)
❯ ◯ src/TODO.md (5 tasks)
  ◯ tests/TODO.md (3 tasks)
  ◯ docs/TODO.md (2 tasks)
```

## Merge Result

```markdown
# TODO

## src/TODO.md

- [ ] Implement authentication
- [ ] Add error handling

## tests/TODO.md

- [ ] Write unit tests
```
