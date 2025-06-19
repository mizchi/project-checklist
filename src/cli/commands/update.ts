import { parseArgs } from "@std/cli/parse-args";
import { runUpdateCommand } from "../../update-command.ts";

interface UpdateArgs {
  sort?: boolean;
  done?: boolean;
  "force-clear"?: boolean;
  priority?: boolean;
  "indent-size"?: string;
  help?: boolean;
  _?: (string | number)[];
}

export async function runUpdateCommandCLI(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args, {
    boolean: ["sort", "done", "force-clear", "priority", "help"],
    string: ["indent-size"],
    alias: {
      s: "sort",
      d: "done",
      p: "priority",
      i: "indent-size",
      h: "help",
    },
  }) as UpdateArgs;

  if (parsedArgs.help) {
    printUpdateHelp();
    return;
  }

  // Get file path
  const filePath = parsedArgs._?.[0]?.toString() || "TODO.md";

  // Parse indent size
  let indentSize: number | undefined;
  if (parsedArgs["indent-size"]) {
    const parsed = parseInt(parsedArgs["indent-size"]);
    if (isNaN(parsed) || parsed < 1 || parsed > 8) {
      console.error("Error: indent-size must be a number between 1 and 8");
      Deno.exit(1);
    }
    indentSize = parsed;
  }

  const options = {
    sort: parsedArgs.sort,
    completed: parsedArgs.done, // CLI uses --done flag, but interface uses completed
    "force-clear": parsedArgs["force-clear"],
    priority: parsedArgs.priority,
    indentSize,
  };

  await runUpdateCommand(filePath, options);
}

function printUpdateHelp(): void {
  console.log(`pcheck update - Update and organize TODO file

Usage:
  pcheck update [file] [options]

Arguments:
  file                Path to Markdown file (defaults to TODO.md)

Options:
  -h, --help          Show this help message
  -s, --sort          Sort tasks by priority
  -p, --priority      Sort tasks by priority (same as --sort)
  -d, --done          Move completed tasks to COMPLETED section
  --force-clear       Clear COMPLETED/DONE section completely
  -i, --indent-size   Indent size in spaces (default: 2)

Examples:
  pcheck update                    # Interactive mode
  pcheck update --priority         # Sort by priority
  pcheck update --done             # Move completed tasks
  pcheck update --priority --done  # Sort and move completed
  pcheck update --force-clear      # Clear completed section
  pcheck update --indent-size 4    # Use 4-space indentation

Notes:
  - Completed tasks are moved to COMPLETED section
  - If no options are provided, interactive mode will ask what to do
  - Priority order: HIGH > MID > LOW > numeric > no priority
`);
}

// Re-export the original function for backward compatibility
export { runUpdateCommand };
