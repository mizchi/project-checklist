#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run
import { parseArgs } from "@std/cli/parse-args";
import { findTodos, findTodosInFile, LegacyTodoItem } from "./mod.ts";
import { detectBestEngine, getEngineByName } from "./search/mod.ts";
import {
  convertTodoToTreeNode,
  displayTree,
  type TreeDisplayOptions,
} from "./cli/tree-display.ts";

const VERSION = "0.1.0";

function printHelp() {
  console.log(`pcheck - Project TODO and checklist scanner v${VERSION}

Usage:
  pcheck [options] [path]
  pcheck doctor            # Run diagnostics
  pcheck validate [file]   # Validate Markdown checklist structure
  pcheck check <id>        # Toggle a checklist item by ID
  pcheck add [file] [type] -m <message>  # Add task to TODO.md
  pcheck sort [file]       # Sort tasks by priority
  pcheck update [file]     # Update TODO.md with various operations
  pcheck u [file]          # Alias for update
  pcheck test [path]       # Find test cases in TypeScript files (requires ast-grep)

Arguments:
  path                Path to scan (file or directory, defaults to current directory)
  id                  Checklist item ID for check command
  file                TODO.md file path (optional, defaults to ./TODO.md)
  type                Section type (TODO, ICEBOX, etc.) defaults to TODO
  message             Task content (use -m or --message)

Options:
  -h, --help          Show this help message
  -v, --version       Show version
  --no-files          Skip TODO.md files
  --code              Include TODO comments in code (default: off)
  --cases             Include TODO comments from test cases when using --code
  --scan-tests        Scan TypeScript test files for skipped tests (requires ast-grep)
  --engine <name>     Use specific search engine (rg, git-grep, grep, native)
  --list-engines      List available search engines
  -i, --interactive   Interactive mode for managing checklist items
  -s, --select <n>    Toggle a specific checklist item by number
  -u, --unchecked     Show only unchecked items (maintains hierarchy)
  -m, --select-multiple  Select multiple items and return changes for AI interaction
  -g, --gitroot       Search from git repository root
  -p, --private       Search from ~/.todo directory
  --show-ids          Show internal IDs for checklist items
  -j, --json          Output in JSON format
  --pretty            Pretty print JSON output
  --fields <fields>   Comma-separated list of fields to include in JSON
  --filter-type <ext> Filter by file extensions (e.g., .ts,.js)
  --filter-dir <dirs> Only include specific directories (e.g., src,lib)
  --exclude-dir <dirs> Exclude specific directories (e.g., dist,build)
  --config <path>     Path to pcheck.config.json (defaults to ./pcheck.config.json)
  -n, --max-items <n> Maximum number of items to display per level
  -d, --max-depth <n> Maximum depth to display
  --ignore <patterns> Comma-separated patterns to ignore (e.g., "tmp/,*.bak,test-*")

Commands:
  init [directory]  Initialize TODO.md file (--force, --template)
  doctor            Check your environment and available search engines
  validate [file]   Validate Markdown checklist structure and hierarchy
  check <id>        Toggle a checklist item by ID (use --off to uncheck)
  add [file] [type] Add a new task to TODO.md (use -m for message, -p for priority)
  sort [file]       Sort tasks by priority within each section
  update/u [file]   Update TODO.md (--priority, --done, --force-clear, --code)
  test [path]       Find test cases in TypeScript files (--include-all, --json)
  code-checklist    Find checklist items in code comments

Examples:
  pcheck init               # Create TODO.md in current directory
  pcheck init --template gtd # Create with GTD template
  pcheck init --force       # Overwrite existing TODO.md
  pcheck                    # Scan current directory
  pcheck ./src              # Scan specific directory
  pcheck TODO.md            # Scan specific file
  pcheck src/main.ts        # Scan specific code file
  pcheck --code             # Include TODO comments in code
  pcheck --engine rg        # Use ripgrep for searching
  pcheck --engine git-grep  # Use git grep (in git repos)
  pcheck doctor             # Check environment
  pcheck validate           # Validate TODO.md structure
  pcheck validate README.md # Validate specific file
  pcheck validate --json    # Output validation results as JSON
  pcheck add -m "New task"  # Add to TODO section
  pcheck add ICEBOX -m "Future idea"  # Add to ICEBOX
  pcheck add -m "Bug fix" -p high  # Add with priority
  pcheck check ff5d5f83     # Toggle task by ID
  pcheck sort              # Sort tasks by priority
  pcheck update --done     # Move completed tasks to DONE
  pcheck u --priority --done  # Sort by priority and move completed tasks
  pcheck update --code     # Extract checklists from code to TODO.md
  pcheck test              # Find skipped tests in current directory
  pcheck test src          # Find skipped tests in src directory
  pcheck test --json       # Output test cases as JSON
  pcheck test --include-all # Include all tests, not just skipped
  pcheck code-checklist    # Find checklists in code comments
  pcheck code-checklist --stats  # Show statistics
  pcheck code-checklist --group-by-file  # Group by file
`);
}

