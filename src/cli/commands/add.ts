import { runAddCommand as runAddCore } from "../../add-command.ts";
import { parseArgs } from "node:util";
import { yellow, red } from "@std/fmt/colors";

export async function runAddCommand(args: string[]) {
  let filePath = "TODO.md";
  const argsToUse = [...args];

  // Check if first arg is a file path
  if (
    argsToUse.length > 0 &&
    (argsToUse[0].endsWith(".md") || argsToUse[0].includes("/"))
  ) {
    filePath = argsToUse[0];
    argsToUse.shift();
  }

  // Extract section type if provided
  let sectionType = "TODO";
  if (argsToUse.length > 0 && !argsToUse[0].startsWith("-")) {
    sectionType = argsToUse[0];
    argsToUse.shift();
  }

  const { values } = parseArgs({
    args: argsToUse,
    options: {
      message: { type: "string", short: "m" },
      priority: { type: "string", short: "p" },
    },
    strict: false,
    allowPositionals: true,
  });

  if (!values.message) {
    console.error(red("Error: Message is required"));
    console.error(yellow("Usage: pcheck add [file] [type] -m <message>"));
    Deno.exit(1);
  }

  await runAddCore(
    filePath,
    sectionType,
    values.message as string,
    values.priority as string,
  );
}