# Python Project Configuration Example

This example demonstrates pcheck configuration for Python projects.

## Features

- **Python-specific patterns**: Includes .py, .pyx, .pyw files
- **Virtual environment exclusion**: Ignores venv, env, .venv directories
- **Python build artifacts**: Excludes **pycache**, *.pyc, dist, build
- **Notebook support**: Can include Jupyter notebooks
- **Documentation formats**: Supports both .md and .rst files

## Configuration

```json
{
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK", "NOTE", "XXX", "BUG"],
    "fileExtensions": ["py", "pyx", "pyw"]
  },
  "exclude": [
    "__pycache__/**",
    "venv/**",
    "*.egg-info/**"
  ]
}
```

## Usage

```bash
# Scan Python project
pcheck

# Include test files
pcheck --cases

# Scan specific module
pcheck src/

# Output as JSON for processing
pcheck --json
```
