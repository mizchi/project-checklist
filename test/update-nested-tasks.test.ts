import { assertEquals } from "@std/assert";
import { runUpdateCommand } from "../src/update-command.ts";
import { join } from "@std/path";

Deno.test("update --done preserves nested structure", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  // Create TODO.md with nested tasks
  await Deno.writeTextFile(
    todoFile,
    `# TODO

## Tasks
- [x] Implement main feature
  - [x] Design API
  - [x] Write tests
  - [ ] Add documentation
- [ ] Fix bugs
  - [x] Bug #1234
  - [ ] Bug #5678
- [x] Update dependencies
  - [x] Update Deno to 2.x
  - [ ] Update other deps

## COMPLETED
- Previous task 1
- Previous task 2
`,
  );

  console.log("Running update command with --done option");
  await runUpdateCommand(todoFile, { completed: true });

  const content = await Deno.readTextFile(todoFile);
  console.log("Updated content:\n", content);

  // Check that nested structure is preserved (with checkboxes)
  assertEquals(content.includes("- [x] Implement main feature"), true);
  assertEquals(content.includes("  - [x] Design API"), true);
  assertEquals(content.includes("  - [x] Write tests"), true);

  // Check that completed subtask under incomplete parent is included
  assertEquals(content.includes("- Bug #1234"), true);

  // Check that incomplete tasks are not moved
  assertEquals(content.includes("- [ ] Fix bugs"), true);
  assertEquals(content.includes("  - [ ] Bug #5678"), true);

  // Check that tasks are in COMPLETED section
  const completedIndex = content.indexOf("## COMPLETED");
  const mainFeatureIndex = content.indexOf("- [x] Implement main feature");
  assertEquals(mainFeatureIndex > completedIndex, true);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test.ignore("update --done avoids duplicates using fuzzy matching", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  // Create TODO.md with tasks that have slight variations
  await Deno.writeTextFile(
    todoFile,
    `# TODO

## Tasks
- [x] Implement user authentication
- [x] Add user authentication feature
- [x] Setup database connection
- [x] Set up database connections

## COMPLETED
- Implement user authentication
- Setup database connection
`,
  );

  await runUpdateCommand(todoFile, { completed: true });

  const content = await Deno.readTextFile(todoFile);

  // Count occurrences of similar tasks in COMPLETED section
  const lines = content.split("\n");
  const completedIndex = lines.findIndex((line) => line === "## COMPLETED");
  const completedSection = lines.slice(completedIndex);

  // Should not have duplicate entries for similar tasks
  const authTasks = completedSection.filter((line) =>
    line.toLowerCase().includes("user") && line.toLowerCase().includes("auth")
  );
  const dbTasks = completedSection.filter((line) =>
    line.toLowerCase().includes("database") &&
    line.toLowerCase().includes("connect")
  );

  // With fuzzy matching, similar tasks should not be duplicated
  assertEquals(
    authTasks.length <= 2,
    true,
    "Should not duplicate authentication tasks",
  );
  assertEquals(
    dbTasks.length <= 2,
    true,
    "Should not duplicate database tasks",
  );

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("update --done handles deeply nested tasks", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  // Create TODO.md with deeply nested tasks
  await Deno.writeTextFile(
    todoFile,
    `# TODO

## Development
- [x] Frontend development
  - [x] Create components
    - [x] Header component
      - [x] Add navigation
      - [x] Add logo
    - [ ] Footer component
  - [ ] Add styling
- [ ] Backend development
  - [x] API endpoints
    - [x] User endpoints
      - [x] GET /users
      - [x] POST /users
    - [ ] Product endpoints

## COMPLETED
`,
  );

  await runUpdateCommand(todoFile, { completed: true });

  const content = await Deno.readTextFile(todoFile);
  console.log("Content after update:\n", content);

  // Check that deeply nested completed tasks maintain structure (with checkboxes)
  assertEquals(content.includes("- [x] Frontend development"), true);
  assertEquals(content.includes("  - [x] Create components"), true);
  assertEquals(content.includes("    - [x] Header component"), true);
  assertEquals(content.includes("      - [x] Add navigation"), true);
  assertEquals(content.includes("      - [x] Add logo"), true);

  // Check completed subtasks under incomplete parent are in COMPLETED
  const completedIndex = content.indexOf("## COMPLETED");
  const apiEndpointsIndex = content.indexOf("- API endpoints");
  assertEquals(
    apiEndpointsIndex > completedIndex,
    true,
    "API endpoints should be in COMPLETED section",
  );
  assertEquals(content.includes("  - User endpoints"), true);
  assertEquals(content.includes("    - GET /users"), true);

  // Incomplete tasks should remain in original section
  assertEquals(content.includes("- [ ] Backend development"), true);
  // Note: Product endpoints is moved with its parent (API endpoints) even though it's incomplete
  // This is by design - when a parent task is marked complete, all children move with it

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("update --done preserves task priority markers", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  // Create TODO.md with priority markers
  await Deno.writeTextFile(
    todoFile,
    `# TODO

## High Priority
- [x] [HIGH] Critical security fix
  - [x] Patch vulnerability
  - [x] Update dependencies
- [x] [P1] Performance optimization
  - [x] Optimize database queries
  - [ ] Add caching

## Medium Priority  
- [ ] [MID] Refactor codebase
  - [x] [P2] Refactor authentication
  - [ ] Refactor API layer

## COMPLETED
`,
  );

  await runUpdateCommand(todoFile, { completed: true });

  const content = await Deno.readTextFile(todoFile);

  // Priority markers should be removed in COMPLETED section but checkboxes preserved
  assertEquals(content.includes("- [x] Critical security fix"), true);
  assertEquals(content.includes("- [x] Performance optimization"), true);
  assertEquals(content.includes("- Refactor authentication"), true);

  // But not the [HIGH], [P1], etc. markers
  const completedIndex = content.indexOf("## COMPLETED");
  const completedSection = content.substring(completedIndex);
  assertEquals(completedSection.includes("[HIGH]"), false);
  assertEquals(completedSection.includes("[P1]"), false);
  assertEquals(completedSection.includes("[P2]"), false);

  await Deno.remove(testDir, { recursive: true });
});
