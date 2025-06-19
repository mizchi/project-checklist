import { assertEquals, assertStringIncludes } from "@std/assert";
import { runInitCommand } from "../src/init-command.ts";
import { join } from "@std/path";
import { exists } from "@std/fs/exists";

Deno.test("init creates TODO.md with default template", async () => {
  const testDir = await Deno.makeTempDir();

  await runInitCommand(testDir);

  const todoPath = join(testDir, "TODO.md");
  assertEquals(await exists(todoPath), true, "TODO.md should be created");

  const content = await Deno.readTextFile(todoPath);
  assertStringIncludes(content, "# TODO");
  assertStringIncludes(content, "## TODO");
  assertStringIncludes(content, "## ICEBOX");
  assertStringIncludes(content, "## COMPLETED");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("init creates TODO.md with GTD template", async () => {
  const testDir = await Deno.makeTempDir();

  await runInitCommand(testDir, { template: "gtd" });

  const todoPath = join(testDir, "TODO.md");
  const content = await Deno.readTextFile(todoPath);

  assertStringIncludes(content, "# TODO");
  assertStringIncludes(content, "## TODO");
  assertStringIncludes(content, "<!-- Active tasks that need to be done -->");
  assertStringIncludes(content, "## ICEBOX");
  assertStringIncludes(
    content,
    "<!-- Ideas and tasks for later consideration -->",
  );
  assertStringIncludes(content, "## COMPLETED");
  assertStringIncludes(content, "<!-- Finished tasks for reference -->");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("init does not overwrite existing TODO.md without --force", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create existing TODO.md
  await Deno.writeTextFile(todoPath, "# Existing TODO\n\nDo not overwrite!");

  // Capture console output
  let output = "";
  const originalLog = console.log;
  console.log = (msg: any) => {
    output += msg + "\n";
  };

  try {
    await runInitCommand(testDir);

    assertStringIncludes(output, "TODO.md already exists");

    // Check content wasn't changed
    const content = await Deno.readTextFile(todoPath);
    assertStringIncludes(content, "Do not overwrite!");
  } finally {
    console.log = originalLog;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("init overwrites existing TODO.md with --force", async () => {
  const testDir = await Deno.makeTempDir();
  const todoPath = join(testDir, "TODO.md");

  // Create existing TODO.md
  await Deno.writeTextFile(
    todoPath,
    "# Existing TODO\n\nThis will be overwritten!",
  );

  await runInitCommand(testDir, { force: true });

  const content = await Deno.readTextFile(todoPath);
  assertStringIncludes(content, "## ICEBOX");
  assertEquals(content.includes("This will be overwritten!"), false);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("init extracts checklists from README.md", async () => {
  const testDir = await Deno.makeTempDir();
  const readmePath = join(testDir, "README.md");

  // Create README.md with checklists
  await Deno.writeTextFile(
    readmePath,
    `# My Project

## Features
- [x] Basic functionality
- [ ] Advanced features
- [ ] Documentation

## Installation
Run npm install
`,
  );

  // Mock prompt to answer 'y' for import, 'n' for removal
  const originalPrompt = globalThis.prompt;
  const answers = ["y", "n"];
  let answerIndex = 0;
  globalThis.prompt = () => answers[answerIndex++];

  try {
    await runInitCommand(testDir);

    const todoPath = join(testDir, "TODO.md");
    const content = await Deno.readTextFile(todoPath);

    // Check unchecked tasks are in TODO section
    assertStringIncludes(
      content,
      "## TODO\n\n- [ ] Advanced features\n- [ ] Documentation",
    );

    // Check completed task is in COMPLETED section
    assertStringIncludes(content, "## COMPLETED");
    assertStringIncludes(content, "- Basic functionality");

    // Check README.md still has checklists (we answered 'n' to removal)
    const readmeContent = await Deno.readTextFile(readmePath);
    assertStringIncludes(readmeContent, "- [x] Basic functionality");
  } finally {
    globalThis.prompt = originalPrompt;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("init removes checklists from README.md when requested", async () => {
  const testDir = await Deno.makeTempDir();
  const readmePath = join(testDir, "README.md");

  // Create README.md with checklists
  await Deno.writeTextFile(
    readmePath,
    `# My Project

## Tasks
- [x] Setup project
- [ ] Write tests
- [ ] Add CI/CD

Regular text that should remain.
`,
  );

  // Mock prompt to answer 'y' for both import and removal
  const originalPrompt = globalThis.prompt;
  globalThis.prompt = () => "y";

  try {
    await runInitCommand(testDir);

    // Check README.md no longer has checklists
    const readmeContent = await Deno.readTextFile(readmePath);
    assertEquals(readmeContent.includes("- [x] Setup project"), false);
    assertEquals(readmeContent.includes("- [ ] Write tests"), false);
    assertEquals(readmeContent.includes("- [ ] Add CI/CD"), false);

    // But regular text remains
    assertStringIncludes(readmeContent, "Regular text that should remain.");
  } finally {
    globalThis.prompt = originalPrompt;
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("init handles no checklists in README.md", async () => {
  const testDir = await Deno.makeTempDir();
  const readmePath = join(testDir, "README.md");

  // Create README.md without checklists
  await Deno.writeTextFile(
    readmePath,
    `# My Project

Just a regular README without any checklists.
`,
  );

  // Capture console output
  let output = "";
  const originalLog = console.log;
  console.log = (msg: any) => {
    output += msg + "\n";
  };

  try {
    await runInitCommand(testDir);

    assertStringIncludes(output, "No checklists found in README.md");

    // TODO.md should still be created with default template
    const todoPath = join(testDir, "TODO.md");
    assertEquals(await exists(todoPath), true);
  } finally {
    console.log = originalLog;
    await Deno.remove(testDir, { recursive: true });
  }
});
