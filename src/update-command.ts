import { bold, green, yellow } from "@std/fmt/colors";
import { runSortCommand } from "./sort-command.ts";
import { loadConfig } from "./config.ts";
import { $ } from "dax";
import { dirname, join, resolve } from "@std/path";
import { findTodos } from "./mod.ts";

interface UpdateOptions {
  sort?: boolean;
  done?: boolean;
  "force-clear"?: boolean;
  priority?: boolean;
  indentSize?: number;
  code?: boolean;
}

interface ParsedSection {
  name: string;
  level: number;
  startLine: number;
  endLine: number;
  tasks: ParsedTask[];
}

interface ParsedTask {
  line: string;
  lineNumber: number;
  checked: boolean;
  content: string;
  indent: number;
}

function parseMarkdownFile(content: string): {
  sections: ParsedSection[];
  lines: string[];
} {
  const lines = content.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#+)\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }

      currentSection = {
        name: headerMatch[2].trim(),
        level: headerMatch[1].length,
        startLine: i,
        endLine: lines.length - 1,
        tasks: [],
      };
    } else if (currentSection) {
      // Check if it's a task
      const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
      if (taskMatch) {
        currentSection.tasks.push({
          line,
          lineNumber: i,
          checked: taskMatch[2] === "x",
          content: taskMatch[3],
          indent: taskMatch[1].length,
        });
      }
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { sections, lines };
}

async function findNearestTodoFile(
  startPath: string,
): Promise<{ path: string; type: "todo" | "readme" | "none" }> {
  let currentPath = resolve(startPath);

  while (currentPath !== "/" && currentPath !== ".") {
    // Check for TODO.md
    const todoPath = join(currentPath, "TODO.md");
    try {
      const stat = await Deno.stat(todoPath);
      if (stat.isFile) {
        return { path: todoPath, type: "todo" };
      }
    } catch {
      // File doesn't exist
    }

    // Check for README.md
    const readmePath = join(currentPath, "README.md");
    try {
      const stat = await Deno.stat(readmePath);
      if (stat.isFile) {
        return { path: readmePath, type: "readme" };
      }
    } catch {
      // File doesn't exist
    }

    const parent = dirname(currentPath);
    if (parent === currentPath) break; // Reached root
    currentPath = parent;
  }

  return { path: "", type: "none" };
}

async function extractCodeChecklists(directory: string): Promise<string[]> {
  const todos = await findTodos(directory, {
    scanFiles: false,
    scanCode: true,
    includeTestCases: false,
  });

  const checklists: string[] = [];

  for (const file of todos) {
    if (file.todos) {
      for (const todo of file.todos) {
        if (todo.commentType === "CHECKLIST" && todo.content) {
          // Extract checklist content
          const checklistMatch = todo.content.match(/^\[([ ✓])\]\s*(.+)$/);
          if (checklistMatch) {
            const checked = checklistMatch[1] === "✓";
            const content = checklistMatch[2];
            checklists.push(`- [${checked ? "x" : " "}] ${content}`);
          }
        }
      }
    }
  }

  return checklists;
}

function normalizeMarkdownFormat(content: string): string {
  const lines = content.split("\n");
  const normalized: string[] = [];
  let prevWasEmpty = false;
  let prevWasHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isEmpty = trimmed === "";
    const isHeader = trimmed.startsWith("#");

    // Skip multiple empty lines
    if (isEmpty && prevWasEmpty) {
      continue;
    }

    // Ensure empty line after header
    if (prevWasHeader && !isEmpty) {
      normalized.push("");
    }

    normalized.push(line);

    prevWasEmpty = isEmpty;
    prevWasHeader = isHeader;
  }

  // Remove trailing empty lines
  while (
    normalized.length > 0 && normalized[normalized.length - 1].trim() === ""
  ) {
    normalized.pop();
  }

  return normalized.join("\n");
}

