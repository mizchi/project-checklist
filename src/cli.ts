#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run
import { parseArgs } from "node:util";
import { findTodos, findTodosInFile, LegacyTodoItem } from "./mod.ts";
import { detectBestEngine, getEngineByName } from "./search/mod.ts";
import {
  convertTodoToTreeNode,
  displayTree,
  type TreeDisplayOptions,
} from "./cli/tree-display.ts";

const VERSION = "0.3.2";

function printHelp() {
  console.log(
    `pcheck v${VERSION} - AI-friendly TODO management for modern projects

USAGE:
  pcheck [options] [path]              # Scan for TODOs
  pcheck <command> [args] [options]    # Run a specific command

COMMANDS:
  Scanning & Display:
    pcheck [path]              Show all TODO items in project
    pcheck --code              Include TODO comments from source code
    pcheck --list-files        List files that would be scanned
    pcheck doctor              Check environment and search engines
    
  Task Management:
    add [file] [type] -m MSG   Add a new task to TODO.md
    check <id>                 Toggle a task by its ID
    update/u [file]            Update TODO.md (organize completed tasks)
    sort [file]                Sort tasks by priority
    merge [path]               Merge TODO.md files from subdirectories
    
  Validation & Testing:
    validate [file]            Check TODO.md structure and formatting
    test [path]                Find test cases in TypeScript files
    code-checklist             Find checklist items in code comments
    
  Project Setup:
    init [directory]           Create TODO.md and optionally pcheck.config.json

COMMON OPTIONS:
  -h, --help          Show this help message
  -v, --version       Show version
  -j, --json          Output in JSON format
  --no-config         Skip loading pcheck.config.json
  --config <path>     Use custom config file (default: ./pcheck.config.json)

SCANNING OPTIONS:
  --code              Include TODO comments from source code
  --no-files          Skip TODO.md and README.md files
  --list-files        List files that would be scanned
  --exclude <pats>    Exclude patterns (e.g., "test/**,*.min.js")
  --engine <name>     Search engine: rg, git-grep, grep, native

DISPLAY OPTIONS:
  -u, --unchecked     Show only unchecked items
  --show-ids          Show internal IDs for checklist items
  -n, --max-items <n> Max items per level
  -d, --max-depth <n> Max nesting depth
  --pretty            Pretty print JSON output

LOCATION OPTIONS:
  --root <path>       Use specified root directory for scanning
  -g, --gitroot       Search from git repository root
  -p, --private       Search from ~/.todo directory

COMMAND-SPECIFIC OPTIONS:
  init:
    --force           Overwrite existing TODO.md
    --template <name> Use template: default, gtd
    --skip-config     Don't create pcheck.config.json
    
  add:
    -m, --message     Task description (required)
    -p, --priority    Priority: high, mid, low, or 1-99
    
  update/u:
    --completed       Move completed tasks to COMPLETED section
    --priority        Sort tasks by priority
    --code            Extract TODOs from code to TODO.md
    --fix             Validate and fix formatting before update
    --vacuum          Remove completed tasks and output them
    
  check:
    --off             Uncheck instead of toggle
    
  validate:
    --fix             Auto-fix formatting issues
    --json            Output validation results as JSON
    
  merge:
    --all             Merge all files non-interactively
    --dry-run         Preview without making changes
    --preserve        Keep source files after merge
    --skip-empty      Skip files with no tasks
    --target <file>   Merge into specific file
    
  test:
    --include-all     Include all tests, not just skipped
    --json            Output as JSON
    
  code-checklist:
    --stats           Show statistics
    --group-by-file   Group results by file
    --patterns <pats> Custom patterns (e.g., "CHECKLIST,TASK")

EXAMPLES:
  Basic Usage:
    pcheck                    # Show all TODOs in current directory
    pcheck ./src              # Scan specific directory
    pcheck --code             # Include TODO comments from code
    pcheck --unchecked        # Show only incomplete tasks
    
  Task Management:
    pcheck add -m "Fix login bug" -p high
    pcheck check ff5d5f83     # Toggle task by ID
    pcheck update             # Organize completed tasks
    pcheck update --vacuum    # Remove completed tasks (for git commits)
    
  Project Setup:
    pcheck init               # Create TODO.md
    pcheck init --template gtd --force
    pcheck merge --all        # Merge all TODO.md files
    
  AI Assistant Workflow:
    pcheck                    # 1. Show current tasks
    pcheck u                  # 2. Update after completing tasks
    pcheck u --vacuum         # 3. Clean up for git commit
    
  Advanced:
    pcheck --gitroot --code   # Scan entire git repo including code
    pcheck validate --fix     # Fix TODO.md formatting
    pcheck test --json        # Find skipped tests as JSON
    pcheck merge --dry-run    # Preview merge operation

For more info: https://github.com/mizchi/project-checklist
`,
  );
}

