import { assertEquals, assertStringIncludes } from "@std/assert";
import { $ } from "dax";
import { join } from "@std/path";

// Setup test directory
const tmpDir = join(Deno.cwd(), "tmp");
const testDir = join(tmpDir, "test-check-command");

// Ensure tmp directory exists and clean up test directory
await Deno.mkdir(tmpDir, { recursive: true });
try {
  await Deno.remove(testDir, { recursive: true });
} catch {
  // Ignore error if directory doesn't exist
}
await Deno.mkdir(testDir, { recursive: true });

const testTodoPath = join(testDir, "TODO.md");

// Helper to run pcheck command
async function pcheck(...args: string[]) {
  const result = await $`deno run --allow-read --allow-write --allow-run ${
    join(Deno.cwd(), "src/cli.ts")
  } ${args}`
    .cwd(testDir)
    .quiet();
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.code,
  };
}

Deno.test("check command - toggle task by ID", async () => {
  // Create test TODO.md with tasks
  await Deno.writeTextFile(
    testTodoPath,
    `# TODO

- [ ] First task
- [x] Second task
- [ ] Third task
`,
  );

  // Get tasks with IDs
  const listResult = await pcheck("--show-ids");
  assertEquals(listResult.code, 0);

  // Extract ID of first task
  const idMatch = listResult.stdout.match(/\[ \] First task \[([a-f0-9]{8})\]/);
  const firstTaskId = idMatch?.[1];

  if (!firstTaskId) {
    throw new Error("Could not find task ID");
  }

  // Toggle first task to checked
  const checkResult = await pcheck("check", firstTaskId);
  assertEquals(checkResult.code, 0);
  assertStringIncludes(checkResult.stdout, "✨ Updated checklist item");
  assertStringIncludes(checkResult.stdout, "First task");
  assertStringIncludes(checkResult.stdout, "unchecked → checked");

  // Verify it was checked
  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [x] First task");
});

Deno.test("check command - uncheck with --off", async () => {
  await Deno.writeTextFile(
    testTodoPath,
    `# TODO

- [x] Checked task
`,
  );

  // Get ID
  const listResult = await pcheck("--show-ids");
  const idMatch = listResult.stdout.match(
    /\[x\] Checked task \[([a-f0-9]{8})\]/,
  );
  const taskId = idMatch?.[1];

  if (!taskId) {
    throw new Error("Could not find task ID");
  }

  // Uncheck with --off
  const checkResult = await pcheck("check", taskId, "--off");
  assertEquals(checkResult.code, 0);
  assertStringIncludes(checkResult.stdout, "checked → unchecked");

  // Verify it was unchecked
  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [ ] Checked task");
});

Deno.test("check command - check with --on", async () => {
  await Deno.writeTextFile(
    testTodoPath,
    `# TODO

- [ ] Unchecked task
`,
  );

  // Get ID
  const listResult = await pcheck("--show-ids");
  const idMatch = listResult.stdout.match(
    /\[ \] Unchecked task \[([a-f0-9]{8})\]/,
  );
  const taskId = idMatch?.[1];

  if (!taskId) {
    throw new Error("Could not find task ID");
  }

  // Check with --on
  const checkResult = await pcheck("check", taskId, "--on");
  assertEquals(checkResult.code, 0);
  assertStringIncludes(checkResult.stdout, "unchecked → checked");

  // Verify it was checked
  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [x] Unchecked task");
});

Deno.test("check command - invalid ID", async () => {
  await Deno.writeTextFile(
    testTodoPath,
    `# TODO

- [ ] Task
`,
  );

  const result = await $`deno run --allow-read --allow-write --allow-run ${
    join(Deno.cwd(), "src/cli.ts")
  } check invalid123`
    .cwd(testDir)
    .quiet()
    .noThrow();

  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No item found with ID: invalid123");
});

Deno.test("check command - with nested tasks", async () => {
  await Deno.writeTextFile(
    testTodoPath,
    `# TODO

- [ ] Parent task
  - [ ] Nested task
    - [ ] Deep nested task
`,
  );

  // Get nested task ID
  const listResult = await pcheck("--show-ids");
  const idMatch = listResult.stdout.match(
    /\[ \] Nested task \[([a-f0-9]{8})\]/,
  );
  const nestedTaskId = idMatch?.[1];

  if (!nestedTaskId) {
    throw new Error("Could not find nested task ID");
  }

  // Toggle nested task
  const checkResult = await pcheck("check", nestedTaskId);
  assertEquals(checkResult.code, 0);

  // Verify only the nested task was checked
  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [ ] Parent task");
  assertStringIncludes(content, "  - [x] Nested task");
  assertStringIncludes(content, "    - [ ] Deep nested task");
});

// Cleanup
Deno.test("cleanup", async () => {
  await Deno.remove(testDir, { recursive: true });
});
