import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir, ensureFile } from "@std/fs";
import { runMergeCommand } from "../src/merge-command.ts";

const testDir = await Deno.makeTempDir({ prefix: "pcheck_merge_test_" });

async function createTestFile(path: string, content: string) {
  const fullPath = join(testDir, path);
  await ensureDir(join(testDir, path.split("/").slice(0, -1).join("/")));
  await Deno.writeTextFile(fullPath, content);
}

async function readTestFile(path: string): Promise<string> {
  return await Deno.readTextFile(join(testDir, path));
}

Deno.test("merge command - merges multiple TODO.md files", async () => {
  // Create test structure
  await createTestFile(
    "TODO.md",
    `# Main Project TODO

## TODO
- [ ] Setup project
- [ ] Write documentation

## COMPLETED
- [x] Initialize repository
`,
  );

  await createTestFile(
    "src/TODO.md",
    `# Source Code Tasks

## TODO
- [ ] [HIGH] Implement authentication
- [ ] Create API endpoints
  - [ ] User endpoints
  - [ ] Auth endpoints

## IN PROGRESS
- [ ] Setup server
`,
  );

  await createTestFile(
    "docs/TODO.md",
    `# Documentation Tasks

## TODO
- [ ] Write API docs
- [ ] Create user guide

## COMPLETED
- [x] Create structure
`,
  );

  // Run merge in non-interactive mode
  await runMergeCommand(testDir, {
    interactive: false,
    dryRun: false,
    preserveSource: true,
  });

  // Check merged content
  const merged = await readTestFile("TODO.md");

  // Should contain tasks from all files
  assertStringIncludes(merged, "Setup project");
  assertStringIncludes(merged, "Implement authentication");
  assertStringIncludes(merged, "Write API docs");

  // Should maintain priority
  assertStringIncludes(merged, "[HIGH]");

  // Should maintain sections
  assertStringIncludes(merged, "## TODO");
  assertStringIncludes(merged, "## IN PROGRESS");
  assertStringIncludes(merged, "## COMPLETED");

  // Should preserve hierarchy
  assertStringIncludes(merged, "User endpoints");
  assertStringIncludes(merged, "Auth endpoints");
});

Deno.test("merge command - dry run mode", async () => {
  await createTestFile("test-dry/TODO.md", "# Main TODO\n");
  await createTestFile(
    "test-dry/sub/TODO.md",
    `## TODO
- [ ] Task 1
- [ ] Task 2
`,
  );

  let output = "";
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await runMergeCommand(join(testDir, "test-dry"), {
      interactive: false,
      dryRun: true,
    });

    // Should show preview
    assertStringIncludes(output, "DRY RUN");
    assertStringIncludes(output, "Task 1");
    assertStringIncludes(output, "Task 2");
    assertStringIncludes(output, "Would merge");
  } finally {
    console.log = originalLog;
  }

  // Original file should be unchanged
  const original = await readTestFile("test-dry/TODO.md");
  assertEquals(original, "# Main TODO\n");
});

Deno.test("merge command - skip empty files", async () => {
  await createTestFile("test-empty/TODO.md", "# Main TODO\n");
  await createTestFile("test-empty/empty/TODO.md", "# Empty TODO\n\n## TODO\n");
  await createTestFile(
    "test-empty/with-tasks/TODO.md",
    `## TODO
- [ ] Real task
`,
  );

  let output = "";
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await runMergeCommand(join(testDir, "test-empty"), {
      interactive: false,
      skipEmpty: true,
      dryRun: false,
      preserveSource: true,
    });

    // Should only merge files with tasks
    assertStringIncludes(output, "Merged 1 files");
  } finally {
    console.log = originalLog;
  }

  const merged = await readTestFile("test-empty/TODO.md");
  assertStringIncludes(merged, "Real task");
});

Deno.test("merge command - preserves section order", async () => {
  await createTestFile("test-order/TODO.md", "# Project TODO\n");

  await createTestFile(
    "test-order/a/TODO.md",
    `## ICEBOX
- [ ] Future feature

## TODO
- [ ] Current task
`,
  );

  await createTestFile(
    "test-order/b/TODO.md",
    `## COMPLETED
- [x] Done task

## IN PROGRESS
- [ ] Working on this
`,
  );

  await runMergeCommand(join(testDir, "test-order"), {
    interactive: false,
    dryRun: false,
    preserveSource: true,
  });

  const merged = await readTestFile("test-order/TODO.md");
  const lines = merged.split("\n");

  // Find section indices
  const todoIndex = lines.findIndex((l) => l === "## TODO");
  const inProgressIndex = lines.findIndex((l) => l === "## IN PROGRESS");
  const iceboxIndex = lines.findIndex((l) => l === "## ICEBOX");
  const completedIndex = lines.findIndex((l) => l === "## COMPLETED");

  // Verify correct order
  if (todoIndex !== -1 && inProgressIndex !== -1) {
    assertEquals(
      todoIndex < inProgressIndex,
      true,
      "TODO should come before IN PROGRESS",
    );
  }
  if (inProgressIndex !== -1 && iceboxIndex !== -1) {
    assertEquals(
      inProgressIndex < iceboxIndex,
      true,
      "IN PROGRESS should come before ICEBOX",
    );
  }
  if (iceboxIndex !== -1 && completedIndex !== -1) {
    assertEquals(
      iceboxIndex < completedIndex,
      true,
      "ICEBOX should come before COMPLETED",
    );
  }
});

Deno.test("merge command - handles nested tasks correctly", async () => {
  await createTestFile("test-nested/TODO.md", "# Main TODO\n");
  await createTestFile(
    "test-nested/sub/TODO.md",
    `## TODO
- [ ] Parent task
  - [ ] Child task 1
  - [x] Child task 2
- [ ] Another parent
  - [ ] Nested item
`,
  );

  await runMergeCommand(join(testDir, "test-nested"), {
    interactive: false,
    dryRun: false,
    preserveSource: true,
  });

  const merged = await readTestFile("test-nested/TODO.md");

  // Check hierarchy is preserved
  const lines = merged.split("\n");
  const parentIndex = lines.findIndex((l) => l.includes("Parent task"));
  const child1Index = lines.findIndex((l) => l.includes("Child task 1"));
  const child2Index = lines.findIndex((l) => l.includes("Child task 2"));
  const nestedIndex = lines.findIndex((l) => l.includes("Nested item"));

  // Verify indentation
  assertEquals(lines[parentIndex].startsWith("- "), true);
  assertEquals(lines[child1Index].startsWith("  - "), true);
  assertEquals(lines[child2Index].startsWith("  - "), true);
  assertEquals(lines[nestedIndex].startsWith("  - "), true);

  // Verify checkboxes are preserved
  assertStringIncludes(lines[child2Index], "[x]");
});

Deno.test("merge command - no files to merge", async () => {
  await createTestFile("test-none/TODO.md", "# Main TODO\n");

  let output = "";
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await runMergeCommand(join(testDir, "test-none"), {
      interactive: false,
    });

    assertStringIncludes(output, "No TODO.md files found");
  } finally {
    console.log = originalLog;
  }
});

// Cleanup
Deno.test("cleanup temp directory", async () => {
  await Deno.remove(testDir, { recursive: true });
});
