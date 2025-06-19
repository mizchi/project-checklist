import { assertEquals, assertStringIncludes } from "@std/assert";
import { $ } from "dax";
import { join } from "@std/path";

// Setup test directory
const tmpDir = join(Deno.cwd(), "tmp");
const testDir = join(tmpDir, "test-add-command");

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
  const result = await $`deno run --allow-read --allow-write ${
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

Deno.test("add command - basic task", async () => {
  const result = await pcheck("add", "-m", "Test task");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "✨ Created new TODO.md file");
  assertStringIncludes(result.stdout, "Added task to TODO section: Test task");

  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [ ] Test task");
});

Deno.test("add command - with priority", async () => {
  await Deno.writeTextFile(testTodoPath, "# TODO\n\n");

  const result = await pcheck("add", "-m", "High priority task", "-p", "high");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "Priority: HIGH");

  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [ ] [HIGH] High priority task");
});

Deno.test("add command - numeric priority", async () => {
  await Deno.writeTextFile(testTodoPath, "# TODO\n\n");

  const result = await pcheck("add", "-m", "Priority 3 task", "-p", "3");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "Priority: 3");

  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "- [ ] [3] Priority 3 task");
});

Deno.test("add command - invalid priority format", async () => {
  const result = await $`deno run --allow-read --allow-write ${
    join(Deno.cwd(), "src/cli.ts")
  } add -m "Bad priority" -p "5high"`
    .cwd(testDir)
    .quiet()
    .noThrow();

  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "Invalid priority format");
});

Deno.test("add command - to ICEBOX section", async () => {
  await Deno.writeTextFile(testTodoPath, "# TODO\n\n## ICEBOX\n\n");

  const result = await pcheck("add", "ICEBOX", "-m", "Future feature");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "Added task to ICEBOX section:");

  const content = await Deno.readTextFile(testTodoPath);
  const lines = content.split("\n");
  const iceboxIndex = lines.findIndex((l) => l === "## ICEBOX");
  const taskIndex = lines.findIndex((l) => l.includes("Future feature"));

  // Task should be after ICEBOX header
  assertEquals(taskIndex > iceboxIndex, true);
});

Deno.test("add command - creates new section", async () => {
  await Deno.writeTextFile(testTodoPath, "# TODO\n\n");

  const result = await pcheck("add", "BACKLOG", "-m", "Backlog item");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "Added task to BACKLOG section:");

  const content = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(content, "## BACKLOG");
  assertStringIncludes(content, "- [ ] Backlog item");
});

// Cleanup
Deno.test("cleanup", async () => {
  await Deno.remove(testDir, { recursive: true });
});
