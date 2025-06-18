import { assertEquals, assertStringIncludes } from "@std/assert";
import { $ } from "dax";
import { join } from "@std/path";

// Test directory setup
const testDir = "./tmp/test-update-command";
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

// Setup before tests
async function setup() {
  // Create test directory
  await Deno.mkdir(testDir, { recursive: true });

  // Clean up any existing test files
  try {
    await Deno.remove(testTodoPath);
  } catch {
    // File doesn't exist, that's fine
  }
}

Deno.test("update command - sort by priority", async () => {
  await setup();

  // Create test TODO.md with mixed priorities
  const content = `# TODO

- [ ] [LOW] Low priority task
- [ ] No priority task
- [ ] [HIGH] High priority task
- [ ] [MID] Medium priority task
`;

  await Deno.writeTextFile(testTodoPath, content);

  // Run update with --priority
  const result = await pcheck("update", "--priority");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "sorted by priority");

  // Check the file was sorted correctly
  const sorted = await Deno.readTextFile(testTodoPath);
  const lines = sorted.split("\n");

  // Find task order
  const taskLines = lines.filter((l) => l.startsWith("- [ ]"));
  assertEquals(taskLines[0], "- [ ] [HIGH] High priority task");
  assertEquals(taskLines[1], "- [ ] [MID] Medium priority task");
  assertEquals(taskLines[2], "- [ ] [LOW] Low priority task");
  assertEquals(taskLines[3], "- [ ] No priority task");
});

Deno.test("update command - move completed tasks to DONE", async () => {
  await setup();

  // Create test TODO.md with completed tasks
  const content = `# TODO

- [ ] Uncompleted task
- [x] Completed task 1
- [ ] Another uncompleted
- [x] Completed task 2
`;

  await Deno.writeTextFile(testTodoPath, content);

  // Run update with --done
  const result = await pcheck("update", "--done");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "moved 2 completed tasks to DONE");

  // Check the file was updated correctly
  const updated = await Deno.readTextFile(testTodoPath);
  assertStringIncludes(updated, "## DONE");
  assertStringIncludes(updated, "- Completed task 1");
  assertStringIncludes(updated, "- Completed task 2");

  // Check completed tasks were removed from TODO section
  const todoSection = updated.split("## DONE")[0];
  assertEquals(todoSection.includes("[x]"), false);
});

Deno.test("update command - sort and move combined", async () => {
  await setup();

  // Create test TODO.md with mixed priorities and completed tasks
  const content = `# TODO

- [ ] [LOW] Low priority
- [x] [HIGH] Completed high priority
- [ ] [HIGH] Uncompleted high priority
- [x] No priority completed
`;

  await Deno.writeTextFile(testTodoPath, content);

  // Run update with both options
  const result = await pcheck("update", "--priority", "--done");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "sorted by priority");
  assertStringIncludes(result.stdout, "moved 2 completed tasks to DONE");

  // Check the result
  const updated = await Deno.readTextFile(testTodoPath);

  // TODO section should only have uncompleted, sorted by priority
  const todoSection = updated.split("## DONE")[0];
  const todoTasks = todoSection.split("\n").filter((l) =>
    l.startsWith("- [ ]")
  );
  assertEquals(todoTasks[0], "- [ ] [HIGH] Uncompleted high priority");
  assertEquals(todoTasks[1], "- [ ] [LOW] Low priority");

  // DONE section should have completed tasks
  assertStringIncludes(updated, "- Completed high priority");
  assertStringIncludes(updated, "- No priority completed");
});

Deno.test("update command - force clear DONE section", async () => {
  await setup();

  // Create test TODO.md with DONE section
  const content = `# TODO

- [ ] Active task

## DONE

- Old completed task 1
- Old completed task 2
`;

  await Deno.writeTextFile(testTodoPath, content);

  // Run update with --force-clear
  const result = await pcheck("update", "--force-clear");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "cleared DONE section");

  // Check DONE section was removed
  const updated = await Deno.readTextFile(testTodoPath);
  assertEquals(updated.includes("## DONE"), false);
  assertEquals(updated.includes("Old completed task"), false);
});

Deno.test("update command - u alias works", async () => {
  await setup();

  // Create simple TODO.md
  const content = `# TODO

- [ ] Test task
`;

  await Deno.writeTextFile(testTodoPath, content);

  // Run with 'u' alias
  const result = await pcheck("u", "--priority");

  assertEquals(result.code, 0);
  assertStringIncludes(result.stdout, "sorted by priority");
});

// Cleanup after all tests
Deno.test("cleanup", async () => {
  try {
    await Deno.remove(testDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});
