# project-checklist

An AI-friendly TODO management tool that helps you track and manage project
tasks through Markdown checklists.

Designed for seamless integration with AI assistants like Claude, ChatGPT, and
other LLMs to enhance project planning and task management workflows.

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

   Supports patterns like:
   - `// TODO: Fix this issue`
   - `// TODO(username): Assigned task`
   - `// - [ ] Implement feature`
   - `// - [x] Completed task`

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

## License

MIT License - see the [LICENSE](LICENSE) file for details

## Author

**mizchi** - [GitHub](https://github.com/mizchi)

## Acknowledgments

Built with [Deno](https://deno.land/) and the amazing Deno standard library.
