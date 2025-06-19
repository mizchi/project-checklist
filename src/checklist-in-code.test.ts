import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import {
  ChecklistInCodeSearcher,
  groupChecklistsByFile,
  filterByLanguage,
  getChecklistStats,
} from "./checklist-in-code.ts";

// Create test files with checklists in comments
async function createTestFiles(testDir: string) {
  // TypeScript file with various checklist formats
  await Deno.writeTextFile(
    join(testDir, "example.ts"),
    `// Simple checklist
// - [ ] Implement feature A
// - [x] Write unit tests
// - [ ] Update documentation

export function processData() {
  // TODO: Implementation
  // - [ ] Parse input data
  // - [x] Validate format
  
  /* Multi-line comment with checklist:
   * - [ ] Add error handling
   * - [x] Add logging
   * - [ ] Optimize performance
   */
  
  return {
    // Inline: - [ ] Add type annotations
    processed: true
  };
}

// Multiple items on one line: - [ ] Task 1 - [ ] Task 2
`,
  );

  // Python file
  await Deno.writeTextFile(
    join(testDir, "example.py"),
    `# Python checklist
# - [ ] Import required modules
# - [x] Define main function

def process_data():
    """
    Process data with the following steps:
    - [ ] Load configuration
    - [x] Validate input
    - [ ] Transform data
    """
    pass

# TODO: - [ ] Add command line interface
`,
  );

  // JavaScript file
  await Deno.writeTextFile(
    join(testDir, "example.js"),
    `// JavaScript checklist
// - [ ] Convert to TypeScript
// - [x] Add JSDoc comments

/**
 * Process function
 * Tasks:
 * - [ ] Implement caching
 * - [x] Add error boundaries
 */
function process() {
  // Implementation needed: - [ ] Add validation
  return true;
}
`,
  );

  // File without checklists
  await Deno.writeTextFile(
    join(testDir, "no-checklist.ts"),
    `// This file has no checklists
// Just regular comments
export function regularFunction() {
  // TODO: This is not a checklist format
  return "no checklists here";
}
`,
  );
}

