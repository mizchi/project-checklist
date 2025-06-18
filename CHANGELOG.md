# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-01-18

### Fixed

- Only detect checklist items (`- [ ]` or `- [x]`), not all Markdown list items
- Fix TypeScript type errors between TodoItem and LegacyTodoItem
- Update all tests to pass with proper permissions
- Add missing `@std/cli` to import map

### Changed

- Remove package.json and migrate to pure Deno project
- Update tests to use checklist format
- Clean up duplicate test cases

### Added

- File expander utility with .gitignore support
- Ripgrep-based checklist finder
- CLAUDE usage guides in Japanese and English
- Display section titles (## headers) alongside TODO items

## [0.1.0] - 2025-01-17

### Initial Release

- Basic TODO scanning functionality
- Support for multiple search engines (ripgrep, git grep, grep, native)
- Tree display for hierarchical TODO visualization
- Doctor command for environment diagnostics
- Interactive mode and task selection
- JSON output format
- Validate command for Markdown checklist validation
