import { runUpdateCommand as runUpdateCore } from "../../update-command.ts";
import { parseArgs } from "node:util";

export async function runUpdateCommand(args: string[]) {
  let filePath = "TODO.md";
  const argsToUse = [...args];

  // Check if file path is provided
  if (argsToUse.length > 0 && !argsToUse[0].startsWith("-")) {
    filePath = argsToUse[0];
    argsToUse.shift();
  }

  const { values } = parseArgs({
    args: argsToUse,
    options: {
      sort: { type: "boolean", short: "s" },
      completed: { type: "boolean" },
      done: { type: "boolean", short: "d" },
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

  await runUpdateCore(filePath, updateOptions);
}
