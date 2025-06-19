import { ChecklistInCodeSearcher, getChecklistStats, groupChecklistsByFile } from "../../checklist-in-code.ts";
import { bold, green, yellow, gray } from "@std/fmt/colors";

export interface CodeChecklistArgs {
  path?: string;
  checked?: boolean;
  unchecked?: boolean;
  stats?: boolean;
  "group-by-file"?: boolean;
  patterns?: string[];
}

export async function runCodeChecklistCommand(args: CodeChecklistArgs) {
  const targetPath = args.path || ".";
  const searcher = new ChecklistInCodeSearcher();

  // Build options based on args
  const options = {
    includeChecked: args.unchecked ? false : true,
    includeUnchecked: args.checked ? false : true,
    filePatterns: args.patterns,
  };

  console.log(`Searching for checklists in code comments in ${bold(targetPath)}...\n`);

  try {
    const results = await searcher.search(targetPath, options);

    if (results.length === 0) {
      console.log("No checklists found in code comments.");
      return;
    }

    // Show statistics if requested
    if (args.stats) {
      const stats = getChecklistStats(results);
      console.log(bold("📊 Checklist Statistics:"));
      console.log(`  Total items: ${stats.total}`);
      console.log(`  ✅ Checked: ${green(stats.checked.toString())} (${stats.completionRate.toFixed(1)}%)`);
      console.log(`  ⬜ Unchecked: ${yellow(stats.unchecked.toString())}`);
      console.log("\n  By language:");
      for (const [lang, count] of Object.entries(stats.byLanguage)) {
        console.log(`    ${lang}: ${count}`);
      }
      console.log("");
    }

    // Group by file if requested
    if (args["group-by-file"]) {
      const grouped = groupChecklistsByFile(results);
      
      for (const [filePath, items] of grouped) {
        console.log(`\n${bold(filePath)}:`);
        for (const item of items) {
          const checkbox = item.checked ? green("✅") : yellow("⬜");
          console.log(`  ${checkbox} Line ${item.line}: ${item.content}`);
          if (item.context !== item.content) {
            console.log(`     ${gray(item.context)}`);
          }
        }
      }
    } else {
      // Default output: flat list
      for (const item of results) {
        const checkbox = item.checked ? green("[x]") : yellow("[ ]");
        console.log(`${item.path}:${item.line}: ${checkbox} ${item.content}`);
      }
    }

    // Show summary
    const stats = getChecklistStats(results);
    console.log(`\n${bold("Summary:")} ${stats.total} items (${green(stats.checked.toString())} completed, ${yellow(stats.unchecked.toString())} remaining)`);

  } catch (error) {
    console.error("Error searching for checklists:", error);
    Deno.exit(1);
  }
}