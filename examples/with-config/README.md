# Configuration Examples

This directory contains various configuration examples for pcheck.

## Available Examples

1. **minimal** - Basic configuration with essential settings
2. **typescript-project** - Configuration for TypeScript projects
3. **monorepo** - Configuration for monorepo structures
4. **python-project** - Configuration for Python projects
5. **documentation-site** - Configuration for documentation projects

## Usage

Copy any of these configuration files to your project root as
`pcheck.config.json`:

```bash
# Copy minimal configuration
cp examples/with-config/minimal/pcheck.config.json ./

# Copy TypeScript project configuration
cp examples/with-config/typescript-project/pcheck.config.json ./
```

## Testing Examples

Each example directory contains a sample project structure with TODO.md files to
demonstrate how the configuration works:

```bash
# Test the TypeScript configuration
cd examples/with-config/typescript-project
pcheck

# Test with code scanning enabled
pcheck --code
```
