import { runSortCommand as runSortCore } from "../../sort-command.ts";
import { parseArgs } from "node:util";

export async function runSortCommand(args: string[]) {
  const { positionals } = parseArgs({
    args,
    options: {},
    strict: false,
    allowPositionals: true,
  });

  const filePath = positionals[0] || "TODO.md";
  await runSortCore(filePath);
}