export async function runUpdateCommand(
  filePath: string,
  options: UpdateOptions,
): Promise<void> {
  // Load config for default indent size
  const config = await loadConfig();
  const actualIndentSize = options.indentSize ?? config.indentSize ?? 2;

  // Handle --code option first (doesn't need file content)
  if (options.code) {
    const directory = filePath === "TODO.md" ? "." : dirname(filePath);
    const checklists = await extractCodeChecklists(directory);

    if (checklists.length === 0) {
      console.log(yellow("No checklist items found in code comments."));
      return;
    }

    console.log(`Found ${checklists.length} checklist items in code comments.`);

    // Find the nearest TODO.md or README.md
    const targetFile = await findNearestTodoFile(directory);

    if (targetFile.type === "none") {
      // Ask user to create TODO.md
      console.log(
        "No TODO.md or README.md found. Create TODO.md in current directory? (y/n)",
      );
      const answer = prompt(">");

      if (answer?.toLowerCase() !== "y") {
        console.log(yellow("Operation cancelled."));
        return;
      }

      // Create new TODO.md
      const newTodoPath = join(directory, "TODO.md");
      const content = `# TODO

## Tasks
${checklists.join("\n")}
`;
      await Deno.writeTextFile(newTodoPath, content);
      console.log(
        green(`Created ${newTodoPath} with ${checklists.length} items.`),
      );
      return;
    }

    // Add to existing file
    const targetContent = await Deno.readTextFile(targetFile.path);
    let newContent: string;

    if (targetFile.type === "readme") {
      // Add TODO section to README.md
      const lines = targetContent.split("\n");

      // Check if TODO section already exists
      const todoSectionIndex = lines.findIndex((line) =>
        line.match(/^##\s+TODO\s*$/i)
      );

      if (todoSectionIndex >= 0) {
        // Insert after existing TODO section header
        lines.splice(todoSectionIndex + 1, 0, "", ...checklists);
      } else {
        // Add new TODO section at the end
        if (lines[lines.length - 1] !== "") {
          lines.push("");
        }
        lines.push("## TODO", "", ...checklists);
      }

      newContent = lines.join("\n");
    } else {
      // Add to TODO.md
      const { sections, lines } = parseMarkdownFile(targetContent);

      // Find tasks or todo section
      const taskSection = sections.find((s) =>
        s.name.toUpperCase() === "TASKS" ||
        s.name.toUpperCase() === "TODO"
      );

      if (taskSection) {
        // Insert at the end of the section
        const insertIndex = taskSection.endLine;
        lines.splice(insertIndex, 0, ...checklists);
      } else {
        // Add at the end of file
        if (lines[lines.length - 1] !== "") {
          lines.push("");
        }
        lines.push("## Tasks", "", ...checklists);
      }

      newContent = lines.join("\n");
    }

    // Normalize format before writing
    const normalizedContent = normalizeMarkdownFormat(newContent);
    await Deno.writeTextFile(targetFile.path, normalizedContent);
    console.log(
      green(`Added ${checklists.length} checklist items to ${targetFile.path}`),
    );
    return;
  }

  // Read file for other operations
  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: File not found: ${filePath}`);
      Deno.exit(1);
    }
    throw error;
  }

  const operations: string[] = [];

  // If no options provided, ask user what they want to do
  if (
    !options.sort &&
    !options.priority &&
    !options.done &&
    !options["force-clear"]
  ) {
    console.log(bold("What would you like to do?"));

    // Check if there are any tasks with priority or completed tasks
    const { sections } = parseMarkdownFile(content);
    let hasPriorityTasks = false;
    let hasCompletedTasks = false;

    for (const section of sections) {
      // Skip DONE and COMPLETED sections
      const sectionNameUpper = section.name.toUpperCase();
      if (sectionNameUpper === "DONE" || sectionNameUpper === "COMPLETED") {
        continue;
      }

      for (const task of section.tasks) {
        // Check if task has priority (e.g., [HIGH], [MID], [LOW], or numeric)
        if (task.line.match(/\[(HIGH|MID|LOW|\d+)\]/)) {
          hasPriorityTasks = true;
        }
        // Check if task is completed
        if (task.checked) {
          hasCompletedTasks = true;
        }
      }
    }

    // Only ask about priority sorting if there are tasks with priority
    if (hasPriorityTasks) {
      const sortChoice = await $.confirm("Sort tasks by priority?");
      if (sortChoice) {
        options.priority = true;
      }
    }

    // Only ask about moving completed tasks if there are any
    if (hasCompletedTasks) {
      const doneChoice = await $.confirm(
        "Move completed tasks to DONE section?",
      );
      if (doneChoice) {
        options.done = true;
      }
    }

    // If no applicable operations found
    if (!hasPriorityTasks && !hasCompletedTasks) {
      console.log(yellow("No tasks with priority or completed tasks found."));
      console.log(yellow("Nothing to update."));
      return;
    }

    // If nothing selected, exit
    if (!options.priority && !options.done) {
      console.log(yellow("No operations selected. Exiting."));
      return;
    }
  }

  // If sort or priority is requested, do it first
  if (options.sort || options.priority) {
    await runSortCommand(filePath, actualIndentSize);
    operations.push("sorted by priority");
    // Re-read the sorted content
    content = await Deno.readTextFile(filePath);
  }

  // Handle --done option
  if (options.done) {
    const { sections, lines } = parseMarkdownFile(content);
    const newLines: string[] = [];
    let doneSection: ParsedSection | null = null;
    const completedTasks: string[] = [];

    // Find or create completed section (COMPLETED preferred over DONE)
    doneSection = sections.find((s) => s.name.toUpperCase() === "COMPLETED") ||
      sections.find((s) => s.name.toUpperCase() === "DONE") ||
      null;

    // Process lines and collect completed tasks
    const skipLines = new Set<number>();

    for (const section of sections) {
      const sectionNameUpper = section.name.toUpperCase();
      if (sectionNameUpper !== "DONE" && sectionNameUpper !== "COMPLETED") {
        for (const task of section.tasks) {
          if (task.checked) {
            // Remove the [x] checkbox and format for completed section
            const taskContent = task.content.replace(/^\[.*?\]\s*/, ""); // Remove priority if present
            completedTasks.push(`${"  ".repeat(task.indent)}- ${taskContent}`);
            skipLines.add(task.lineNumber);
          }
        }
      }
    }

    // Build new content
    let inCompletedSection = false;
    let completedHeaderLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're entering completed section
      if (doneSection && i === doneSection.startLine) {
        inCompletedSection = true;
        completedHeaderLine = i;
        if (!options["force-clear"]) {
          newLines.push(line);
        }
        continue;
      }

      // Check if we're leaving completed section
      if (inCompletedSection && doneSection) {
        // Check for next section
        const headerMatch = line.match(/^(#+)\s+(.+)$/);
        if (
          headerMatch &&
          headerMatch[1].length <= doneSection.level &&
          i !== completedHeaderLine
        ) {
          inCompletedSection = false;
        }
      }

      // Skip lines in completed section if force-clear
      if (inCompletedSection && options["force-clear"]) {
        continue;
      }

      // Skip completed tasks from other sections
      if (skipLines.has(i)) {
        continue;
      }

      newLines.push(line);
    }

    // Add completed tasks to completed section
    if (completedTasks.length > 0 && !options["force-clear"]) {
      // If no completed section exists, create it (prefer COMPLETED)
      if (!doneSection) {
        // Add empty line before new section if needed
        if (
          newLines.length > 0 &&
          newLines[newLines.length - 1].trim() !== ""
        ) {
          newLines.push("");
        }
        newLines.push("## COMPLETED");
        newLines.push("");
      } else {
        // Find where to insert in existing completed section
        const sectionPattern = new RegExp(`^##\\s+(${doneSection.name})$`, "i");
        let insertIndex = newLines.findIndex((line) => {
          return sectionPattern.test(line);
        });

        if (insertIndex >= 0) {
          // Skip to after header and empty lines
          insertIndex++;
          while (
            insertIndex < newLines.length &&
            newLines[insertIndex].trim() === ""
          ) {
            insertIndex++;
          }

          // Insert completed tasks
          for (const task of completedTasks) {
            newLines.splice(insertIndex, 0, task);
            insertIndex++;
          }

          // Add empty line after if next line is not empty
          if (
            insertIndex < newLines.length &&
            newLines[insertIndex].trim() !== ""
          ) {
            newLines.splice(insertIndex, 0, "");
          }

          // Instead of adding at the end, we inserted in place
          completedTasks.length = 0;
        }
      }

      // Add any remaining tasks
      for (const task of completedTasks) {
        newLines.push(task);
      }
    }

    // Write back to file
    await Deno.writeTextFile(filePath, newLines.join("\n"));

    if (options["force-clear"]) {
      operations.push(`cleared ${doneSection?.name || "completed"} section`);
    } else if (completedTasks.length > 0) {
      const sectionName = doneSection?.name || "COMPLETED";
      operations.push(
        `moved ${completedTasks.length} completed tasks to ${sectionName}`,
      );
    }
  } else if (options["force-clear"]) {
    // Just clear completed section without moving tasks
    const { sections, lines } = parseMarkdownFile(content);
    const newLines: string[] = [];
    let inCompletedSection = false;
    const completedSection = sections.find((s) =>
      s.name.toUpperCase() === "COMPLETED"
    ) ||
      sections.find((s) => s.name.toUpperCase() === "DONE");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (completedSection && i === completedSection.startLine) {
        inCompletedSection = true;
        continue;
      }

      if (inCompletedSection && completedSection) {
        const headerMatch = line.match(/^(#+)\s+(.+)$/);
        if (headerMatch && headerMatch[1].length <= completedSection.level) {
          inCompletedSection = false;
        }
      }

      if (!inCompletedSection) {
        newLines.push(line);
      }
    }

    await Deno.writeTextFile(filePath, newLines.join("\n"));
    operations.push(`cleared ${completedSection?.name || "completed"} section`);
  }

  // Report operations
  if (operations.length > 0) {
    console.log(bold(green("✨ Updated TODO.md")));
    console.log(`  File: ${filePath}`);
    console.log(`  Operations: ${operations.join(", ")}`);
  } else {
    console.log(yellow("No operations performed"));
  }
}
