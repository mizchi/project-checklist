# project-checklist

An AI-friendly TODO management tool that helps you track and manage project
tasks through Markdown checklists.

Designed for seamless integration with AI assistants like Claude, ChatGPT, and
other LLMs to enhance project planning and task management workflows.

## AI Assistant Usage

When using `pcheck` with AI assistants (Claude, ChatGPT, etc.), use these
commands:

```bash
# Show all TODOs in the project
pcheck

# Update TODO.md - organize completed tasks into COMPLETED section
pcheck u

# Vacuum completed tasks - remove them and output for git commit
pcheck u --vacuum
```

## Installation

```bash
deno install -Afg --name pcheck jsr:@mizchi/project-checklist/cli
```

## Features

- 🤖 AI-friendly output format for easy parsing by LLMs
- 📋 Markdown checklist format (`- [ ]` and `- [x]`) for clear task tracking
- 💻 Code comment scanning for `TODO:`, `FIXME:`, and checklist items (`- [ ]`)
- 🌳 Hierarchical tree display with section context
- 🎯 Interactive selection mode for AI-assisted task management
- 🔍 Recursively scans TODO.md, README.md, and other Markdown files
- ⚡ Fast search with multiple engine support (ripgrep, git grep, grep, native)
- 🏷️ Section titles display for better context understanding
- 📊 Progress tracking with completed/uncompleted task filtering
- 🩺 Built-in diagnostics with `pcheck doctor`
- 🧪 TypeScript test case detection with `pcheck test` (requires ast-grep)
- ✅ Validation and auto-fix for consistent formatting
- 🚀 Advanced task management with `update`, `init`, and `validate` commands

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
```

### AI Integration Examples

#### With Claude or ChatGPT

1. **Get project overview**:
   ```
   User: Show me the current TODO status of my project
   Assistant: Let me check your project's TODO items...
   $ pcheck
   [Shows hierarchical TODO list]
   ```

2. **Interactive task selection**:
   ```bash
   # Let AI select and work on specific tasks
   $ pcheck --select
   # or select multiple tasks
   $ pcheck --select-multiple
   ```

3. **Toggle task completion**:
   ```bash
   # Mark task as complete
   $ pcheck check abc123
   # Mark task as incomplete
   $ pcheck check abc123 --off
   ```

4. **Filter uncompleted tasks only**:
   ```bash
   $ pcheck --unchecked-only
   ```

5. **Scan code for TODO comments and checklists**:
   ```bash
   # Find TODO:, FIXME:, and checklist items in code
   $ pcheck --code

   # Include test files
   $ pcheck --code --cases
   ```

   Supports extracting tasks from code comments:
   - `// TODO: Fix this issue`
   - `// TODO(username): Assigned task`
   - `/* FIXME: Memory leak here */`
   - `# TODO: Refactor this function`
   - `// - [ ] Implement feature` (checklist in comments)
   - `// - [x] Completed task`

   Supported comment styles:
   - Single-line: `//`, `#`, `--`
   - Multi-line: `/* */`, `""" """`, `<!-- -->`
   - Language-specific: Python, JavaScript, TypeScript, Rust, Go, etc.

6. **Manage TODO.md files**:
   ```bash
   # Initialize a new TODO.md with GTD template
   $ pcheck init

   # Update TODO.md (move completed tasks, sort by priority)
   $ pcheck update --done --priority

   # Extract code checklists to TODO.md
   $ pcheck update --code

   # Validate and auto-fix formatting issues
   $ pcheck validate --fix
   $ pcheck update --fix  # Validate and fix before updating
   ```

## Configuration

`pcheck` can be configured using a `pcheck.config.json` file in your project
root:

```json
{
  "include": [
    "**/*.md",
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "*.min.js",
    "coverage/**"
  ],
  "code": {
    "enabled": true,
    "patterns": ["TODO", "FIXME", "HACK", "NOTE", "BUG", "OPTIMIZE"],
    "includeTests": false
  },
  "display": {
    "showLineNumbers": true,
    "showEmptyTodos": false,
    "groupByFile": true
  },
  "output": {
    "format": "tree",
    "colors": true
  }
}
```

### Configuration Options

- **`include`**: Array of glob patterns for files to scan
- **`exclude`**: Array of glob patterns for files to ignore
- **`code.enabled`**: Whether to scan code files for TODO comments
- **`code.patterns`**: Custom patterns to search for in code
- **`code.includeTests`**: Include test files when scanning code
- **`display.*`**: Display preferences
- **`output.format`**: Output format (`tree`, `flat`, `json`)

### Using Configuration

```bash
# Use default config file (pcheck.config.json)
$ pcheck

# Use custom config file
$ pcheck --config my-config.json

# Override config with CLI options
$ pcheck --code --no-config
```

## Why project-checklist?

Traditional TODO management tools often create friction in the development
workflow. `project-checklist` is designed to:

1. **Keep TODOs close to code** - Using Markdown files in your repository
2. **Enable AI collaboration** - Structured output that LLMs can easily parse
   and understand
3. **Maintain simplicity** - Just Markdown checklists, no complex syntax or
   external services
4. **Support modern workflows** - Interactive modes for AI-assisted development

## Documentation

- [CLAUDE Usage Guide (English)](./docs/prompt-example-en.md)
- [CLAUDE Usage Guide (日本語)](./docs/prompt-example-ja.md)
- [TODO.md](./TODO.md) - Project roadmap and planned features

## Document-Driven Testing

This project includes a document-driven testing framework that allows AI
assistants to understand and execute test cases written in natural language. The
framework has been generalized and is available in the `doc-driven-test/`
directory.

### Quick Start

```bash
# Run example test
./doc-driven-test/core/runner.sh doc-driven-test/examples/simple-web-server.md

# Run project-specific tests
./test/use-cases/run-test.sh
```

### Framework Features

- 📝 Natural language test descriptions in Markdown
- 🤖 AI-agent friendly execution protocol
- 🌍 Language-agnostic (supports any programming language)
- 🔄 Clean environment for each test run
- 📊 Detailed reporting and metrics

### Structure

```
doc-driven-test/
├── core/                  # Core framework scripts
├── templates/            # Language-specific templates
├── protocols/            # AI execution protocols
└── examples/             # Example test cases

test/use-cases/           # Project-specific tests
└── 01-create-initial-todo.md
```

See [doc-driven-test/README.md](./doc-driven-test/README.md) for detailed
documentation.

## AI Assistant Prompts

### For AI tools that don't know about `pcheck`

Copy and paste these instructions to your AI assistant:

```
pcheck is a TODO management tool installed in this project. Use these commands:

- `pcheck` - Show all TODO items in the project
- `pcheck u` - Update TODO.md by moving completed tasks to COMPLETED section  
- `pcheck u --vacuum` - Remove completed tasks and output them (for git commits)
- `pcheck --code` - Include TODO comments from source code
- `pcheck validate` - Check TODO.md formatting
- `pcheck add -m "Task description"` - Add a new task
- `pcheck check <id>` - Toggle a task by its ID

When I ask you to check or update tasks, use these commands.
```

### Example workflow for AI assistants

```bash
# 1. Check current tasks
pcheck

# 2. After completing tasks, update TODO.md
pcheck u

# 3. Before committing, vacuum completed tasks
pcheck u --vacuum
# Copy the output and include in git commit message

# 4. Find TODOs in code
pcheck --code
```

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Author

**mizchi** - [GitHub](https://github.com/mizchi)

## Acknowledgments

Built with [Deno](https://deno.land/) and the amazing Deno standard library.
