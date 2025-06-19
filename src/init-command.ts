import { blue, green, yellow } from "@std/fmt/colors";
import { exists } from "@std/fs/exists";
import { join } from "@std/path";

interface InitOptions {
  force?: boolean;
  template?: string;
}

const DEFAULT_TEMPLATE = `# TODO

## TODO

## ICEBOX

## COMPLETED
`;

const GTD_TEMPLATE = `# TODO

## TODO
<!-- Active tasks that need to be done -->

## ICEBOX
<!-- Ideas and tasks for later consideration -->

## COMPLETED
<!-- Finished tasks for reference -->
`;

export async function runInitCommand(
  directory: string = ".",
  options: InitOptions = {},
): Promise<void> {
  const todoPath = join(directory, "TODO.md");
  const readmePath = join(directory, "README.md");

  // Check if TODO.md already exists
  if (await exists(todoPath) && !options.force) {
    console.log(yellow("TODO.md already exists. Use --force to overwrite."));
    return;
  }

  let content = options.template === "gtd" ? GTD_TEMPLATE : DEFAULT_TEMPLATE;
  const extractedTasks: Array<
    { checked: boolean; content: string; line: string }
  > = [];

  // Check for README.md and extract checklists
  if (await exists(readmePath)) {
    console.log("Found README.md, checking for checklists...");
    const readmeContent = await Deno.readTextFile(readmePath);

    // Extract checklists from README.md
    const lines = readmeContent.split("\n");
    const checklistPattern = /^\s*-\s*\[([ x])\]\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(checklistPattern);
      if (match) {
        const checked = match[1] === "x";
        const taskContent = match[2];
        extractedTasks.push({ checked, content: taskContent, line });
      }
    }

    if (extractedTasks.length > 0) {
      console.log(
        `Found ${extractedTasks.length} checklist items in README.md`,
      );

      // Ask user if they want to import them
      console.log("\nWould you like to import these tasks? (y/n)");
      const answer = prompt(">");

      if (answer?.toLowerCase() === "y") {
        // Group tasks by completion status
        const todoTasks = extractedTasks
          .filter((t) => !t.checked)
          .map((t) => `- [ ] ${t.content}`);
        const completedTasks = extractedTasks
          .filter((t) => t.checked)
          .map((t) => `- ${t.content}`);

        // Build the content with extracted tasks
        const sections = content.split("\n\n");
        const newSections: string[] = [];

        for (const section of sections) {
          if (section.startsWith("## TODO") && todoTasks.length > 0) {
            newSections.push(section);
            newSections.push(todoTasks.join("\n"));
          } else if (
            section.startsWith("## COMPLETED") && completedTasks.length > 0
          ) {
            newSections.push(section);
            newSections.push(completedTasks.join("\n"));
          } else {
            newSections.push(section);
          }
        }

        content = newSections.join("\n\n");

        // Ask if user wants to remove checklists from README.md
        console.log("\nRemove imported checklists from README.md? (y/n)");
        const removeAnswer = prompt(">");

        if (removeAnswer?.toLowerCase() === "y") {
          // Remove checklist lines from README.md
          const newReadmeLines = lines.filter((line) =>
            !line.match(checklistPattern)
          );
          await Deno.writeTextFile(readmePath, newReadmeLines.join("\n"));
          console.log(green("✓ Removed checklists from README.md"));
        }
      }
    } else {
      console.log("No checklists found in README.md");
    }
  }

  // Write TODO.md
  await Deno.writeTextFile(todoPath, content);
  console.log(green(`✓ Created ${todoPath}`));

  if (extractedTasks.length > 0) {
    console.log(
      blue(
        `  Imported ${
          extractedTasks.filter((t) => !t.checked).length
        } active tasks`,
      ),
    );
    console.log(
      blue(
        `  Imported ${
          extractedTasks.filter((t) => t.checked).length
        } completed tasks`,
      ),
    );
  }

  console.log("\nNext steps:");
  console.log("  - Add your tasks to TODO.md");
  console.log("  - Use 'pcheck' to view your tasks");
  console.log("  - Use 'pcheck update' to organize completed tasks");
}

// Helper to extract checklists from any markdown content
export function extractChecklistsFromMarkdown(content: string): Array<{
  checked: boolean;
  content: string;
  line: string;
  lineNumber: number;
}> {
  const lines = content.split("\n");
  const checklistPattern = /^\s*-\s*\[([ x])\]\s*(.+)$/;
  const results: Array<{
    checked: boolean;
    content: string;
    line: string;
    lineNumber: number;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(checklistPattern);
    if (match) {
      results.push({
        checked: match[1] === "x",
        content: match[2],
        line,
        lineNumber: i + 1,
      });
    }
  }

  return results;
}
