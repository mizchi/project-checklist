# init

Initialize TODO.md and configuration files.

## Synopsis

```bash
pcheck init [directory] [options]
```

## Options

- `--config` - Also create pcheck.config.json file
- `--force` - Overwrite existing files

## Examples

```bash
# Initialize in current directory
pcheck init

# Initialize in specific directory
pcheck init ./my-project

# Create with config file
pcheck init --config

# Force overwrite existing files
pcheck init --force
```

## Created Files

### TODO.md
```markdown
# TODO

## Tasks
- [ ] Initial project setup
- [ ] Add documentation
- [ ] Write tests

## Bugs
## Features
## COMPLETED
```

### pcheck.config.json (with --config)
```json
{
  "searchEngine": "rg",
  "exclude": ["node_modules/**", "dist/**"],
  "include": ["**/*.md", "**/*.ts", "**/*.js"]
}
```