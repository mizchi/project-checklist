# TODO

- [ ] Support for custom ignore patterns
- [ ] Add progress indicators for large directories
- [ ] Implement caching for better performance

## ICEBOX

## COMPLETED

- Implement `pcheck validate` command for Markdown checklist structure
  validation
  - Type definitions (types/validation.ts)
  - Validation engine (core/validation-engine.ts)
  - Indent validator (core/validators/indent-validator.ts)
  - Parent-child validator (core/validators/parent-child-validator.ts)
  - Format validator (core/validators/format-validator.ts)
  - Section validator (core/validators/section-validator.ts)
  - Output formatter (core/output-formatter.ts)
  - CLI command handler (cli/commands/validate.ts)
  - CLI integration and help text
  - Integration tests
- --interactive でインタラクティブな shell で操作できる
- --select
  で対応する人間がインタラクティブにタスクを選択すると、それを実行して返す。AI
  との対話用
- --select-multiple で、上記の複数版
- 内部的に ID を振って、 `check <id> <--on:default> <--off>`
  でそれをトグル出来る
- --private を指定した場合、 `~/.todo/TODO.md` を初期化する

- ~~Add support for more TODO formats (e.g., FIXME, HACK, NOTE)~~ ✅
- Implement JSON output format
- Add filtering options (by file type, directory)
- Create MCP server integration
