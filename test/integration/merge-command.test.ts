import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";

const testDir = await Deno.makeTempDir({ prefix: "pcheck_merge_cli_test_" });

async function createTestFile(path: string, content: string) {
  const fullPath = join(testDir, path);
  await ensureDir(join(testDir, path.split("/").slice(0, -1).join("/")));
  await Deno.writeTextFile(fullPath, content);
}

async function runPcheck(
  args: string[],
): Promise<{ output: string; success: boolean }> {
  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-write",
      join(import.meta.dirname!, "../../src/cli.ts"),
      ...args,
    ],
    cwd: testDir,
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, stderr, success } = await command.output();
  const output = new TextDecoder().decode(stdout) +
    new TextDecoder().decode(stderr);
  return { output, success };
}

Deno.test("CLI merge command - basic merge", async () => {
  // Setup test files
  await createTestFile(
    "basic/TODO.md",
    `# Project TODO

## TODO
- [ ] Main task
`,
  );

  await createTestFile(
    "basic/module/TODO.md",
    `# Module TODO

## TODO
- [ ] Module task 1
- [ ] Module task 2
`,
  );

  // Run merge command
  const { output, success } = await runPcheck([
    "merge",
    "basic",
    "--preserve",
    "--all",
  ]);

  assertEquals(success, true);
  assertStringIncludes(output, "Merged 1 files");

  // Verify merged content
  const merged = await Deno.readTextFile(join(testDir, "basic/TODO.md"));
  assertStringIncludes(merged, "Main task");
  assertStringIncludes(merged, "Module task 1");
  assertStringIncludes(merged, "Module task 2");
});

Deno.test("CLI merge command - dry run", async () => {
  await createTestFile("dry-run/TODO.md", "# Main\n");
  await createTestFile(
    "dry-run/sub/TODO.md",
    `## TODO
- [ ] Test task
`,
  );

  const { output, success } = await runPcheck([
    "merge",
    "dry-run",
    "--dry-run",
    "--all",
  ]);

  assertEquals(success, true);
  assertStringIncludes(output, "DRY RUN");
  assertStringIncludes(output, "Test task");
  assertStringIncludes(output, "Would merge");

  // Original should be unchanged
  const original = await Deno.readTextFile(join(testDir, "dry-run/TODO.md"));
  assertEquals(original, "# Main\n");
});

Deno.test("CLI merge command - custom target file", async () => {
  await createTestFile("custom/PROJECT.md", "# Project Tasks\n");
  await createTestFile(
    "custom/src/TODO.md",
    `## TODO
- [ ] Source task
`,
  );

  const { output, success } = await runPcheck([
    "merge",
    "custom",
    "--target",
    join(testDir, "custom/PROJECT.md"),
    "--preserve",
    "--all",
  ]);

  assertEquals(success, true);

  const merged = await Deno.readTextFile(join(testDir, "custom/PROJECT.md"));
  assertStringIncludes(merged, "Source task");
});

Deno.test("CLI merge command - skip empty", async () => {
  await createTestFile("skip-empty/TODO.md", "# Main\n");
  await createTestFile("skip-empty/empty/TODO.md", "# Empty\n\n## TODO\n");
  await createTestFile(
    "skip-empty/full/TODO.md",
    `## TODO
- [ ] Has content
`,
  );

  const { output, success } = await runPcheck([
    "merge",
    "skip-empty",
    "--skip-empty",
    "--preserve",
    "--all",
  ]);

  assertEquals(success, true);
  assertStringIncludes(output, "Merged 1 files");
});

// Cleanup
Deno.test("cleanup CLI test directory", async () => {
  await Deno.remove(testDir, { recursive: true });
});
