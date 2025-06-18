# project-checklist

A fast CLI tool to recursively find and display TODOs in your project, built
with Deno.

## Installation

```bash
deno install -Afg --name pcheck jsr:@mizchi/project-checklist/cli
```

## Features

- 🔍 Recursively scans for `TODO.md` files (default)
- 🎯 Configurable file and code scanning
- ⚡ Supports ripgrep (default), git grep, grep, and native Deno search
- 🩺 Built-in diagnostics with `pcheck doctor`
- 🧪 TypeScript test case detection with `pcheck test` (requires ast-grep)

## Usage

Add checklist on your `README.md` or put your `TODO.md`.

```markdown
- [ ] Add feature of A
- [x] B
```

```bash
# Run diagnostics to check your environment
$ pcheck doctor
Tools:
  ✅ ripgrep (rg)
  ✅ git grep
  ✅ grep
  ✅ deno

Optional (for test cases):
  ✅ ast-grep

Git:
  ✅ root: /home/user/projects/myproject

# Scan current directory
$ pcheck

└── TODO.md
    ├── [ ] Support for custom ignore patterns
    ├── [ ] Add progress indicators for large directories
    └── [ ] Implement caching for better performance

└── README.md
    ├── [ ] Add feature of A
    └── [x] B

└── tmp/test-check-command/TODO.md
    ├── [ ] Task 1
    └── [ ] Task 2

└── tmp/test-check-command/README.md
    ├── [ ] README task 1
    └── [ ] README task 2
```

## Roadmap

See [TODO.md](./TODO.md) for planned features and improvements.

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Author

**mizchi** - [GitHub](https://github.com/mizchi)

## Acknowledgments

Built with [Deno](https://deno.land/) and the amazing Deno standard library.
