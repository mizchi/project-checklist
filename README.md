# pcheck

A fast CLI tool to recursively find and display TODOs in your project, built
with Deno.

## Features

- 🔍 Recursively scans for `TODO.md` files (default)
- 💬 Finds TODO comments in source code (use `--code` flag)
- 🌲 Displays results in a tree structure
- 🚀 Fast and lightweight with multiple search engine support
- 🎯 Configurable file and code scanning
- ⚡ Supports ripgrep (default), git grep, grep, and native Deno search
- 🩺 Built-in diagnostics with `pcheck doctor`
- 🧪 TypeScript test case detection with `pcheck test` (requires ast-grep)

## Installation

### Using Deno

```bash
# Install globally
deno install -Afg --name pcheck https://deno.land/x/pcheck/src/cli.ts

# Or from JSR
deno install -Afg --name pcheck jsr:@mizchi/pcheck/cli
```

### Using npm (coming soon)

```bash
npm install -g @mizchi/pcheck
```

### From source

```bash
# Clone the repository
git clone https://github.com/mizchi/pcheck.git
cd pcheck

# Install globally
deno task compile
sudo mv pcheck /usr/local/bin/
```

## Usage

```bash
# Scan current directory (only TODO.md files by default)
pcheck

# Scan specific directory
pcheck ./src

# Include TODO comments in source code
pcheck --code

# Only scan code files (skip TODO.md)
pcheck --no-files

# Show help
pcheck --help

# Show version
pcheck --version

# Use specific search engine
pcheck --engine rg            # Use ripgrep (fastest)
pcheck --engine git-grep      # Use git grep (in git repos)
pcheck --engine grep          # Use standard grep
pcheck --engine native        # Use native Deno implementation

# List available search engines
pcheck --list-engines

# Run diagnostics to check your environment
pcheck doctor
```

### Doctor Command

The `pcheck doctor` command checks your environment and displays the availability of search tools:

```bash
$ pcheck doctor

pcheck doctor

Tools:
  ✅ ripgrep (rg)
  ✅ git grep
  ✅ grep
  ✅ deno

Optional (for test cases):
  ✅ ast-grep

Git:
  ✅ root: /home/user/projects/myproject
```

This command helps you:
- Check which search engines are available on your system
- Verify if you're in a Git repository and see the detected Git root
- See if optional tools like ast-grep are installed for advanced features

## Example Output

```
Found TODOs:

📄 TODO.md
  • Add support for more TODO formats (e.g., FIXME, HACK, NOTE)
  • Implement JSON output format
  • Add configuration file support (.pcheck.json)

📝 src/app.ts:42
   Implement error handling

📝 src/utils.ts:15
   Refactor this function
```

## Supported File Types

### TODO Files

- `TODO.md` (case-insensitive)

### Code Files

- TypeScript/JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`
- Python: `.py`
- Go: `.go`
- Rust: `.rs`
- Java: `.java`
- C/C++: `.c`, `.cpp`, `.h`, `.hpp`

## TODO Comment Formats

The tool recognizes the following patterns:

- `// TODO: description`
- `// TODO description`
- `# TODO: description` (for Python)
- `/* TODO: description */`

## Ignored Directories

The following directories are automatically skipped:

- `node_modules`
- `.git`
- `dist`
- `build`
- `coverage`
- `.next`
- `.nuxt`

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.x or later

### Setup

```bash
# Clone the repository
git clone https://github.com/mizchi/pcheck.git
cd pcheck

# Run in development mode
deno task dev

# Run tests
deno task test

# Run linting and formatting
deno task check
```

### Project Structure

```
pcheck/
├── src/
│   ├── cli.ts       # CLI entry point
│   ├── mod.ts       # Core functionality
│   └── mod.test.ts  # Tests
├── deno.jsonc       # Deno configuration
├── package.json     # npm package configuration
├── README.md        # This file
└── TODO.md          # Project TODOs
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

See [TODO.md](./TODO.md) for planned features and improvements.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Author

**mizchi** - [GitHub](https://github.com/mizchi)

## Acknowledgments

Built with [Deno](https://deno.land/) and the amazing Deno standard library.