if (import.meta.main) {
  // Check if it's init command
  if (Deno.args[0] === "init") {
    const { runInitCommand } = await import("./init-command.ts");
    const args = parseArgs(Deno.args.slice(1), {
      boolean: ["force"],
      string: ["template"],
      alias: {
        f: "force",
        t: "template",
      },
    });

    const directory = args._[0]?.toString() || ".";
    await runInitCommand(directory, {
      force: args.force,
      template: args.template,
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
    const args = parseArgs(Deno.args.slice(2), {
      boolean: ["off", "gitroot", "private"],
      alias: {
        g: "gitroot",
        p: "private",
      },
    });
    await runCheckCommand(itemId, args);
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
    const remainingArgs = Deno.args.slice(1);

    // Check if file path is provided
    if (remainingArgs.length > 0 && !remainingArgs[0].startsWith("-")) {
      filePath = remainingArgs[0];
      remainingArgs.shift();
    }

    const args = parseArgs(remainingArgs, {
      boolean: ["sort", "done", "force-clear", "priority", "code"],
    });

    await runUpdateCommand(filePath, args);
    Deno.exit(0);
  }

  // Check if it's test command
  if (Deno.args[0] === "test") {
    const { runTestCommand } = await import("./test-command.ts");
    const targetPath = Deno.args[1] || ".";

    const args = parseArgs(Deno.args.slice(2), {
      boolean: ["json", "pretty", "include-all"],
      string: ["filter-dir", "exclude-dir"],
    });

    await runTestCommand({
      path: targetPath,
      includeSkipped: !args["include-all"],
      json: args.json,
      pretty: args.pretty,
      filterDir: args["filter-dir"],
      excludeDir: args["exclude-dir"],
    });
    Deno.exit(0);
  }

  // Check if it's code-checklist command
  if (Deno.args[0] === "code-checklist") {
    const { runCodeChecklistCommand } = await import(
      "./cli/commands/code-checklists.ts"
    );
    const args = parseArgs(Deno.args.slice(1), {
      boolean: ["stats", "group-by-file", "checked", "unchecked"],
      string: ["patterns"],
      alias: {
        s: "stats",
        g: "group-by-file",
        c: "checked",
        u: "unchecked",
      },
    });

    const targetPath = args._[0]?.toString() || ".";

    await runCodeChecklistCommand({
      path: targetPath,
      stats: args.stats,
      "group-by-file": args["group-by-file"],
      checked: args.checked,
      unchecked: args.unchecked,
      patterns: args.patterns?.split(","),
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

    const args = parseArgs(remainingArgs.slice(argsStart), {
      string: ["message", "priority"],
      alias: {
        m: "message",
        p: "priority",
      },
    });

    if (!args.message) {
      console.error("Error: Message is required for add command");
      console.error("Usage: pcheck add [file] [type] -m <message>");
      Deno.exit(1);
    }

    await runAddCommand(
      filePath,
      sectionType,
      args.message as string,
      args.priority as string,
    );
    Deno.exit(0);
  }

  const args = parseArgs(Deno.args, {
    boolean: [
      "help",
      "version",
      "no-files",
      "code",
      "cases",
      "scan-tests",
      "list-engines",
      "interactive",
      "unchecked",
      "select-multiple",
      "gitroot",
      "private",
      "show-ids",
      "json",
      "pretty",
    ],
    string: [
      "engine",
      "select",
      "fields",
      "filter-type",
      "filter-dir",
      "exclude-dir",
      "config",
      "max-items",
      "max-depth",
      "ignore",
    ],
    alias: {
      h: "help",
      v: "version",
      i: "interactive",
      s: "select",
      u: "unchecked",
      m: "select-multiple",
      g: "gitroot",
      p: "private",
      j: "json",
      n: "max-items",
      d: "max-depth",
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`pcheck v${VERSION}`);
    Deno.exit(0);
  }

  if (args["list-engines"]) {
    console.log("Available search engines:");
    const engines = ["rg (ripgrep)", "git-grep", "grep", "native (Deno)"];
    for (const engine of engines) {
      console.log(`  - ${engine}`);
    }
    Deno.exit(0);
  }

  // Determine target path based on options
  let targetPath = args._[0]?.toString() || ".";

  if (args.gitroot && args.private) {
    console.error(
      "Error: Cannot use both --gitroot and --private options together",
    );
    Deno.exit(1);
  }

  if (args.gitroot) {
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
  } else if (args.private) {
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
  if (args.engine) {
    searchEngine = await getEngineByName(args.engine);
    if (!searchEngine) {
      console.error(
        `Error: Search engine '${args.engine}' is not available or not found.`,
      );
      console.error("Run 'pcheck --list-engines' to see available engines.");
      Deno.exit(1);
    }
  } else {
    searchEngine = await detectBestEngine();
  }

  // Load config if specified
  let config;
  if (args.config || args["scan-tests"]) {
    const { loadConfig } = await import("./config.ts");
    config = await loadConfig(args.config);
  }

  // Check if ast-grep is available when scan-tests is requested
  if (args["scan-tests"]) {
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
    scanFiles: !args["no-files"],
    scanCode: args["code"], // Default is false, only true if --code is specified
    includeTestCases: args["cases"],
    scanTests: args["scan-tests"],
    searchEngine,
    filterType: args["filter-type"],
    filterDir: args["filter-dir"],
    excludeDir: args["exclude-dir"],
    config,
    ignore: args["ignore"],
  };

  if (options.scanCode) {
    console.log(`Using search engine: ${searchEngine.name}`);
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

    if (args.interactive) {
      // Run interactive mode
      const { runInteractiveMode } = await import("./interactive.ts");
      await runInteractiveMode(todos, basePath);
    } else if (args["select-multiple"]) {
      // Run multi-select mode
      const { runMultiSelectMode } = await import("./multi-select.ts");
      await runMultiSelectMode(todos, basePath, args.unchecked);
    } else if (args.select !== undefined) {
      // Run select mode
      const { runSelectMode } = await import("./select.ts");
      await runSelectMode(todos, basePath, args.select);
    } else if (args.json) {
      // JSON output mode
      const jsonOutput = formatTodosAsJson(todos, args);
      if (args.pretty) {
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
          showIds: args["show-ids"],
          maxItems: args["max-items"] ? parseInt(args["max-items"]) : undefined,
          maxDepth: args["max-depth"] ? parseInt(args["max-depth"]) : undefined,
          uncheckedOnly: args.unchecked,
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
