import { ValidationEngine } from "../../core/validation-engine.ts";
import { OutputFormatter } from "../../core/output-formatter.ts";
import { ValidatorOptions } from "../../types/validation.ts";
import { parseArgs } from "node:util";
import { green } from "@std/fmt/colors";

export async function runValidateCommand(
  args: string[],
  options?: { json?: boolean; fix?: boolean; strict?: boolean },
): Promise<any[] | void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", short: "j" },
      pretty: { type: "boolean", short: "p" },
      strict: { type: "boolean", short: "s" },
      details: { type: "boolean", short: "d" },
      help: { type: "boolean", short: "h" },
      fix: { type: "boolean", short: "f" },
      "indent-size": { type: "string", short: "i" },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.help) {
    printValidateHelp();
    return;
  }

  // Override from options if provided
  const useJson = options?.json ?? values.json;
  const useFix = options?.fix ?? values.fix;
  const useStrict = options?.strict ?? values.strict;

  const filePath = positionals[0] || "TODO.md";

  const engine = new ValidationEngine();
  const validatorOptions: ValidatorOptions = {
    indentSize: values["indent-size"]
      ? parseInt(values["indent-size"] as string)
      : undefined,
    strict: useStrict as boolean,
  };

  try {
    const content = await Deno.readTextFile(filePath);
    const result = engine.validateContent(content, validatorOptions);

    // If fixing is requested, we need to handle it differently
    // For now, just report the issues
    if (useFix && result.errors.length > 0) {
      console.log(
        green(`Found ${result.errors.length} issue(s) in ${filePath}`),
      );
      console.log("Note: Auto-fix is not yet implemented");
    }

    const formatter = new OutputFormatter();

    if (useJson) {
      const jsonOutput = formatter.formatValidationResult(result, filePath, {
        json: true,
        pretty: values.pretty as boolean,
      });
      console.log(jsonOutput);
      return result.errors;
    } else {
      const output = formatter.formatValidationResult(result, filePath, {
        showDetails: values.details as boolean,
      });
      console.log(output);

      // Exit with error code if there are issues and not fixing
      if (!result.valid && !useFix) {
        Deno.exit(1);
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: File not found: ${filePath}`);
    } else {
      console.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    Deno.exit(1);
  }
}

function printValidateHelp() {
  console.log(`pcheck validate - Validate TODO.md file structure and formatting

USAGE:
  pcheck validate [file] [options]

OPTIONS:
  -f, --fix             Auto-fix formatting issues
  -j, --json            Output as JSON
  -p, --pretty          Pretty print JSON output
  -s, --strict          Enable strict validation
  -d, --details         Show detailed issue descriptions
  -i, --indent-size <n> Set indent size (default: 2)
  -h, --help            Show this help message

EXAMPLES:
  pcheck validate                     # Validate TODO.md
  pcheck validate --fix               # Fix formatting issues
  pcheck validate src/TODO.md --json  # Validate specific file as JSON
  pcheck validate --strict --details  # Strict validation with details
  pcheck validate --indent-size 4     # Validate with 4-space indents
`);
}
