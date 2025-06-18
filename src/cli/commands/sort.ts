import { parseArgs } from "@std/cli/parse-args";
import { runSortCommand } from "../../sort-command.ts";

interface SortArgs {
  "indent-size"?: string;
  help?: boolean;
  _?: (string | number)[];
}

export async function runSortCommandCLI(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args, {
    boolean: ["help"],
    string: ["indent-size"],
    alias: {
      i: "indent-size",
      h: "help",
    },
  }) as SortArgs;

  if (parsedArgs.help) {
    printSortHelp();
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

  await runSortCommand(filePath, indentSize);
}

function printSortHelp(): void {
  console.log(`pcheck sort - Sort tasks by priority within each section

Usage:
  pcheck sort [file] [options]

Arguments:
  file                Path to Markdown file (defaults to TODO.md)

Options:
  -h, --help          Show this help message
  -i, --indent-size   Indent size in spaces (default: 2)

Examples:
  pcheck sort                    # Sort TODO.md
  pcheck sort README.md          # Sort specific file
  pcheck sort --indent-size 4    # Use 4-space indentation

Priority Order:
  HIGH (1) > MID (5) > LOW (10) > numeric priorities > no priority (100)
  Within same priority: unchecked tasks before checked tasks
`);
}

// Re-export the original function for backward compatibility
export { runSortCommand };
