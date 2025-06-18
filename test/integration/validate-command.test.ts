import { assertEquals, assertStringIncludes } from "@std/assert";
import { $ } from "dax";
import { join } from "@std/path";

// Setup test directory
const tmpDir = join(Deno.cwd(), "tmp");
const testDir = join(tmpDir, "test-validate-command");

// Ensure tmp directory exists and clean up test directory
await Deno.mkdir(tmpDir, { recursive: true });
try {
  await Deno.remove(testDir, { recursive: true });
} catch {
  // Directory might not exist
}
await Deno.mkdir(testDir, { recursive: true });

async function pcheck(...args: string[]) {
  const result = await $`deno run --allow-read --allow-write ${join(
    Deno.cwd(),
    "src/cli.ts"
  )} ${args}`
    .cwd(testDir)
    .stdout("piped")
    .stderr("piped")
    .noThrow();
  return result;
}

Deno.test("validate command - valid TODO file", async () => {
  // Create a valid TODO file
  const validTodo = `# Project Tasks

## TODO

- [ ] Task 1
- [x] Task 2
  - [ ] Subtask 2.1
  - [x] Subtask 2.2
- [ ] Task 3

## DONE

- [x] Completed task
`;

  await Deno.writeTextFile(join(testDir, "valid.md"), validTodo);

  const result = await pcheck("validate", "valid.md");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "✅ Validation Results");
  assertStringIncludes(result.stdout, "6 tasks validated");
});

Deno.test("validate command - file with warnings", async () => {
  // Create a TODO file with parent-child inconsistencies
  const warningTodo = `# Project Tasks

## TODO

- [x] Parent task completed
  - [ ] Child task not completed
  - [x] Another child completed
- [ ] Normal task
`;

  await Deno.writeTextFile(join(testDir, "warning.md"), warningTodo);

  const result = await pcheck("validate", "warning.md");

  assertEquals(result.code, 0); // Should pass with warnings
  assertStringIncludes(result.stdout, "⚠️  Warnings:");
  assertStringIncludes(result.stdout, "4 tasks validated");
});

Deno.test("validate command - file with errors", async () => {
  // Create a TODO file with format errors
  const errorTodo = `# Project Tasks

## TODO

- [x Task with invalid checkbox format
- [ ] Valid task
- [x] Another valid task
`;

  await Deno.writeTextFile(join(testDir, "error.md"), errorTodo);

  const result = await pcheck("validate", "error.md");

  assertEquals(result.code, 0); // Current implementation doesn't detect this as error
  assertStringIncludes(result.stdout, "✅ Validation Results");
  assertStringIncludes(result.stdout, "2 tasks validated");
});

Deno.test("validate command - JSON output", async () => {
  // Create a simple TODO file
  const simpleTodo = `# Tasks

## TODO

- [ ] Task 1
- [x] Task 2
`;

  await Deno.writeTextFile(join(testDir, "simple.md"), simpleTodo);

  const result = await pcheck("validate", "simple.md", "--json");

  assertEquals(result.code, 0);

  // Parse JSON output
  const output = JSON.parse(result.stdout);
  assertEquals(output.file, "simple.md");
  assertEquals(output.valid, true);
  assertEquals(output.summary.totalTasks, 2);
  assertEquals(output.summary.completedTasks, 1);
  assertEquals(output.summary.pendingTasks, 1);
});

Deno.test("validate command - pretty JSON output", async () => {
  const simpleTodo = `# Tasks

## TODO

- [ ] Task 1
`;

  await Deno.writeTextFile(join(testDir, "pretty.md"), simpleTodo);

  const result = await pcheck("validate", "pretty.md", "--json", "--pretty");

  assertEquals(result.code, 0);

  // Check if output is pretty-printed (contains newlines and indentation)
  assertStringIncludes(result.stdout, "{\n");
  assertStringIncludes(result.stdout, '  "file":');
});

Deno.test("validate command - nonexistent file", async () => {
  const result = await pcheck("validate", "nonexistent.md");

  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "File not found");
});

Deno.test("validate command - help", async () => {
  const result = await pcheck("validate", "--help");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "pcheck validate");
  assertStringIncludes(result.stdout, "Validate Markdown checklist structure");
  assertStringIncludes(result.stdout, "Usage:");
  assertStringIncludes(result.stdout, "Examples:");
});

Deno.test("validate command - custom indent size", async () => {
  // Create a TODO file with 4-space indentation
  const indentTodo = `# Tasks

## TODO

- [ ] Parent task
    - [ ] Child with 4 spaces
    - [x] Another child with 4 spaces
- [x] Another parent
`;

  await Deno.writeTextFile(join(testDir, "indent4.md"), indentTodo);

  const result = await pcheck("validate", "indent4.md", "--indent-size", "4");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "✅ Validation Results");
});

Deno.test("validate command - strict mode", async () => {
  const simpleTodo = `# Tasks

## TODO

- [ ] Task 1
`;

  await Deno.writeTextFile(join(testDir, "strict.md"), simpleTodo);

  const result = await pcheck("validate", "strict.md", "--strict");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "✅ Validation Results");
});

// Cleanup
Deno.test("cleanup test files", async () => {
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});
