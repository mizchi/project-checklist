export function showCommandHelp(command: string): void {
  switch (command) {
    case "init":
      console.log(`pcheck init - Initialize TODO.md and configuration

USAGE:
  pcheck init [directory] [options]

OPTIONS:
  --force           Overwrite existing TODO.md
  --template <name> Use template: default, gtd
  --skip-config     Don't create pcheck.config.json

EXAMPLES:
  pcheck init                  # Create TODO.md in current directory
  pcheck init ./my-project     # Initialize in specific directory
  pcheck init --template gtd   # Use Getting Things Done template
  pcheck init --force          # Overwrite existing files

DESCRIPTION:
  Creates a new TODO.md file with a standard structure. If README.md
  exists with checklists, offers to import them. Also prompts to create
  a pcheck.config.json for customizing scan behavior.
`);
      break;

    case "add":
      console.log(`pcheck add - Add a new task to TODO.md

USAGE:
  pcheck add [file] [section] -m <message> [options]

ARGUMENTS:
  file      TODO.md file path (default: ./TODO.md)
  section   Section name: TODO, ICEBOX, etc. (default: TODO)

OPTIONS:
  -m, --message <text>  Task description (required)
  -p, --priority <val>  Priority: high, mid, low, or 1-99

EXAMPLES:
  pcheck add -m "Fix login bug"
  pcheck add -m "Implement OAuth" -p high
  pcheck add ICEBOX -m "Future feature idea"
  pcheck add ~/todo/work.md -m "Review PR #123"

DESCRIPTION:
  Adds a new task to the specified section of TODO.md. Tasks are added
  at the end of the section. Use priority to control sort order when
  running 'pcheck sort'.
`);
      break;

    case "update":
    case "u":
      console.log(`pcheck update - Update and organize TODO.md

USAGE:
  pcheck update [file] [options]
  pcheck u [file] [options]      # Short alias

OPTIONS:
  --completed    Move completed tasks to COMPLETED section
  --priority     Sort tasks by priority within sections
  --code         Extract TODO/FIXME from code files
  --fix          Validate and fix formatting before update
  --vacuum       Remove completed tasks and output them

EXAMPLES:
  pcheck update                # Basic update
  pcheck u --completed         # Move done tasks
  pcheck u --priority          # Sort by priority
  pcheck u --vacuum            # Clean completed tasks for git commit
  pcheck u --code              # Import TODOs from source code

DESCRIPTION:
  Organizes TODO.md by moving completed tasks, sorting by priority,
  and optionally extracting TODO comments from code. The --vacuum
  option is especially useful before git commits to document what
  was completed.
`);
      break;

    case "check":
      console.log(`pcheck check - Toggle a checklist item

USAGE:
  pcheck check <id> [options]

ARGUMENTS:
  id        Task ID (shown with --show-ids)

OPTIONS:
  --off     Uncheck instead of toggle
  -g, --gitroot   Search from git root
  -p, --private   Search in ~/.todo

EXAMPLES:
  pcheck --show-ids            # First, find task IDs
  pcheck check ff5d5f83        # Toggle task
  pcheck check ff5d5f83 --off  # Explicitly uncheck

DESCRIPTION:
  Toggles the completion state of a specific task by its ID.
  Use 'pcheck --show-ids' to see task IDs, then check/uncheck
  tasks without opening the file.
`);
      break;

    case "merge":
      console.log(`pcheck merge - Merge TODO.md files from subdirectories

USAGE:
  pcheck merge [directory] [options]

OPTIONS:
  --all             Merge all files without prompting
  --dry-run         Preview changes without writing
  --preserve        Keep source files after merge
  --skip-empty      Skip files with no tasks
  --target <file>   Target file (default: ./TODO.md)

EXAMPLES:
  pcheck merge                 # Interactive selection
  pcheck merge --all           # Merge all TODO.md files
  pcheck merge --dry-run       # Preview the merge
  pcheck merge --preserve      # Keep original files
  pcheck merge --target PROJECT.md

DESCRIPTION:
  Finds all TODO.md files in subdirectories and merges them into
  a single file. Preserves task hierarchy, sections, and priorities.
  By default, shows an interactive menu to select which files to merge.
`);
      break;

    case "validate":
      console.log(`pcheck validate - Validate Markdown checklist structure

USAGE:
  pcheck validate [file] [options]

OPTIONS:
  --fix     Auto-fix formatting issues
  --json    Output results as JSON
  --config  Validate pcheck.config.json

EXAMPLES:
  pcheck validate              # Validate TODO.md
  pcheck validate README.md    # Validate specific file
  pcheck validate --fix        # Fix issues automatically
  pcheck validate pcheck.config.json

DESCRIPTION:
  Checks Markdown files for proper checklist structure, indentation,
  and formatting. Can automatically fix common issues like inconsistent
  indentation and missing empty lines between sections.
`);
      break;

    case "doctor":
      console.log(`pcheck doctor - Diagnose environment

USAGE:
  pcheck doctor

DESCRIPTION:
  Checks your environment for available search engines (ripgrep,
  git-grep, grep), validates configuration files, and shows what
  file patterns will be recognized. Useful for troubleshooting
  scan issues.

OUTPUT INCLUDES:
  - Available search engines and versions
  - Git repository status
  - Configuration file validation
  - Recognized file patterns
  - Excluded patterns
`);
      break;

    case "test":
      console.log(`pcheck test - Find test cases in TypeScript files

USAGE:
  pcheck test [path] [options]

OPTIONS:
  --include-all    Include all tests, not just skipped
  --json           Output as JSON
  --pretty         Pretty print JSON

EXAMPLES:
  pcheck test              # Find skipped tests
  pcheck test src/         # Scan specific directory
  pcheck test --json       # Machine-readable output

DESCRIPTION:
  Uses ast-grep to find test cases in TypeScript files. By default,
  only shows skipped tests (test.skip, it.skip, etc.). Requires
  ast-grep to be installed.
`);
      break;

    case "sort":
      console.log(`pcheck sort - Sort tasks by priority

USAGE:
  pcheck sort [file]

EXAMPLES:
  pcheck sort              # Sort TODO.md
  pcheck sort ~/TODO.md    # Sort specific file

DESCRIPTION:
  Sorts tasks within each section by priority. Priority order:
  1. Numeric priorities (1-99, lower numbers first)
  2. HIGH priority
  3. MID/MEDIUM priority
  4. LOW priority
  5. No priority
`);
      break;

    case "code-checklist":
      console.log(`pcheck code-checklist - Find checklists in code comments

USAGE:
  pcheck code-checklist [path] [options]

OPTIONS:
  --stats            Show statistics only
  --group-by-file    Group results by file
  --checked          Show only checked items
  --unchecked        Show only unchecked items
  --patterns <list>  Custom patterns to search

EXAMPLES:
  pcheck code-checklist
  pcheck code-checklist --stats
  pcheck code-checklist --group-by-file

DESCRIPTION:
  Searches for checklist items (- [ ], - [x]) within code comments.
  Useful for tracking inline task lists in source code documentation
  or implementation notes.
`);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Run 'pcheck --help' for available commands`);
  }
}
