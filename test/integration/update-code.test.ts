import { assertEquals } from "@std/assert/equals";
import { join } from "@std/path";
import { runUpdateCommand } from "../../src/update-command.ts";

Deno.test("update --code creates TODO.md with checklists from code", async () => {
  const testDir = await Deno.makeTempDir();
  
  // Create code file with checklists
  await Deno.writeTextFile(
    join(testDir, "code.ts"),
    `// - [ ] Implement feature A
// - [x] Complete feature B
// - [ ] Fix bug C`
  );
  
  // Mock prompt to return 'y'
  const originalPrompt = globalThis.prompt;
  globalThis.prompt = () => "y";
  
  try {
    await runUpdateCommand(join(testDir, "TODO.md"), { code: true });
    
    // Check TODO.md was created
    const todoContent = await Deno.readTextFile(join(testDir, "TODO.md"));
    assertEquals(todoContent.includes("- [ ] Implement feature A"), true);
    assertEquals(todoContent.includes("- [x] Complete feature B"), true);
    assertEquals(todoContent.includes("- [ ] Fix bug C"), true);
  } finally {
    globalThis.prompt = originalPrompt;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("update --code adds to existing TODO.md", async () => {
  const testDir = await Deno.makeTempDir();
  
  // Create existing TODO.md
  await Deno.writeTextFile(
    join(testDir, "TODO.md"),
    `# TODO

## Tasks
- [ ] Existing task

## Done
- [x] Completed task`
  );
  
  // Create code file with checklists
  await Deno.writeTextFile(
    join(testDir, "code.ts"),
    `// - [ ] New task from code
// - [x] Another completed task`
  );
  
  await runUpdateCommand(join(testDir, "TODO.md"), { code: true });
  
  // Check checklists were added
  const todoContent = await Deno.readTextFile(join(testDir, "TODO.md"));
  assertEquals(todoContent.includes("- [ ] Existing task"), true);
  assertEquals(todoContent.includes("- [ ] New task from code"), true);
  assertEquals(todoContent.includes("- [x] Another completed task"), true);
  
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("update --code adds TODO section to README.md", async () => {
  const testDir = await Deno.makeTempDir();
  
  // Create README.md
  await Deno.writeTextFile(
    join(testDir, "README.md"),
    `# My Project

This is a test project.`
  );
  
  // Create code file with checklists
  await Deno.writeTextFile(
    join(testDir, "code.ts"),
    `// - [ ] Task from code`
  );
  
  await runUpdateCommand(join(testDir, "TODO.md"), { code: true });
  
  // Check README.md was updated
  const readmeContent = await Deno.readTextFile(join(testDir, "README.md"));
  assertEquals(readmeContent.includes("## TODO"), true);
  assertEquals(readmeContent.includes("- [ ] Task from code"), true);
  
  await Deno.remove(testDir, { recursive: true });
});