# scan

Default command to scan and display TODO items.

## Synopsis

```bash
pcheck [path] [options]
```

## Options

- `--code` - Include TODO comments from source code
- `--no-files` - Skip TODO.md and README.md files
- `--exclude <patterns>` - Exclude file patterns
- `--engine <name>` - Search engine: `rg` (default), `git-grep`, `grep`,
  `native`
- `-u, --unchecked` - Show only unchecked items
- `--show-ids` - Display task IDs
- `-j, --json` - Output in JSON format
- `-g, --gitroot` - Search from git repository root

## Examples

```bash
pcheck                    # Scan current directory
pcheck ./src              # Scan specific directory
pcheck --code             # Include code TODOs
pcheck -u                 # Only unchecked items
pcheck --exclude "test/**" # Exclude patterns
pcheck --json             # JSON output
```

## Output

```
project-checklist/
├─ README.md (3 items)
│  ├─ ✓ Initial setup
│  ├─ ○ Add documentation
│  └─ ○ Write tests
└─ src/TODO.md (2 items)
   ├─ ○ Refactor main function
   └─ ○ Add error handling
```
