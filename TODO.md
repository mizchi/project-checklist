# Project TODO List

## TODO

### Core Features
- [ ] Create MCP (Model Context Protocol) server integration
- [ ] Add progress indicators for large directories
- [ ] Implement caching for better performance
- [ ] Support for custom ignore patterns via .pcheckignore file

### Documentation & Examples
- [ ] Add comprehensive API documentation
- [ ] Create example projects showcasing different use cases
- [ ] Add performance benchmarking examples
- [ ] Document best practices for AI integration

### Distribution & Packaging
- [ ] Publish to npm using @deno/dnt
- [ ] Create GitHub Action for automated releases
- [ ] Set up JSR (JavaScript Registry) publishing

### Future Enhancements
- [ ] Add support for more task formats (e.g., GitHub Issues, Jira)
- [ ] Implement task dependencies and relationships
- [ ] Create web-based dashboard for task visualization
- [ ] Add support for task priorities across different formats

## ICEBOX

- [ ] Create VS Code extension
- [ ] Add support for task time tracking
- [ ] Implement task analytics and reporting
- [ ] Create mobile app for task management
- [ ] Add support for team collaboration features

## COMPLETED

### v0.3.1 (2024-12-19)
- [x] Add pcheck merge command for consolidating TODO.md files
- [x] Enhance CLI help system with command-specific documentation
- [x] Add interactive file selection using $.multiSelect
- [x] Fix priority tag duplication in merged content

### v0.3.0
- [x] Implement pcheck validate command for Markdown checklist validation
- [x] Add configuration file support (pcheck.config.json)
- [x] Implement pcheck init command for project setup
- [x] Add pcheck update command with --vacuum option
- [x] Support --exclude patterns for file filtering
- [x] Add pcheck add command for adding tasks via CLI
- [x] Implement pcheck sort command for priority-based sorting
- [x] Add pcheck test command for finding test cases

### v0.2.0
- [x] Add interactive mode with --interactive flag
- [x] Implement task toggle with check <id> command
- [x] Add --private flag for personal TODO management (~/.todo)
- [x] Support multiple search engines (ripgrep, git grep, grep, native)
- [x] Add doctor command for environment diagnostics
- [x] Create tree display for hierarchical TODO visualization
- [x] Implement JSON output format (--json flag)

### v0.1.0
- [x] Display section titles (## headers) alongside TODO items
- [x] Fix README.md to only show checklist items
- [x] Implement file-expander with .gitignore support
- [x] Create ripgrep-based checklist-finder
- [x] Add support for multiple TODO formats (FIXME, HACK, NOTE, etc.)
- [x] Remove package.json and migrate to pure Deno
- [x] Fix all TypeScript type errors