// Test command for detecting test cases in TypeScript files
import { $ } from "dax";
import { walk } from "@std/fs/walk";
import { relative } from "@std/path";
import {
  checkAstGrepInstalled,
  findTestsInFileWithAst,
} from "./ast-test-detector.ts";
import { blue, bold, green, red, yellow } from "@std/fmt/colors";
import type { TodoItem } from "./types.ts";

interface TestCommandOptions {
  path?: string;
  includeSkipped?: boolean;
  json?: boolean;
  pretty?: boolean;
  filterDir?: string;
  excludeDir?: string;
}

export async function runTestCommand(
  options: TestCommandOptions,
): Promise<void> {
  // Check if ast-grep is installed
  if (!await checkAstGrepInstalled()) {
    console.error(red("Error: ast-grep is not installed"));
    console.error(
      "Install it from: https://ast-grep.github.io/guide/quick-start.html",
    );
    console.error("Or run 'pcheck doctor' for more information");
    Deno.exit(1);
  }

  const targetPath = options.path || ".";
  const allTests: TodoItem[] = [];

  // Parse filter options
  const filterDirs = options.filterDir?.split(",").map((dir) => dir.trim());
  const excludeDirs = options.excludeDir?.split(",").map((dir) => dir.trim());

  // Build skip patterns
  const skipPatterns: RegExp[] = [];
  if (excludeDirs) {
    excludeDirs.forEach((dir) => {
      skipPatterns.push(new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
      skipPatterns.push(new RegExp(`^${dir}[\\/\\\\]`));
    });
  }

  // Walk through files
  for await (
    const entry of walk(targetPath, {
      includeDirs: false,
      skip: skipPatterns,
      exts: [".ts", ".tsx", ".js", ".jsx"],
    })
  ) {
    // Only process test files
    if (!entry.path.match(/\.(test|spec)\./)) {
      continue;
    }

    const relativePath = relative(targetPath, entry.path);

    // Apply directory filters
    if (filterDirs) {
      const inFilterDir = filterDirs.some((dir) =>
        relativePath.startsWith(dir + "/") ||
        relativePath.includes("/" + dir + "/") ||
        relativePath.startsWith(dir)
      );
      if (!inFilterDir) continue;
    }

    try {
      const tests = await findTestsInFileWithAst(
        entry.path,
        options.includeSkipped ?? true,
      );
      allTests.push(...tests);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("ast-grep is not installed")
      ) {
        throw error;
      }
      // Continue on other errors
      console.error(
        yellow(
          `Warning: Failed to parse ${relativePath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  // Output results
  if (options.json) {
    const output = {
      total: allTests.length,
      skipped: allTests.filter((t) => t.type === "SKIP").length,
      tests: allTests.map((test) => ({
        type: test.type,
        name: test.text,
        file: test.filePath,
        line: test.line,
        column: test.column,
        id: test.id,
      })),
    };

    if (options.pretty) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(JSON.stringify(output));
    }
  } else {
    if (allTests.length === 0) {
      console.log(yellow("No test cases found"));
      return;
    }

    console.log(bold(`\n🧪 Found ${allTests.length} test cases\n`));

    // Group by file
    const byFile = new Map<string, TodoItem[]>();
    for (const test of allTests) {
      const file = test.filePath;
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(test);
    }

    // Display by file
    for (const [file, tests] of byFile) {
      console.log(blue(`\n${file}:`));
      for (const test of tests) {
        const icon = test.type === "SKIP" ? "⏩" : "✅";
        const color = test.type === "SKIP" ? yellow : green;
        console.log(`  ${icon} ${color(test.text)} (line ${test.line})`);
      }
    }

    // Summary
    const skippedCount = allTests.filter((t) => t.type === "SKIP").length;
    const activeCount = allTests.length - skippedCount;

    console.log(bold("\n📊 Summary:"));
    console.log(`  Active tests: ${green(activeCount.toString())}`);
    console.log(`  Skipped tests: ${yellow(skippedCount.toString())}`);
  }
}
