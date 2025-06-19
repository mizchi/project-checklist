import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
import { runInitCommand } from "../src/init-command.ts";
import type { AutoResponse } from "../src/cli/auto-response.ts";

const testDir = await Deno.makeTempDir({ prefix: "pcheck_init_auto_test_" });

async function createTestFile(path: string, content: string) {
  const fullPath = join(testDir, path);
  await ensureDir(join(testDir, path.split("/").slice(0, -1).join("/")));
  await Deno.writeTextFile(fullPath, content);
}

async function readTestFile(path: string): Promise<string> {
  return await Deno.readTextFile(join(testDir, path));
}

Deno.test("init command - auto response for importing from README", async () => {
  const projectDir = join(testDir, "auto-import");
  await ensureDir(projectDir);

  // Create README.md with checklists
  await createTestFile(
    "auto-import/README.md",
    `# My Project

## Features
- [ ] Implement feature A
- [x] Complete feature B
- [ ] Design feature C

## Installation
Some text here
`,
  );

  // Auto responses: yes to import, yes to remove from README
  const autoResponse: AutoResponse = {
    promptResponses: [
      "y", // Yes to import tasks
      "y", // Yes to remove from README
      "1", // No config (option 1)
    ],
  };

  await runInitCommand(projectDir, {
    autoResponse,
  });

  // Check TODO.md was created with imported tasks
  const todoContent = await readTestFile("auto-import/TODO.md");
  assertStringIncludes(todoContent, "## TODO");
  assertStringIncludes(todoContent, "- [ ] Implement feature A");
  assertStringIncludes(todoContent, "- [ ] Design feature C");
  assertStringIncludes(todoContent, "## COMPLETED");
  assertStringIncludes(todoContent, "- Complete feature B");

  // Check README.md had checklists removed
  const readmeContent = await readTestFile("auto-import/README.md");
  assertEquals(readmeContent.includes("- [ ]"), false);
  assertEquals(readmeContent.includes("- [x]"), false);
  assertStringIncludes(readmeContent, "## Features"); // Headers remain
  assertStringIncludes(readmeContent, "Some text here"); // Other content remains
});

Deno.test("init command - auto response for config creation", async () => {
  const projectDir = join(testDir, "auto-config");
  await ensureDir(projectDir);

  // Auto responses for config creation
  const autoResponse: AutoResponse = {
    promptResponses: [
      "3", // Standard configuration
      // No code scanning prompt for option 3 (uses default)
    ],
  };

  await runInitCommand(projectDir, {
    autoResponse,
  });

  // Check TODO.md was created
  assertEquals(await exists(join(projectDir, "TODO.md")), true);

  // Check config was created
  const configPath = join(projectDir, "pcheck.config.json");
  assertEquals(await exists(configPath), true);

  const configContent = await readTestFile("auto-config/pcheck.config.json");
  const config = JSON.parse(configContent);

  // Should be standard config
  assertEquals(config.$schema, "./pcheck.schema.json");
  assertEquals(config.code.enabled, true);
  assertEquals(Array.isArray(config.code.patterns), true);
  assertStringIncludes(JSON.stringify(config.code.patterns), "TODO");
  assertStringIncludes(JSON.stringify(config.code.patterns), "FIXME");
});

Deno.test("init command - auto response declining import", async () => {
  const projectDir = join(testDir, "auto-decline");
  await ensureDir(projectDir);

  // Create README.md with checklists
  await createTestFile(
    "auto-decline/README.md",
    `# Project

- [ ] Task 1
- [x] Task 2
`,
  );

  // Auto responses: no to import tasks
  const autoResponse: AutoResponse = {
    promptResponses: [
      "n", // No to import tasks
      "1", // No config
    ],
  };

  await runInitCommand(projectDir, {
    autoResponse,
  });

  // Check TODO.md was created with default template
  const todoContent = await readTestFile("auto-decline/TODO.md");
  assertStringIncludes(todoContent, "Initial project setup");
  assertEquals(todoContent.includes("Task 1"), false);
  assertEquals(todoContent.includes("Task 2"), false);

  // Check README.md is unchanged
  const readmeContent = await readTestFile("auto-decline/README.md");
  assertStringIncludes(readmeContent, "- [ ] Task 1");
  assertStringIncludes(readmeContent, "- [x] Task 2");
});

Deno.test("init command - auto response with minimal config and no code scanning", async () => {
  const projectDir = join(testDir, "auto-minimal");
  await ensureDir(projectDir);

  // Auto responses for minimal config without code scanning
  const autoResponse: AutoResponse = {
    promptResponses: [
      "2", // Minimal configuration
      "n", // No to code scanning
    ],
  };

  await runInitCommand(projectDir, {
    autoResponse,
  });

  // Check config was created
  const configContent = await readTestFile("auto-minimal/pcheck.config.json");
  const config = JSON.parse(configContent);

  // Should have code scanning disabled
  assertEquals(config.code.enabled, false);
  assertEquals(Array.isArray(config.exclude), true);
});

Deno.test("init command - auto response with full config", async () => {
  const projectDir = join(testDir, "auto-full");
  await ensureDir(projectDir);

  // Auto response for full config (no additional prompts for option 4)
  const autoResponse: AutoResponse = {
    promptResponses: [
      "4", // Full configuration
    ],
  };

  await runInitCommand(projectDir, {
    autoResponse,
  });

  // Check config was created
  const configContent = await readTestFile("auto-full/pcheck.config.json");
  const config = JSON.parse(configContent);

  // Should be full config with all options
  assertEquals(config.$schema, "./pcheck.schema.json");
  assertEquals(config.code.enabled, true);
  assertEquals(config.languages !== undefined, true);
  assertEquals(config.search !== undefined, true);
  assertEquals(config.display.showLineNumbers, true);
  assertEquals(config.indentSize, 2);
});

Deno.test("init command - force overwrite with auto response", async () => {
  const projectDir = join(testDir, "auto-force");
  await ensureDir(projectDir);

  // Create existing TODO.md
  await createTestFile(
    "auto-force/TODO.md",
    `# Old TODO
- [ ] Old task
`,
  );

  // Auto response: no config
  const autoResponse: AutoResponse = {
    promptResponses: ["1"], // No config
  };

  await runInitCommand(projectDir, {
    force: true,
    autoResponse,
  });

  // Check TODO.md was overwritten
  const todoContent = await readTestFile("auto-force/TODO.md");
  assertStringIncludes(todoContent, "Initial project setup");
  assertEquals(todoContent.includes("Old task"), false);
});

// Cleanup
Deno.test("cleanup temp directory", async () => {
  await Deno.remove(testDir, { recursive: true });
});
