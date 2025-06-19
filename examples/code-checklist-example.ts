#!/usr/bin/env -S deno run --allow-read --allow-run

/**
 * Example usage of the checklist-in-code searcher
 * 
 * This example demonstrates how to find checklist items in code comments.
 * 
 * TODO List for this example:
 * - [x] Import the necessary modules
 * - [x] Create example with basic search
 * - [ ] Add example with filtering options
 * - [ ] Add example with statistics
 * - [ ] Add example with custom file patterns
 */

import {
  ChecklistInCodeSearcher,
  getChecklistStats,
  groupChecklistsByFile,
  filterByLanguage,
} from "../src/checklist-in-code.ts";

// Example 1: Basic search
console.log("=== Example 1: Basic Search ===");
const searcher = new ChecklistInCodeSearcher();
const allChecklists = await searcher.search(".");

console.log(`Found ${allChecklists.length} checklist items in code comments\n`);

// Show first 5 items
allChecklists.slice(0, 5).forEach((item) => {
  const status = item.checked ? "✅" : "⬜";
  console.log(`${status} ${item.path}:${item.line} - ${item.content}`);
});

if (allChecklists.length > 5) {
  console.log(`... and ${allChecklists.length - 5} more items\n`);
}

// Example 2: Search only unchecked items
console.log("\n=== Example 2: Unchecked Items Only ===");
const uncheckedOnly = await searcher.search(".", {
  includeChecked: false,
  includeUnchecked: true,
});

console.log(`Found ${uncheckedOnly.length} unchecked items:`);
uncheckedOnly.slice(0, 3).forEach((item) => {
  console.log(`⬜ ${item.content} (${item.path}:${item.line})`);
});

// Example 3: Get statistics
console.log("\n=== Example 3: Statistics ===");
const stats = getChecklistStats(allChecklists);
console.log("Checklist Statistics:");
console.log(`  Total: ${stats.total}`);
console.log(`  Completed: ${stats.checked} (${stats.completionRate.toFixed(1)}%)`);
console.log(`  Remaining: ${stats.unchecked}`);
console.log("\nBy Language:");
Object.entries(stats.byLanguage).forEach(([lang, count]) => {
  console.log(`  .${lang}: ${count} items`);
});

// Example 4: Group by file
console.log("\n=== Example 4: Grouped by File ===");
const grouped = groupChecklistsByFile(allChecklists);
console.log(`Checklists found in ${grouped.size} files:`);

// Show first 2 files
let fileCount = 0;
for (const [filePath, items] of grouped) {
  if (fileCount >= 2) break;
  console.log(`\n${filePath}: (${items.length} items)`);
  items.slice(0, 2).forEach((item) => {
    const status = item.checked ? "✅" : "⬜";
    console.log(`  ${status} Line ${item.line}: ${item.content}`);
  });
  fileCount++;
}

// Example 5: Filter by language
console.log("\n=== Example 5: TypeScript Files Only ===");
const tsOnly = filterByLanguage(allChecklists, ["ts"]);
console.log(`Found ${tsOnly.length} items in TypeScript files`);

// Example 6: Search specific file patterns
console.log("\n=== Example 6: Search Test Files ===");
const testFiles = await searcher.search(".", {
  filePatterns: ["*.test.ts", "*.test.js", "*_test.ts", "*_test.js"],
});
console.log(`Found ${testFiles.length} checklist items in test files`);

// Development checklist for this file:
// - [x] Create comprehensive examples
// - [ ] Add error handling examples
// - [ ] Add performance benchmarking
// - [x] Document usage patterns