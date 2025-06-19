# Configuration

`pcheck` can be configured using a `pcheck.config.json` file in your project root.

## Configuration File

Create `pcheck.config.json`:

```json
{
  "searchEngine": "rg",
  "exclude": [
    "node_modules/**",
    "dist/**",
    ".git/**"
  ],
  "include": [
    "**/*.md",
    "**/*.ts",
    "**/*.js"
  ],
  "codePatterns": [
    "TODO",
    "FIXME",
    "HACK",
    "NOTE"
  ]
}
```

## Options

### searchEngine
- Type: `"rg" | "git-grep" | "grep" | "native"`
- Default: `"rg"` (if available)
- The search engine to use for finding files

### exclude
- Type: `string[]`
- Default: `["node_modules/**", ".git/**"]`
- Glob patterns for files/directories to exclude

### include
- Type: `string[]`
- Default: `["**/*.md", "**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]`
- Glob patterns for files to include when searching for code TODOs

### codePatterns
- Type: `string[]`
- Default: `["TODO", "FIXME", "HACK", "NOTE"]`
- Patterns to search for in code comments

## Examples

### Minimal Config

```json
{
  "searchEngine": "git-grep"
}
```

### Python Project

```json
{
  "include": ["**/*.py", "**/*.md"],
  "exclude": ["venv/**", "__pycache__/**"],
  "codePatterns": ["TODO", "FIXME", "XXX"]
}
```

### Monorepo

```json
{
  "exclude": [
    "**/node_modules/**",
    "**/dist/**",
    "packages/*/build/**"
  ]
}
```

## Command Line Override

Configuration can be overridden via command line:

```bash
# Use different engine
pcheck --engine grep

# Skip config file
pcheck --no-config

# Use custom config
pcheck --config ./custom-config.json
```