if (import.meta.main) {
  // Check for command-specific help
  if (
    Deno.args.length >= 2 &&
    (Deno.args[1] === "--help" || Deno.args[1] === "-h")
  ) {
    const { showCommandHelp } = await import("./cli/help.ts");
    showCommandHelp(Deno.args[0]);
    Deno.exit(0);
  }

  // Check if it's init command
  if (Deno.args[0] === "init") {
    const { runInitCommand } = await import("./init-command.ts");
    const { values, positionals } = parseArgs({
      args: Deno.args.slice(1),
      options: {
        force: { type: "boolean", short: "f" },
        "skip-config": { type: "boolean" },
        template: { type: "string", short: "t" },
      },
      strict: false,
      allowPositionals: true,
    });

    const directory = positionals[0]?.toString() || ".";
    await runInitCommand(directory, {
      force: values.force as boolean,
      template: values.template as string,
      skipConfig: values["skip-config"] as boolean,
    });
    Deno.exit(0);
  }

  // Check if it's doctor command
  if (Deno.args[0] === "doctor") {
    const { runDiagnostics } = await import("./doctor.ts");
    await runDiagnostics();
    Deno.exit(0);
  }

  // Check if it's validate command
  if (Deno.args[0] === "validate") {
    // Special case: validate config file
    if (Deno.args[1] === "--config" || Deno.args[1]?.endsWith(".json")) {
      const { validateConfigFile } = await import("./config-validator.ts");
      const configPath = Deno.args[1] === "--config"
        ? (Deno.args[2] || "./pcheck.config.json")
        : Deno.args[1];

      const result = await validateConfigFile(configPath);
      if (result.valid) {
        console.log(`✓ Configuration file is valid: ${configPath}`);
      } else {
        console.log(`✗ Configuration file has errors: ${configPath}`);
        for (const error of result.errors || []) {
          console.log(
            `  - ${error.path ? error.path + ": " : ""}${error.message}`,
          );
        }
        Deno.exit(1);
      }
      Deno.exit(0);
    }

    const { runValidateCommand } = await import("./cli/commands/validate.ts");
    await runValidateCommand(Deno.args.slice(1));
    Deno.exit(0);
  }

  // Check if it's check command
  if (Deno.args[0] === "check") {
    const itemId = Deno.args[1];
    if (!itemId) {
      console.error("Error: Item ID is required for check command");
      console.error("Usage: pcheck check <id>");
      Deno.exit(1);
    }

    const { runCheckCommand } = await import("./check-command.ts");
    const { values } = parseArgs({
      args: Deno.args.slice(2),
      options: {
        off: { type: "boolean" },
        gitroot: { type: "boolean", short: "g" },
        private: { type: "boolean", short: "p" },
      },
      strict: false,
      allowPositionals: true,
    });
    await runCheckCommand(itemId, {
      off: values.off as boolean,
      gitroot: values.gitroot as boolean,
      private: values.private as boolean,
    });
    Deno.exit(0);
  }

  // Check if it's sort command
  if (Deno.args[0] === "sort") {
    const { runSortCommand } = await import("./sort-command.ts");
    let filePath = "TODO.md"; // Default to TODO.md

    // Check if file path is provided
    if (Deno.args.length > 1 && !Deno.args[1].startsWith("-")) {
      filePath = Deno.args[1];
    }

    await runSortCommand(filePath);
    Deno.exit(0);
  }

  // Check if it's update command (or alias 'u')
  if (Deno.args[0] === "update" || Deno.args[0] === "u") {
    const { runUpdateCommand } = await import("./update-command.ts");
    let filePath = "TODO.md"; // Default to TODO.md
    let argsToUse = Deno.args.slice(1);

    // Check if file path is provided
    if (argsToUse.length > 0 && !argsToUse[0].startsWith("-")) {
      filePath = argsToUse[0];
      argsToUse = argsToUse.slice(1);
    }

    const { values } = parseArgs({
      args: argsToUse,
      options: {
        sort: { type: "boolean", short: "s" },
        completed: { type: "boolean" },
        done: { type: "boolean", short: "d" }, // Alias for completed
        priority: { type: "boolean", short: "p" },
        code: { type: "boolean" },
        fix: { type: "boolean" },
        "skip-validation": { type: "boolean" },
        vacuum: { type: "boolean" },
        "force-clear": { type: "boolean" },
      },
      strict: false,
      allowPositionals: true,
    });

    // Map 'done' to 'completed' for backward compatibility
    const updateOptions = {
      sort: values.sort as boolean,
      completed: (values.completed || values.done) as boolean,
      priority: values.priority as boolean,
      code: values.code as boolean,
      fix: values.fix as boolean,
      skipValidation: values["skip-validation"] as boolean,
      vacuum: values.vacuum as boolean,
      forceClear: values["force-clear"] as boolean,
    };
    await runUpdateCommand(filePath, updateOptions);
    Deno.exit(0);
  }

  // Check if it's test command
  if (Deno.args[0] === "test") {
    const { runTestCommand } = await import("./test-command.ts");
    const targetPath = Deno.args[1] || ".";

    const { values } = parseArgs({
      args: Deno.args.slice(2),
      options: {
        json: { type: "boolean" },
        pretty: { type: "boolean" },
        "include-all": { type: "boolean" },
        "filter-dir": { type: "string" },
        "exclude-dir": { type: "string" },
      },
      strict: false,
      allowPositionals: true,
    });

    await runTestCommand({
      path: targetPath,
      includeSkipped: !values["include-all"],
      json: values.json as boolean,
      pretty: values.pretty as boolean,
      filterDir: values["filter-dir"] as string,
      excludeDir: values["exclude-dir"] as string,
    });
    Deno.exit(0);
  }

  // Check if it's code-checklist command
  if (Deno.args[0] === "code-checklist") {
    const { runCodeChecklistCommand } = await import(
      "./cli/commands/code-checklists.ts"
    );
    const { values, positionals } = parseArgs({
      args: Deno.args.slice(1),
      options: {
        stats: { type: "boolean", short: "s" },
        "group-by-file": { type: "boolean", short: "g" },
        checked: { type: "boolean", short: "c" },
        unchecked: { type: "boolean", short: "u" },
        patterns: { type: "string" },
      },
      strict: false,
      allowPositionals: true,
    });

    const targetPath = positionals[0]?.toString() || ".";

    await runCodeChecklistCommand({
      path: targetPath,
      stats: values.stats as boolean,
      "group-by-file": values["group-by-file"] as boolean,
      checked: values.checked as boolean,
      unchecked: values.unchecked as boolean,
      patterns: values.patterns ? (values.patterns as string).split(",") : undefined,
    });
    Deno.exit(0);
  }

  // Check if it's merge command
  if (Deno.args[0] === "merge") {
    const { runMergeCommand } = await import("./merge-command.ts");
    const { values, positionals } = parseArgs({
      args: Deno.args.slice(1),
      options: {
        "dry-run": { type: "boolean", short: "d" },
        preserve: { type: "boolean", short: "p" },
        "skip-empty": { type: "boolean" },
        all: { type: "boolean", short: "a" },
        target: { type: "string", short: "t" },
      },
      strict: false,
      allowPositionals: true,
    });

    const targetPath = positionals[0]?.toString() || ".";

    await runMergeCommand(targetPath, {
      targetFile: values.target as string,
      dryRun: values["dry-run"] as boolean,
      preserveSource: values.preserve as boolean,
      skipEmpty: values["skip-empty"] as boolean,
      interactive: !values.all, // If --all is specified, run non-interactively
    });
    Deno.exit(0);
  }

  // Check if it's add command
  if (Deno.args[0] === "add") {
    const { runAddCommand } = await import("./add-command.ts");
    let remainingArgs = Deno.args.slice(1);
    let filePath = "TODO.md"; // Default to TODO.md in current directory

    // Check if first arg is a file path (ends with .md or contains /)
    if (
      remainingArgs.length > 0 &&
      (remainingArgs[0].endsWith(".md") || remainingArgs[0].includes("/"))
    ) {
      filePath = remainingArgs[0];
      remainingArgs = remainingArgs.slice(1);
    }

    // Extract type if provided (not starting with -)
    let sectionType = "TODO";
    let argsStart = 0;
    if (remainingArgs.length > 0 && !remainingArgs[0].startsWith("-")) {
      sectionType = remainingArgs[0];
      argsStart = 1;
    }

    const { values } = parseArgs({
      args: remainingArgs.slice(argsStart),
      options: {
        message: { type: "string", short: "m" },
        priority: { type: "string", short: "p" },
      },
      strict: false,
      allowPositionals: true,
    });

    if (!values.message) {
      console.error("Error: Message is required for add command");
      console.error("Usage: pcheck add [file] [type] -m <message>");
      Deno.exit(1);
    }

    await runAddCommand(
      filePath,
      sectionType,
      values.message as string,
      values.priority as string,
    );
    Deno.exit(0);
  }

  const { values, positionals } = parseArgs({
    args: Deno.args,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      "no-files": { type: "boolean" },
      code: { type: "boolean" },
      cases: { type: "boolean" },
      "scan-tests": { type: "boolean" },
      "list-engines": { type: "boolean" },
      "list-files": { type: "boolean" },
      interactive: { type: "boolean", short: "i" },
      unchecked: { type: "boolean", short: "u" },
      "select-multiple": { type: "boolean", short: "m" },
      gitroot: { type: "boolean", short: "g" },
      private: { type: "boolean", short: "p" },
      "show-ids": { type: "boolean" },
      json: { type: "boolean", short: "j" },
      pretty: { type: "boolean" },
      "no-config": { type: "boolean" },
      debug: { type: "boolean" },
      engine: { type: "string" },
      select: { type: "string", short: "s" },
      fields: { type: "string" },
      "filter-type": { type: "string" },
      "filter-dir": { type: "string" },
      "exclude-dir": { type: "string" },
      exclude: { type: "string" },
      config: { type: "string" },
      "max-items": { type: "string", short: "n" },
      "max-depth": { type: "string", short: "d" },
      ignore: { type: "string" },
      root: { type: "string" },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    Deno.exit(0);
  }

  if (values.version) {
    console.log(`pcheck v${VERSION}`);
    Deno.exit(0);
  }

  // Quick reference card
  if (positionals.length >= 2 && positionals[0] === "help" && positionals[1] === "quick") {
    console.log(`pcheck Quick Reference Card

MOST COMMON:
  pcheck              # Show all TODOs
  pcheck u            # Update TODO.md
  pcheck u --vacuum   # Clean completed tasks

ADD TASKS:
  pcheck add -m "Task description"
  pcheck add -m "Bug fix" -p high
  pcheck add ICEBOX -m "Future idea"

CHECK TASKS:
  pcheck --show-ids   # Show task IDs
  pcheck check <id>   # Toggle task

SCAN OPTIONS:
  pcheck --code       # Include code TODOs
  pcheck --unchecked  # Only incomplete
  pcheck --json       # JSON output

LOCATIONS:
  pcheck ./src        # Specific directory
  pcheck --gitroot    # From git root
  pcheck --private    # From ~/.todo

CONFIG:
  pcheck init         # Create TODO.md
  pcheck doctor       # Check setup
  pcheck validate     # Check format
`);
    Deno.exit(0);
  }

  if (values["list-engines"]) {
    console.log("Available search engines:");
    const engines = ["rg (ripgrep)", "git-grep", "grep", "native (Deno)"];
    for (const engine of engines) {
      console.log(`  - ${engine}`);
    }
    Deno.exit(0);
  }

  // Determine target path based on options
  let targetPath = positionals[0]?.toString() || ".";

  // Check for conflicting location options
  const locationOptions = [values.root, values.gitroot, values.private].filter(Boolean);
  if (locationOptions.length > 1) {
    console.error(
      "Error: Cannot use multiple location options (--root, --gitroot, --private) together",
    );
    Deno.exit(1);
  }

  // Handle --root option first
  if (values.root) {
    targetPath = values.root as string;
  }

  if (values.gitroot) {
    // Find git root
    try {
      const command = new Deno.Command("git", {
        args: ["rev-parse", "--show-toplevel"],
        stdout: "piped",
        stderr: "null",
      });
      const { stdout, success } = await command.output();
      if (success) {
        targetPath = new TextDecoder().decode(stdout).trim();
      } else {
        console.error("Error: Not in a git repository");
        Deno.exit(1);
      }
    } catch {
      console.error("Error: Git command failed");
      Deno.exit(1);
    }
  } else if (values.private) {
    // Use ~/.todo directory
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      console.error("Error: HOME environment variable not set");
      Deno.exit(1);
    }
    targetPath = `${homeDir}/.todo`;

    // Create ~/.todo directory if it doesn't exist
    try {
      await Deno.mkdir(targetPath, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        console.error(`Error creating ~/.todo directory: ${error}`);
        Deno.exit(1);
      }
    }

    // Initialize TODO.md if it doesn't exist
    const todoPath = `${targetPath}/TODO.md`;
    try {
      await Deno.stat(todoPath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // Create initial TODO.md
        const initialContent = `# Personal TODO List

## Tasks
- [ ] Add your first task here

## Notes
- Created on ${new Date().toISOString().split("T")[0]}
- This is your personal TODO list in ~/.todo/TODO.md
`;
        await Deno.writeTextFile(todoPath, initialContent);
        console.log(`Created ${todoPath}`);
      }
    }
  }

  // Get search engine
  let searchEngine;
  if (values.engine) {
    searchEngine = await getEngineByName(values.engine as string);
    if (!searchEngine) {
      console.error(
        `Error: Search engine '${values.engine}' is not available or not found.`,
      );
      console.error("Run 'pcheck --list-engines' to see available engines.");
      Deno.exit(1);
    }
  } else {
    searchEngine = await detectBestEngine();
  }

  // Load config (from file or use defaults)
  let config;
  const { loadConfig, applyCliOptions, DEFAULT_CONFIG } = await import(
    "./config.ts"
  );

  // Skip config loading if --no-config is specified
  if (!values["no-config"]) {
    config = await loadConfig(values.config as string);
    // Apply CLI options to override config
    config = applyCliOptions(config, values);

    if (values.debug) {
      console.log("Loaded config:", JSON.stringify(config, null, 2));
    }
  } else {
    // Use default config but apply CLI options
    config = applyCliOptions(DEFAULT_CONFIG, values);

    if (values.debug) {
      console.log(
        "Using default config with CLI options:",
        JSON.stringify(config, null, 2),
      );
    }
  }

  // Check if ast-grep is available when scan-tests is requested
  if (values["scan-tests"]) {
    const { checkAstGrepInstalled } = await import("./ast-test-detector.ts");
    if (!(await checkAstGrepInstalled())) {
      console.error(
        "Error: ast-grep is not installed but is required for --scan-tests",
      );
      console.error(
        "Install it from: https://ast-grep.github.io/guide/quick-start.html",
      );
      console.error("Or run 'pcheck doctor' for more information");
      Deno.exit(1);
    }
  }

  const options = {
    scanFiles: !values["no-files"],
    scanCode: (values.code ?? config?.code?.enabled ?? false) as boolean,
    includeTestCases: (values.cases ?? config?.code?.includeTests ?? false) as boolean,
    scanTests: values["scan-tests"] as boolean,
    searchEngine,
    filterType: values["filter-type"] as string,
    filterDir: values["filter-dir"] as string,
    excludeDir: values["exclude-dir"] as string,
    config,
    ignore: values.ignore as string,
  };

  if (options.scanCode) {
    console.log(`Using search engine: ${searchEngine.name}`);
  }

  // Handle --list-files option
  if (values["list-files"]) {
    const { listScanFiles } = await import("./list-files.ts");
    const files = await listScanFiles(targetPath, options);
    for (const file of files) {
      console.log(file);
    }
    Deno.exit(0);
  }

  try {
    // Check if the target is a file or directory
    let todos;
    let basePath = targetPath;

    try {
      const stat = await Deno.stat(targetPath);
      if (stat.isFile) {
        // Process single file
        todos = await findTodosInFile(targetPath, options);
        // Set basePath to the file's directory for interactive modes
        const lastSlash = targetPath.lastIndexOf("/");
        basePath = lastSlash > 0 ? targetPath.substring(0, lastSlash) : ".";
      } else if (stat.isDirectory) {
        // Process directory
        todos = await findTodos(targetPath, options);
      } else {
        throw new Error(`${targetPath} is neither a file nor a directory`);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Path not found: ${targetPath}`);
      }
      throw error;
    }

    if (values.interactive) {
      // Run interactive mode
      const { runInteractiveMode } = await import("./interactive.ts");
      await runInteractiveMode(todos, basePath);
    } else if (values["select-multiple"]) {
      // Run multi-select mode
      const { runMultiSelectMode } = await import("./multi-select.ts");
      await runMultiSelectMode(todos, basePath, Boolean(values.unchecked));
    } else if (values.select !== undefined) {
      // Run select mode
      const { runSelectMode } = await import("./select.ts");
      await runSelectMode(todos, basePath, values.select as string);
    } else if (values.json) {
      // JSON output mode
      const jsonOutput = formatTodosAsJson(todos, {
        fields: values.fields as string,
        unchecked: values.unchecked as boolean,
      });
      if (values.pretty) {
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log(JSON.stringify(jsonOutput));
      }
    } else {
      // Normal display mode
      if (todos.length === 0) {
        console.log("No TODOs/FIXMEs/HACKs/NOTEs/CHECKLISTs found.");
      } else {
        console.log("Found items:\n");

        // Convert to tree nodes and display
        const treeNodes = todos.map(convertTodoToTreeNode);
        const treeOptions: TreeDisplayOptions = {
          showIds: Boolean(values["show-ids"]),
          maxItems: values["max-items"] ? parseInt(values["max-items"] as string) : undefined,
          maxDepth: values["max-depth"] ? parseInt(values["max-depth"] as string) : undefined,
          uncheckedOnly: Boolean(values.unchecked),
        };

        for (const node of treeNodes) {
          const lines = displayTree([node], treeOptions, "", true);
          for (const line of lines) {
            console.log(line);
          }
          console.log(); // Empty line between root items
        }
      }
    }
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

interface JsonOutputOptions {
  fields?: string;
  unchecked?: boolean;
  [key: string]: unknown;
}

function formatTodosAsJson(
  todos: LegacyTodoItem[],
  options: JsonOutputOptions,
): any {
  const allowedFields = options.fields?.split(",").map((f) => f.trim()) || null;

  function filterFields(obj: any): any {
    if (!allowedFields) return obj;

    const filtered: any = {};
    for (const field of allowedFields) {
      if (field in obj) {
        filtered[field] = obj[field];
      }
    }
    return filtered;
  }

  function processTodo(todo: LegacyTodoItem): any {
    // Special handling for file type - always include if it has todos
    if (todo.type === "file") {
      if (todo.todos) {
        const children = todo.todos.map(processTodo).filter((t) => t !== null);
        if (children.length > 0) {
          // For file types, we don't filter fields as they're containers
          return {
            type: todo.type,
            path: todo.path,
            todos: children,
          };
        }
      }
      return null;
    }

    // Skip checked items if unchecked filter is active
    if (
      options.unchecked &&
      todo.type === "markdown" &&
      todo.checked === true
    ) {
      // Check if it has unchecked children
      if (todo.todos) {
        const children = todo.todos.map(processTodo).filter((t) => t !== null);
        if (children.length > 0) {
          // Include this item but mark it
          const result: any = {
            ...todo,
            hasUncheckedChildren: true,
            todos: children,
          };
          return filterFields(result);
        }
      }
      return null;
    }

    const result: any = { ...todo };

    // Process children recursively
    if (todo.todos) {
      const children = todo.todos.map(processTodo).filter((t) => t !== null);
      if (children.length > 0) {
        result.todos = children;
      } else {
        delete result.todos;
      }
    }

    return filterFields(result);
  }

  const processed = todos.map(processTodo).filter((t) => t !== null);

  return {
    version: VERSION,
    timestamp: new Date().toISOString(),
    totalCount: countTotalItems(todos),
    items: processed,
  };
}

function countTotalItems(todos: LegacyTodoItem[]): number {
  let count = 0;
  for (const todo of todos) {
    if (todo.type !== "file") {
      count++;
    }
    if (todo.todos) {
      count += countTotalItems(todo.todos);
    }
  }
  return count;
}