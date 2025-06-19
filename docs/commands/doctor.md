# doctor

Check environment and available search engines.

## Synopsis

```bash
pcheck doctor
```

## Examples

```bash
# Run environment check
pcheck doctor

# Get JSON output
pcheck doctor --json
```

## Output

```
Environment Check
================

Search Engines:
✓ ripgrep (rg)     - Available (fastest)
✓ git grep         - Available
✓ grep             - Available
✓ native           - Available (fallback)

Performance Test:
- ripgrep:   12ms  ████████████ (fastest)
- git grep:  45ms  ████
- grep:      89ms  ██
- native:    156ms █

Recommendation: Using 'rg' (ripgrep) for best performance
```

## Search Engines

- **ripgrep (rg)** - Fastest, recommended. Install: `brew install ripgrep`
- **git grep** - Works in git repos only
- **grep** - Standard Unix tool
- **native** - Always available, slowest