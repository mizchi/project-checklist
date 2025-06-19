import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { runUpdateCommand } from "../src/update-command.ts";
import type { AutoResponse } from "../src/cli/auto-response.ts";

const testDir = await Deno.makeTempDir({ prefix: "pcheck_update_auto_test_" });

async function createTestFile(path: string, content: string) {
  const fullPath = join(testDir, path);
  await ensureDir(join(testDir, path.split("/").slice(0, -1).join("/")));
  await Deno.writeTextFile(fullPath, content);
}

async function readTestFile(path: string): Promise<string> {
  return await Deno.readTextFile(join(testDir, path));
}

Deno.test("update command - auto response for priority sorting", async () => {
  await createTestFile(
    "auto-priority/TODO.md",
    `# TODO

## TODO
- [ ] Low priority task
- [ ] [HIGH] Important task
- [ ] [MID] Medium task
- [ ] Another low task
`,
  );

  // Auto response: yes to sort by priority, no to moving completed tasks
  const autoResponse: AutoResponse = {
    confirmResponses: [true], // Yes to sort by priority
  };

  await runUpdateCommand(join(testDir, "auto-priority/TODO.md"), {
    autoResponse,
    skipValidation: true,
  });

  const content = await readTestFile("auto-priority/TODO.md");
  const lines = content.split("\n");

  // Find task positions
  const highIndex = lines.findIndex((l) => l.includes("[HIGH] Important task"));
  const midIndex = lines.findIndex((l) => l.includes("[MID] Medium task"));
  const lowIndex = lines.findIndex((l) => l.includes("Low priority task"));

  // High priority should come before mid priority
  assertEquals(highIndex < midIndex, true);
  // Mid priority should come before low priority
  assertEquals(midIndex < lowIndex, true);
});

Deno.test("update command - auto response for moving completed tasks", async () => {
  await createTestFile(
    "auto-completed/TODO.md",
    `# TODO

## TODO
- [ ] Active task 1
- [x] Completed task
- [ ] Active task 2
  - [x] Completed subtask
  - [ ] Active subtask
`,
  );

  // Auto response: yes to move completed (no priority prompts since no priority tasks)
  const autoResponse: AutoResponse = {
    confirmResponses: [true], // Yes to move completed
  };

  await runUpdateCommand(join(testDir, "auto-completed/TODO.md"), {
    autoResponse,
    skipValidation: true,
  });

  const content = await readTestFile("auto-completed/TODO.md");

  // Should have COMPLETED section
  assertStringIncludes(content, "## COMPLETED");

  // Completed task should be in COMPLETED section
  const completedSectionStart = content.indexOf("## COMPLETED");
  const completedTaskIndex = content.indexOf("Completed task");
  assertEquals(completedTaskIndex > completedSectionStart, true);

  // Active tasks should remain in TODO section
  assertStringIncludes(
    content.substring(0, completedSectionStart),
    "Active task 1",
  );
  assertStringIncludes(
    content.substring(0, completedSectionStart),
    "Active task 2",
  );
});

Deno.test("update command - auto response when no operations apply", async () => {
  // Create a TODO with no priority and no completed tasks
  await createTestFile(
    "auto-no-ops/TODO.md",
    `# TODO

## TODO
- [ ] Simple task 1
- [ ] Simple task 2
`,
  );

  // Auto response shouldn't be needed since no prompts will appear
  const autoResponse: AutoResponse = {
    confirmResponses: [],
  };

  let output = "";
  const originalLog = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await runUpdateCommand(join(testDir, "auto-no-ops/TODO.md"), {
      autoResponse,
      skipValidation: true,
    });

    // Should indicate no operations were applicable
    assertStringIncludes(
      output,
      "No tasks with priority or completed tasks found",
    );
  } finally {
    console.log = originalLog;
  }
});

Deno.test("update command - auto response with both operations", async () => {
  await createTestFile(
    "auto-both/TODO.md",
    `# TODO

## TODO
- [ ] [LOW] Low priority
- [x] [HIGH] Completed high priority
- [ ] [HIGH] Active high priority
- [x] Completed normal
`,
  );

  // Auto response: yes to both sort and move completed
  const autoResponse: AutoResponse = {
    confirmResponses: [true, true], // Yes to sort, Yes to move completed
  };

  await runUpdateCommand(join(testDir, "auto-both/TODO.md"), {
    autoResponse,
    skipValidation: true,
  });

  const content = await readTestFile("auto-both/TODO.md");
  const lines = content.split("\n");

  // Check sorting in TODO section
  const todoSection = content.substring(
    content.indexOf("## TODO"),
    content.indexOf("## COMPLETED"),
  );
  const activeHighIndex = todoSection.indexOf("[HIGH] Active high priority");
  const lowIndex = todoSection.indexOf("[LOW] Low priority");
  assertEquals(activeHighIndex < lowIndex, true);

  // Check completed tasks moved
  assertStringIncludes(content, "## COMPLETED");
  const completedSection = content.substring(content.indexOf("## COMPLETED"));
  assertStringIncludes(completedSection, "Completed high priority");
  assertStringIncludes(completedSection, "Completed normal");
});

// Cleanup
Deno.test("cleanup temp directory", async () => {
  await Deno.remove(testDir, { recursive: true });
});