Deno.test("ChecklistInCodeSearcher - search with ripgrep", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);

    // Test if ripgrep is available
    let ripgrepAvailable = false;
    try {
      const command = new Deno.Command("rg", {
        args: ["--version"],
        stdout: "null",
        stderr: "null",
      });
      const { success } = await command.output();
      ripgrepAvailable = success;
    } catch {
      // ripgrep not available
    }

    if (!ripgrepAvailable) {
      console.log("Skipping ripgrep test - tool not installed");
      return;
    }

    const results = await searcher.searchWithRipgrep(testDir);

    // Should find checklists across all files
    assertEquals(results.length > 0, true, "Should find some checklists");

    // Check for both checked and unchecked items
    const checked = results.filter((item) => item.checked);
    const unchecked = results.filter((item) => !item.checked);

    assertEquals(checked.length > 0, true, "Should find checked items");
    assertEquals(unchecked.length > 0, true, "Should find unchecked items");

    // Verify structure of results
    for (const item of results) {
      assertExists(item.path, "Should have path");
      assertExists(item.line, "Should have line number");
      assertExists(item.content, "Should have content");
      assertExists(item.context, "Should have context");
      assertEquals(typeof item.checked, "boolean", "Should have checked status");
    }
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("ChecklistInCodeSearcher - search with native implementation", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);

    const results = await searcher.searchWithNative(testDir);

    // Should find all checklists
    assertEquals(results.length >= 15, true, "Should find at least 15 checklists");

    // Verify TypeScript file results
    const tsResults = results.filter((item) => item.path.endsWith("example.ts"));
    assertEquals(tsResults.length >= 8, true, "Should find at least 8 items in TypeScript file");

    // Verify Python file results
    const pyResults = results.filter((item) => item.path.endsWith("example.py"));
    assertEquals(pyResults.length >= 5, true, "Should find at least 5 items in Python file");

    // Verify JavaScript file results
    const jsResults = results.filter((item) => item.path.endsWith("example.js"));
    assertEquals(jsResults.length >= 4, true, "Should find at least 4 items in JavaScript file");

    // Should not find items in no-checklist.ts
    const noChecklistResults = results.filter((item) =>
      item.path.endsWith("no-checklist.ts")
    );
    assertEquals(noChecklistResults.length, 0, "Should not find items in no-checklist.ts");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("ChecklistInCodeSearcher - search options", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);

    // Test includeChecked = false
    const uncheckedOnly = await searcher.searchWithNative(testDir, {
      includeChecked: false,
      includeUnchecked: true,
    });
    assertEquals(
      uncheckedOnly.every((item) => !item.checked),
      true,
      "Should only find unchecked items",
    );

    // Test includeUnchecked = false
    const checkedOnly = await searcher.searchWithNative(testDir, {
      includeChecked: true,
      includeUnchecked: false,
    });
    assertEquals(
      checkedOnly.every((item) => item.checked),
      true,
      "Should only find checked items",
    );

    // Test specific file patterns
    const tsOnly = await searcher.searchWithNative(testDir, {
      filePatterns: ["*.ts"],
    });
    assertEquals(
      tsOnly.every((item) => item.path.endsWith(".ts")),
      true,
      "Should only find items in TypeScript files",
    );
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("groupChecklistsByFile", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);
    const results = await searcher.searchWithNative(testDir);
    const grouped = groupChecklistsByFile(results);

    // Should have at least 3 files
    assertEquals(grouped.size >= 3, true, "Should group into at least 3 files");

    // Each group should be sorted by line number
    for (const [_path, items] of grouped) {
      for (let i = 1; i < items.length; i++) {
        assertEquals(
          items[i].line >= items[i - 1].line,
          true,
          "Items should be sorted by line number",
        );
      }
    }
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("filterByLanguage", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);
    const results = await searcher.searchWithNative(testDir);

    const tsOnly = filterByLanguage(results, ["ts"]);
    assertEquals(
      tsOnly.every((item) => item.language === "ts"),
      true,
      "Should only include TypeScript files",
    );

    const pyJs = filterByLanguage(results, ["py", "js"]);
    assertEquals(
      pyJs.every((item) => item.language === "py" || item.language === "js"),
      true,
      "Should only include Python and JavaScript files",
    );
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("getChecklistStats", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);
    const results = await searcher.searchWithNative(testDir);
    const stats = getChecklistStats(results);

    assertEquals(stats.total > 0, true, "Should have total count");
    assertEquals(stats.checked > 0, true, "Should have checked count");
    assertEquals(stats.unchecked > 0, true, "Should have unchecked count");
    assertEquals(
      stats.total,
      stats.checked + stats.unchecked,
      "Total should equal checked + unchecked",
    );
    assertEquals(
      stats.completionRate > 0 && stats.completionRate < 100,
      true,
      "Completion rate should be between 0 and 100",
    );

    // Should have language breakdown
    assertExists(stats.byLanguage.ts, "Should have TypeScript count");
    assertExists(stats.byLanguage.py, "Should have Python count");
    assertExists(stats.byLanguage.js, "Should have JavaScript count");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("ChecklistInCodeSearcher - auto detection", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await createTestFiles(testDir);

    // This should use either ripgrep or native implementation
    const results = await searcher.search(testDir);

    assertEquals(results.length > 0, true, "Should find checklists with auto-detection");

    // Basic validation
    const hasChecked = results.some((item) => item.checked);
    const hasUnchecked = results.some((item) => !item.checked);

    assertEquals(hasChecked, true, "Should find checked items");
    assertEquals(hasUnchecked, true, "Should find unchecked items");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("ChecklistInCodeSearcher - multiple items on same line", async () => {
  const testDir = await Deno.makeTempDir();
  const searcher = new ChecklistInCodeSearcher();

  try {
    await Deno.writeTextFile(
      join(testDir, "multi.ts"),
      `// Multiple items: - [ ] Task 1 - [x] Task 2 - [ ] Task 3
// Another line: - [x] Done task - [ ] Pending task
`,
    );

    const results = await searcher.searchWithNative(testDir);

    // Should find all 5 items
    assertEquals(results.length, 5, "Should find all 5 checklist items");

    // Check line 1 has 3 items
    const line1Items = results.filter((item) => item.line === 1);
    assertEquals(line1Items.length, 3, "Should find 3 items on line 1");

    // Check line 2 has 2 items
    const line2Items = results.filter((item) => item.line === 2);
    assertEquals(line2Items.length, 2, "Should find 2 items on line 2");

    // Verify content extraction
    const contents = results.map((item) => item.content).sort();
    const expected = ["Done task", "Pending task", "Task 1", "Task 2", "Task 3"].sort();
    assertEquals(contents, expected, "Should extract correct content");
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});