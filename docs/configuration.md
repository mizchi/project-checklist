# Configuration Guide

`pcheck` can be configured using a `pcheck.config.json` file in your project
root. This allows you to customize file scanning patterns, output formats, and
various other behaviors.

## Quick Start

Create a `pcheck.config.json` file in your project root:

```json
{
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK"]
  },
  "exclude": [
    "node_modules/**",
    "dist/**"
  ]
}
```

## Configuration File Location

By default, `pcheck` looks for `pcheck.config.json` in the current directory.
You can specify a different config file:

```bash
# Use custom config file
pcheck --config my-config.json

# Ignore config file
pcheck --no-config
```

## Full Configuration Example

```json
{
  "$schema": "./pcheck.schema.json",
  "include": [
    "**/*.md",
    "src/**/*",
    "tests/**/*",
    "docs/**/*.md"
  ],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "*.min.js",
    "*.bundle.js"
  ],
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK", "NOTE", "BUG"],
    "includeTests": false,
    "fileExtensions": ["js", "ts", "py", "rs", "go"]
  },
  "display": {
    "showLineNumbers": true,
    "showEmptyTodos": false,
    "groupByFile": true,
    "showSectionTitles": true,
    "maxDepth": 10
  },
  "output": {
    "format": "tree",
    "colors": true,
    "quiet": false
  },
  "search": {
    "engine": "auto",
    "parallel": true,
    "ignoreCase": false
  },
  "markdown": {
    "extensions": ["md", "mdx", "markdown"],
    "checklistOnly": true
  },
  "languages": {
    "typescript": {
      "detectTests": true,
      "testPatterns": ["Deno.test", "it(", "test("],
      "includeSkipped": true
    }
  }
}
```

## Configuration Options

### File Selection

#### `include` (array of strings)

Glob patterns for files to include in scanning. Default includes all Markdown
files.

```json
{
  "include": [
    "**/*.md",
    "src/**/*.ts",
    "docs/**/*"
  ]
}
```

#### `exclude` (array of strings)

Glob patterns for files to exclude from scanning. Default excludes common build
directories and dependencies.

```json
{
  "exclude": [
    "node_modules/**",
    "dist/**",
    ".git/**",
    "*.min.js"
  ]
}
```

### Code Scanning

#### `code` (object)

Settings for scanning code files for TODO comments.

```json
{
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK", "NOTE"],
    "includeTests": false,
    "fileExtensions": ["js", "ts", "py", "rs"]
  }
}
```

- `enabled`: Enable/disable code scanning (default: `false`)
- `patterns`: Comment patterns to search for (default: common patterns)
- `includeTests`: Include test files when scanning (default: `false`)
- `fileExtensions`: File extensions to scan (default: common programming
  languages)

### Display Options

#### `display` (object)

Control how results are displayed.

```json
{
  "display": {
    "showLineNumbers": true,
    "showEmptyTodos": false,
    "groupByFile": true,
    "showSectionTitles": true,
    "maxDepth": 5
  }
}
```

- `showLineNumbers`: Show line numbers in output
- `showEmptyTodos`: Show TODO items without descriptions
- `groupByFile`: Group results by file
- `showSectionTitles`: Display Markdown section headers
- `maxDepth`: Maximum nesting depth to display

### Output Format

#### `output` (object)

Configure output format and behavior.

```json
{
  "output": {
    "format": "tree",
    "colors": true,
    "quiet": false
  }
}
```

- `format`: Output format - `"tree"`, `"flat"`, or `"json"`
- `colors`: Enable colored output
- `quiet`: Suppress non-essential output

### Search Engine

#### `search` (object)

Configure which search engine to use.

```json
{
  "search": {
    "engine": "auto",
    "parallel": true,
    "ignoreCase": false
  }
}
```

- `engine`: Search engine - `"auto"`, `"rg"`, `"git-grep"`, `"grep"`, or
  `"native"`
- `parallel`: Enable parallel search
- `ignoreCase`: Case-insensitive search

### Language-Specific Features

#### `languages` (object)

Configure language-specific features.

```json
{
  "languages": {
    "typescript": {
      "detectTests": true,
      "testPatterns": ["Deno.test", "it(", "test("],
      "includeSkipped": true
    }
  }
}
```

## CLI Options Override

CLI options take precedence over config file settings:

```bash
# Override code.enabled
pcheck --code

# Override output.format
pcheck --json

# Override search.engine
pcheck --engine rg
```

## Schema Validation

Use the JSON schema for IDE autocomplete and validation:

```json
{
  "$schema": "./pcheck.schema.json"
  // Your configuration...
}
```

## Migration from Legacy Options

If you're using legacy configuration options, here's how to migrate:

| Legacy Option  | New Option      |
| -------------- | --------------- |
| `ignore`       | `exclude`       |
| `todoPatterns` | `code.patterns` |
| `searchEngine` | `search.engine` |

## Environment-Specific Configurations

You can use different configurations for different environments:

```bash
# Development
pcheck --config pcheck.dev.json

# CI/CD
pcheck --config pcheck.ci.json

# Production audit
pcheck --config pcheck.prod.json
```

## Best Practices

1. **Start Simple**: Begin with minimal configuration and add options as needed
2. **Use Exclude Patterns**: Exclude generated files and dependencies to improve
   performance
3. **Language-Specific Extensions**: Only include relevant file extensions for
   code scanning
4. **Version Control**: Commit your `pcheck.config.json` to share settings with
   your team
5. **Use Schema**: Add `$schema` for better IDE support

## Troubleshooting

### Config file not loading

- Ensure the file is named exactly `pcheck.config.json`
- Check that the JSON is valid (no trailing commas, proper quotes)
- Use `--config` to specify the path explicitly

### Patterns not working

- Glob patterns use forward slashes even on Windows
- Use `**` for recursive matching
- Test patterns with `--verbose` flag

### Performance issues

- Reduce `include` patterns to specific directories
- Add more `exclude` patterns for large directories
- Disable `parallel` search if having issues
- Use faster search engines (ripgrep > git-grep > grep)
