import { parseArgs } from "@std/cli/parse-args";
import { runAddCommand } from "../../add-command.ts";

interface AddArgs {
  priority?: string;
  "indent-size"?: string;
  help?: boolean;
  _?: (string | number)[];
}

export async function runAddCommandCLI(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args, {
    boolean: ["help"],
    string: ["priority", "indent-size"],
    alias: {
      p: "priority",
      i: "indent-size",
      h: "help",
    },
  }) as AddArgs;

  if (parsedArgs.help) {
    printAddHelp();
    return;
  }

  // Get arguments
  const filePath = parsedArgs._?.[0]?.toString() || "TODO.md";
  const section = parsedArgs._?.[1]?.toString();
  const message = parsedArgs._?.[2]?.toString();

  if (!section || !message) {
    console.error("Error: Section and message are required");
    console.error("Usage: pcheck add <file> <section> <message> [options]");
    Deno.exit(1);
  }

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

  await runAddCommand(
    filePath,
    section,
    message,
    parsedArgs.priority,
    indentSize,
  );
}

function printAddHelp(): void {
  console.log(`pcheck add - Add a new task to a section

Usage:
  pcheck add [file] <section> <message> [options]

Arguments:
  file                Path to Markdown file (defaults to TODO.md)
  section             Section name to add the task to
  message             Task description

Options:
  -h, --help          Show this help message
  -p, --priority      Task priority (HIGH, MID, LOW, or number 0-999)
  -i, --indent-size   Indent size in spaces (default: 2)

Examples:
  pcheck add TODO "Fix bug"                    # Add to TODO section
  pcheck add FEATURES "New feature"            # Add to FEATURES section
  pcheck add TODO "Important task" --priority HIGH
  pcheck add TODO "Task" --indent-size 4       # Use 4-space indentation
`);
}

// Re-export the original function for backward compatibility
export { runAddCommand };
