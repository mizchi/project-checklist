import { ValidationEngine } from "../../core/validation-engine.ts";
import { OutputFormatter } from "../../core/output-formatter.ts";
import { ValidatorOptions } from "../../types/validation.ts";
import { parseArgs } from "@std/cli/parse-args";

interface ValidateArgs {
  json?: boolean;
  pretty?: boolean;
  strict?: boolean;
  "indent-size"?: string;
  details?: boolean;
  help?: boolean;
  _?: (string | number)[];
}

export async function runValidateCommand(args: string[]): Promise<void> {
  const parsedArgs = parseArgs(args, {
    boolean: ["json", "pretty", "strict", "details", "help"],
    string: ["indent-size"],
    alias: {
      j: "json",
      p: "pretty",
      s: "strict",
      d: "details",
      h: "help",
      i: "indent-size",
    },
  }) as ValidateArgs;

  if (parsedArgs.help) {
    printValidateHelp();
    return;
  }

  // Get file path from arguments
  const filePath = parsedArgs._?.[0]?.toString() || "TODO.md";

  // Prepare validator options
  const validatorOptions: ValidatorOptions = {
    strict: parsedArgs.strict,
  };

  if (parsedArgs["indent-size"]) {
    const indentSize = parseInt(parsedArgs["indent-size"]);
    if (isNaN(indentSize) || indentSize < 1 || indentSize > 8) {
      console.error("Error: indent-size must be a number between 1 and 8");
      Deno.exit(1);
    }
    validatorOptions.indentSize = indentSize;
  }

  // Check if file exists
  try {
    const stat = await Deno.stat(filePath);
    if (!stat.isFile) {
      console.error(`Error: ${filePath} is not a file`);
      Deno.exit(1);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: File not found: ${filePath}`);
      Deno.exit(1);
    } else {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error: Cannot access file ${filePath}: ${errorMessage}`);
      Deno.exit(1);
    }
  }

  // Run validation
  const engine = new ValidationEngine();
  const formatter = new OutputFormatter();

  try {
    const result = await engine.validateFile(filePath, validatorOptions);

    const output = formatter.formatValidationResult(result, filePath, {
      json: parsedArgs.json,
      pretty: parsedArgs.pretty,
      showDetails: parsedArgs.details,
    });

    console.log(output);

    // Exit with error code if validation failed
    if (!result.valid) {
      Deno.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error during validation: ${errorMessage}`);
    Deno.exit(1);
  }
}

function printValidateHelp(): void {
  console.log(`pcheck validate - Validate Markdown checklist structure

Usage:
  pcheck validate [file] [options]

Arguments:
  file                Path to Markdown file (defaults to TODO.md)

Options:
  -h, --help          Show this help message
  -j, --json          Output results in JSON format
  -p, --pretty        Pretty-print JSON output
  -s, --strict        Enable strict validation mode
  -d, --details       Show detailed information in console output
  -i, --indent-size   Expected indent size in spaces (default: 2)

Examples:
  pcheck validate                    # Validate TODO.md
  pcheck validate README.md          # Validate specific file
  pcheck validate --json             # Output as JSON
  pcheck validate --json --pretty    # Pretty JSON output
  pcheck validate --strict           # Strict validation
  pcheck validate --indent-size 4    # Use 4-space indentation
  pcheck validate --details          # Show detailed output

Validation Rules:
  • Indent consistency (proper spacing and hierarchy)
  • Parent-child task relationships
  • Checkbox format validation
  • Section structure validation
  • Priority format validation

Exit Codes:
  0    Validation passed (no errors)
  1    Validation failed (errors found) or command error
`);
}
