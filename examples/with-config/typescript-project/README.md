# TypeScript Project Configuration Example

This example demonstrates a comprehensive configuration for TypeScript projects with:

- Code scanning enabled for TypeScript and JavaScript files
- Test file exclusion (*.test.ts, *.spec.ts)
- TypeScript-specific test detection
- Colored tree output with line numbers

## Features

- **Include patterns**: Scans markdown files and TypeScript source files
- **Exclude patterns**: Ignores test files, build outputs, and dependencies
- **Code patterns**: Detects TODO, FIXME, HACK, NOTE, BUG, and OPTIMIZE comments
- **Language support**: Special handling for TypeScript test patterns

## Project Structure

```
typescript-project/
├── pcheck.config.json
├── TODO.md
├── src/
│   └── app.ts        # Contains various TODO patterns
└── tests/
    └── app.test.ts   # Test files (excluded by default)
```

## Usage

```bash
# Scan both TODO.md and code files
pcheck

# Include test files temporarily
pcheck --cases

# Disable code scanning
pcheck --no-code

# Use JSON output
pcheck --json
```

## Configuration Highlights

```json
{
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK", "NOTE", "BUG", "OPTIMIZE"],
    "includeTests": false
  },
  "languages": {
    "typescript": {
      "detectTests": true,
      "testPatterns": ["describe(", "it(", "test(", "expect("]
    }
  }
}
```