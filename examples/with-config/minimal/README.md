# Minimal Configuration Example

This example shows a minimal pcheck configuration that:

- Excludes common directories (node_modules, dist, build, .git)
- Disables code scanning by default
- Uses all other default settings

## Configuration

```json
{
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**"
  ],
  "code": {
    "enabled": false
  }
}
```

## Usage

```bash
# Scan TODO.md files only
pcheck

# Enable code scanning temporarily
pcheck --code
```
