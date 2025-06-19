import { assertEquals, assertStringIncludes } from "@std/assert";
import { runUpdateCommand } from "../src/update-command.ts";
import { join } from "@std/path";

Deno.test("update validates file before processing", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create TODO.md with validation issues (inconsistent indentation)
  await Deno.writeTextFile(
    todoPath,
    `# TODO

## Tasks
- [ ] Task 1
   - [ ] Subtask with wrong indent (3 spaces)
  - [ ] Another subtask
- [ ] Task 2
`,
  );

  // Capture console output
  let output = "";
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (msg: any) => {
    output += msg + "\n";
  };
  console.error = (msg: any) => {
    output += msg + "\n";
  };

  try {
    // Try to update without fix - should fail
    await runUpdateCommand(todoPath, { completed: true });

    console.log = originalLog;
    console.error = originalError;
    console.log("Captured output:", output);

    // Should show validation error
    assertStringIncludes(output, "Validation failed");
    assertStringIncludes(output, "Use --fix to attempt automatic fixes");
  } finally {
    console.log = originalLog;
    console.error = originalError;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("update with --fix fixes validation issues", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create TODO.md with validation issues
  await Deno.writeTextFile(
    todoPath,
    `# TODO

## Tasks
- [x] Completed task
   - [x] Subtask with wrong indent (3 spaces)
- [ ] Uncompleted task
  - [ ] Proper subtask

## COMPLETED
`,
  );

  await runUpdateCommand(todoPath, { completed: true, fix: true });

  const content = await Deno.readTextFile(todoPath);

  // Check that indentation was fixed (3 spaces -> 2 spaces)
  const lines = content.split("\n");
  const hasThreeSpaceIndent = lines.some((line) => line.startsWith("   - "));
  assertEquals(
    hasThreeSpaceIndent,
    false,
    "Should not have 3-space indents at the start of lines",
  );

  // Check that completed tasks were moved
  assertStringIncludes(content, "## COMPLETED");
  assertStringIncludes(content, "- Completed task");
  assertStringIncludes(content, "    - Subtask with wrong indent");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("update with --skip-validation bypasses validation", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create TODO.md with validation issues
  await Deno.writeTextFile(
    todoPath,
    `# TODO

## Tasks
- [x] Task with bad indent
   - [x] Subtask (3 spaces)

## COMPLETED
`,
  );

  // Should succeed even with validation issues
  await runUpdateCommand(todoPath, { completed: true, skipValidation: true });

  const content = await Deno.readTextFile(todoPath);

  // Completed tasks should be moved even with bad indentation
  assertStringIncludes(content, "## COMPLETED");
  assertStringIncludes(content, "- Task with bad indent");

  // Bad indentation is preserved when validation is skipped
  assertStringIncludes(content, "   - Subtask (3 spaces)");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("update --code bypasses validation", async () => {
  const testDir = await Deno.makeTempDir();
  const codeFile = join(testDir, "app.ts");

  // Create code file with checklists
  await Deno.writeTextFile(
    codeFile,
    `// - [ ] Implement feature
// - [x] Write tests`,
  );

  // Mock prompt to answer 'y'
  const originalPrompt = globalThis.prompt;
  globalThis.prompt = () => "y";

  // Capture console output
  let output = "";
  const originalLog = console.log;
  console.log = (msg: any) => {
    output += msg + "\n";
  };

  try {
    await runUpdateCommand(join(testDir, "TODO.md"), { code: true });

    // Should not run validation for --code option
    assertEquals(output.includes("Validating"), false);
    assertStringIncludes(output, "checklist items in code comments");
  } finally {
    console.log = originalLog;
    globalThis.prompt = originalPrompt;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("update fixes multiple validation issues", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create TODO.md with multiple validation issues
  await Deno.writeTextFile(
    todoPath,
    `# TODO

## Tasks
- [ ] Task 1
   - [ ] Wrong indent (3 spaces)
     - [ ] Nested wrong (5 spaces)
- [ ] Task 2
 - [ ] Wrong indent (1 space)
    - [ ] Deep nested (4 spaces)

## COMPLETED
`,
  );

  // Capture console output
  let output = "";
  const originalLog = console.log;
  console.log = (msg: any) => {
    output += msg + "\n";
  };

  try {
    await runUpdateCommand(todoPath, { sort: true, fix: true });

    assertStringIncludes(output, "Fixed validation issues");

    const content = await Deno.readTextFile(todoPath);

    // All indentations should be fixed to multiples of 2
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(/^(\s*)-\s*\[/);
      if (match) {
        const indent = match[1].length;
        assertEquals(
          indent % 2,
          0,
          `Indent should be multiple of 2, got ${indent} in line: ${line}`,
        );
      }
    }
  } finally {
    console.log = originalLog;
    await Deno.remove(testDir, { recursive: true });
  }
});
