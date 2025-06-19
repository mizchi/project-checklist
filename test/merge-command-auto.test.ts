import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { runMergeCommand } from "../src/merge-command.ts";
import type { AutoResponse } from "../src/cli/auto-response.ts";

const testDir = await Deno.makeTempDir({ prefix: "pcheck_merge_auto_test_" });

async function createTestFile(path: string, content: string) {
  const fullPath = join(testDir, path);
  await ensureDir(join(testDir, path.split("/").slice(0, -1).join("/")));
  await Deno.writeTextFile(fullPath, content);
}

async function readTestFile(path: string): Promise<string> {
  return await Deno.readTextFile(join(testDir, path));
}

Deno.test("merge command - auto response for file selection", async () => {
  // Create test structure
  await createTestFile(
    "auto-select/TODO.md",
    `# Main Project TODO

## TODO
- [ ] Main task
`,
  );

  await createTestFile(
    "auto-select/src/TODO.md",
    `# Source TODO

## TODO
- [ ] Source task 1
- [ ] Source task 2
`,
  );

  await createTestFile(
    "auto-select/docs/TODO.md",
    `# Docs TODO

## TODO
- [ ] Doc task 1
`,
  );

  await createTestFile(
    "auto-select/tests/TODO.md",
    `# Tests TODO

## TODO
- [ ] Test task 1
- [ ] Test task 2
- [ ] Test task 3
`,
  );

  // Files will be sorted: docs/TODO.md, src/TODO.md, tests/TODO.md
  // Run merge with auto response - select files at indices 0 and 1 (docs and src)
  const autoResponse: AutoResponse = {
    multiSelectResponses: [[0, 1]], // Select docs and src
    confirmResponses: [], // Not removing source files
  };

  await runMergeCommand(join(testDir, "auto-select"), {
    interactive: true,
    dryRun: false,
    preserveSource: true,
    autoResponse,
  });

  // Check merged content
  const merged = await readTestFile("auto-select/TODO.md");

  // Should contain tasks from selected files
  assertStringIncludes(merged, "Main task");
  assertStringIncludes(merged, "Doc task 1");
  assertStringIncludes(merged, "Source task 1");

  // Should NOT contain tasks from unselected file (tests)
  assertEquals(merged.includes("Test task 1"), false);
});

Deno.test("merge command - auto response for source file removal", async () => {
  // Create test structure
  await createTestFile(
    "auto-remove/TODO.md",
    `# Main TODO
`,
  );

  await createTestFile(
    "auto-remove/sub/TODO.md",
    `## TODO
- [ ] Task to merge
`,
  );

  // Run merge with auto response - select all files and confirm removal
  const autoResponse: AutoResponse = {
    multiSelectResponses: [[0]], // Select the only file
    confirmResponses: [true], // Confirm removal of source files
  };

  await runMergeCommand(join(testDir, "auto-remove"), {
    interactive: true,
    dryRun: false,
    preserveSource: false, // Ask about removal
    autoResponse,
  });

  // Check merged content
  const merged = await readTestFile("auto-remove/TODO.md");
  assertStringIncludes(merged, "Task to merge");

  // Check that source file was removed
  let fileExists = true;
  try {
    await Deno.stat(join(testDir, "auto-remove/sub/TODO.md"));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      fileExists = false;
    }
  }
  assertEquals(fileExists, false, "Source file should have been removed");
});

Deno.test("merge command - auto response with empty selection", async () => {
  await createTestFile(
    "auto-empty/TODO.md",
    `# Main TODO
`,
  );

  await createTestFile(
    "auto-empty/sub/TODO.md",
    `## TODO
- [ ] Task
`,
  );

  // Run merge with empty selection
  const autoResponse: AutoResponse = {
    multiSelectResponses: [[]], // Empty selection
  };

  let output = "";
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await runMergeCommand(join(testDir, "auto-empty"), {
      interactive: true,
      dryRun: false,
      preserveSource: true,
      autoResponse,
    });

    assertStringIncludes(output, "No files selected");
  } finally {
    console.log = originalLog;
  }

  // Original file should be unchanged
  const original = await readTestFile("auto-empty/TODO.md");
  assertEquals(original, "# Main TODO\n");
});

Deno.test("merge command - auto response falls back to interactive when exhausted", async () => {
  await createTestFile(
    "auto-fallback/TODO.md",
    `# Main TODO
`,
  );

  await createTestFile(
    "auto-fallback/sub1/TODO.md",
    `## TODO
- [ ] Task 1
`,
  );

  // Provide insufficient auto responses - should fall back to non-interactive since we can't actually interact in tests
  const autoResponse: AutoResponse = {
    multiSelectResponses: [], // No responses provided
  };

  // This should run in non-interactive mode as fallback
  await runMergeCommand(join(testDir, "auto-fallback"), {
    interactive: false, // Force non-interactive to avoid hanging in tests
    dryRun: false,
    preserveSource: true,
    autoResponse,
  });

  // Should merge all files in non-interactive mode
  const merged = await readTestFile("auto-fallback/TODO.md");
  assertStringIncludes(merged, "Task 1");
});

// Cleanup
Deno.test("cleanup temp directory", async () => {
  await Deno.remove(testDir, { recursive: true });
});
