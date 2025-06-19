import { bold, green, red, yellow } from "@std/fmt/colors";
import { runSortCommand } from "./sort-command.ts";
import { loadConfig } from "./config.ts";
import { $ } from "dax";
import { dirname, join, resolve } from "@std/path";
import { findTodos } from "./mod.ts";

interface UpdateOptions {
  sort?: boolean;
  completed?: boolean;
  priority?: boolean;
  indentSize?: number;
  code?: boolean;
  fix?: boolean;
  skipValidation?: boolean;
  vacuum?: boolean;
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
  children?: ParsedTask[];
  parentLineNumber?: number;
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

  // Build task hierarchy
  for (const section of sections) {
    const taskStack: ParsedTask[] = [];

    for (const task of section.tasks) {
      // Find parent task
      while (
        taskStack.length > 0 &&
        taskStack[taskStack.length - 1].indent >= task.indent
      ) {
        taskStack.pop();
      }

      if (taskStack.length > 0) {
        const parent = taskStack[taskStack.length - 1];
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(task);
        task.parentLineNumber = parent.lineNumber;
      }

      taskStack.push(task);
    }
  }

  return { sections, lines };
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const dp: number[][] = Array(len1 + 1).fill(null).map(() =>
    Array(len2 + 1).fill(0)
  );

  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[len1][len2];
}

// Find similar task in completed section using fuzzy matching
function findSimilarTask(
  searchTask: string,
  completedTasks: string[],
  threshold: number = 3,
): number {
  let bestMatch = -1;
  let bestDistance = threshold + 1;

  const normalizedSearch = searchTask.toLowerCase().trim();

  for (let i = 0; i < completedTasks.length; i++) {
    const normalizedTask = completedTasks[i].toLowerCase().trim();
    const distance = levenshteinDistance(normalizedSearch, normalizedTask);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = i;
    }
  }

  return bestDistance <= threshold ? bestMatch : -1;
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

  // Initialize content variable
  let content: string;
  const operations: string[] = [];

  // Run validation before update unless skipped
  if (!options.skipValidation && !options.code) {
    const { runValidateCommand } = await import("./cli/commands/validate.ts");

    console.log("Validating file structure...");
    // Run validation in strict mode for update command
    const validationResult = await runValidateCommand([filePath], {
      json: true,
      fix: options.fix,
      strict: true,
    });

    if (validationResult && validationResult.length > 0) {
      const fileResult = validationResult[0];
      if (!fileResult.valid && !options.fix) {
        console.log(
          red("Validation failed. Use --fix to attempt automatic fixes."),
        );
        console.log("Issues found:");
        for (const issue of fileResult.issues || []) {
          console.log(`  - ${issue.message}`);
        }
        return;
      } else if (options.fix && fileResult.fixed) {
        console.log(green("✓ Fixed validation issues"));
        operations.push("fixed validation issues");
      }
    }
  }

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
  try {
    content = await Deno.readTextFile(filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(`Error: File not found: ${filePath}`);
      Deno.exit(1);
    }
    throw error;
  }

  // If no options provided, ask user what they want to do
  if (
    !options.sort &&
    !options.priority &&
    !options.completed &&
    !options.vacuum
  ) {
    console.log(bold("What would you like to do?"));

    // Check if there are any tasks with priority or completed tasks
    const { sections } = parseMarkdownFile(content);
    let hasPriorityTasks = false;
    let hasCompletedTasks = false;

    for (const section of sections) {
      // Skip COMPLETED sections
      const sectionNameUpper = section.name.toUpperCase();
      if (sectionNameUpper === "COMPLETED") {
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
        "Move completed tasks to COMPLETED section?",
      );
      if (doneChoice) {
        options.completed = true;
      }
    }

    // If no applicable operations found
    if (!hasPriorityTasks && !hasCompletedTasks) {
      console.log(yellow("No tasks with priority or completed tasks found."));
      console.log(yellow("Nothing to update."));
      return;
    }

    // If nothing selected, exit
    if (!options.priority && !options.completed) {
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

  // Handle --vacuum option (remove completed tasks and output them)
  if (options.vacuum) {
    const { sections, lines } = parseMarkdownFile(content);
    const newLines: string[] = [];
    const vacuumedTasks: { section: string; tasks: string[] }[] = [];
    
    // Process each section
    for (const section of sections) {
      const sectionNameUpper = section.name.toUpperCase();
      const completedTasksInSection: string[] = [];
      
      // Collect completed tasks in this section
      const collectCompletedTasks = (task: ParsedTask, depth: number = 0): void => {
        if (task.checked) {
          const indent = "  ".repeat(depth);
          completedTasksInSection.push(`${indent}- [x] ${task.content}`);
          
          // Include all children of completed tasks
          if (task.children) {
            for (const child of task.children) {
              const childIndent = "  ".repeat(depth + 1);
              completedTasksInSection.push(`${childIndent}- [${child.checked ? 'x' : ' '}] ${child.content}`);
              
              // Recursively include grandchildren
              if (child.children) {
                const collectGrandchildren = (tasks: ParsedTask[], currentDepth: number) => {
                  for (const grandchild of tasks) {
                    const grandchildIndent = "  ".repeat(currentDepth);
                    completedTasksInSection.push(`${grandchildIndent}- [${grandchild.checked ? 'x' : ' '}] ${grandchild.content}`);
                    if (grandchild.children) {
                      collectGrandchildren(grandchild.children, currentDepth + 1);
                    }
                  }
                };
                collectGrandchildren(child.children, depth + 2);
              }
            }
          }
        } else if (task.children) {
          // Check children of uncompleted tasks
          for (const child of task.children) {
            collectCompletedTasks(child, depth + 1);
          }
        }
      };
      
      // Process top-level tasks only
      for (const task of section.tasks) {
        if (!task.parentLineNumber) {
          collectCompletedTasks(task);
        }
      }
      
      if (completedTasksInSection.length > 0) {
        vacuumedTasks.push({
          section: section.name,
          tasks: completedTasksInSection
        });
      }
    }
    
    // Output vacuumed tasks to stdout
    if (vacuumedTasks.length > 0) {
      console.log("# Vacuumed Tasks");
      console.log(`Date: ${new Date().toISOString()}`);
      console.log(`File: ${filePath}`);
      console.log("");
      
      for (const { section, tasks } of vacuumedTasks) {
        console.log(`## ${section}`);
        console.log("");
        for (const task of tasks) {
          console.log(task);
        }
        console.log("");
      }
      
      // Now remove completed tasks from the file
      const skipLines = new Set<number>();
      
      // Mark all completed tasks and their children for removal
      for (const section of sections) {
        const markForRemoval = (task: ParsedTask): void => {
          if (task.checked) {
            skipLines.add(task.lineNumber);
            // Mark all children for removal too
            if (task.children) {
              const markAllChildren = (children: ParsedTask[]) => {
                for (const child of children) {
                  skipLines.add(child.lineNumber);
                  if (child.children) {
                    markAllChildren(child.children);
                  }
                }
              };
              markAllChildren(task.children);
            }
          } else if (task.children) {
            // Check children of uncompleted tasks
            for (const child of task.children) {
              markForRemoval(child);
            }
          }
        };
        
        for (const task of section.tasks) {
          if (!task.parentLineNumber) {
            markForRemoval(task);
          }
        }
      }
      
      // Build new content without completed tasks
      for (let i = 0; i < lines.length; i++) {
        if (!skipLines.has(i)) {
          newLines.push(lines[i]);
        }
      }
      
      // Normalize and write back
      const finalContent = normalizeMarkdownFormat(newLines.join("\n"));
      await Deno.writeTextFile(filePath, finalContent);
      
      // Count total vacuumed tasks
      const totalVacuumed = vacuumedTasks.reduce((sum, vt) => sum + vt.tasks.length, 0);
      operations.push(`vacuumed ${totalVacuumed} completed tasks`);
    } else {
      console.log("No completed tasks to vacuum.");
    }
  }
  // Handle --completed option
  else if (options.completed) {
    const { sections, lines } = parseMarkdownFile(content);
    const newLines: string[] = [];
    let completedSection: ParsedSection | null = null;
    const completedTasks: string[] = [];

    // Find or create completed section
    completedSection = sections.find((s) => s.name.toUpperCase() === "COMPLETED") ||
      null;

    // Process lines and collect completed tasks with hierarchy
    const skipLines = new Set<number>();
    const completedTasksWithHierarchy: {
      task: ParsedTask;
      formatted: string;
    }[] = [];

    // Helper function to collect task and its children
    const collectTaskHierarchy = (
      task: ParsedTask,
      baseIndent: number = 0,
      indentSize: number = actualIndentSize,
    ): void => {
      if (task.checked) {
        // Remove the [x] checkbox and format for completed section
        const taskContent = task.content.replace(/^\[.*?\]\s*/, ""); // Remove priority if present
        // If validation is skipped, preserve original spacing
        const taskIndent = options.skipValidation
          ? task.indent
          : Math.round(task.indent / indentSize) * indentSize;
        const formatted = `${
          " ".repeat(baseIndent * indentSize + taskIndent)
        }- ${taskContent}`;
        completedTasksWithHierarchy.push({ task, formatted });
        completedTasks.push(formatted);
        skipLines.add(task.lineNumber);

        // If parent is checked, collect all children (checked or not)
        if (task.children) {
          const collectAllChildren = (
            children: ParsedTask[],
            _parentTask: ParsedTask,
          ) => {
            for (const child of children) {
              skipLines.add(child.lineNumber); // Skip child lines too
              const childContent = child.content.replace(/^\[.*?\]\s*/, "");
              // Calculate relative indent from the original top-level task
              const actualChildIndent = options.skipValidation
                ? child.indent
                : Math.round(child.indent / indentSize) * indentSize;
              const childFormatted = `${
                " ".repeat(baseIndent * indentSize + actualChildIndent)
              }- ${childContent}`;
              completedTasks.push(childFormatted);

              // Recursively collect grandchildren
              if (child.children) {
                collectAllChildren(child.children, child);
              }
            }
          };
          collectAllChildren(task.children, task);
        }
      } else {
        // Process children - if parent is not checked, check children individually
        if (task.children) {
          for (const child of task.children) {
            // When processing children of unchecked parent, don't include their own children
            // They will be handled separately
            if (child.checked) {
              const childContent = child.content.replace(/^\[.*?\]\s*/, "");
              const childIndent = options.skipValidation
                ? child.indent
                : Math.round(child.indent / indentSize) * indentSize;
              const formatted = `${
                " ".repeat(baseIndent * indentSize + childIndent)
              }- ${childContent}`;
              completedTasksWithHierarchy.push({ task: child, formatted });
              completedTasks.push(formatted);
              skipLines.add(child.lineNumber);

              // Include all children recursively when parent is checked
              if (child.children) {
                const collectGrandchildren = (
                  tasks: ParsedTask[],
                  _parentIndent: number,
                ) => {
                  for (const grandchild of tasks) {
                    skipLines.add(grandchild.lineNumber);
                    const grandchildContent = grandchild.content.replace(
                      /^\[.*?\]\s*/,
                      "",
                    );
                    const actualGrandchildIndent = options.skipValidation
                      ? grandchild.indent
                      : Math.round(grandchild.indent / indentSize) * indentSize;
                    const grandchildFormatted = `${
                      " ".repeat(
                        baseIndent * indentSize + actualGrandchildIndent,
                      )
                    }- ${grandchildContent}`;
                    completedTasks.push(grandchildFormatted);

                    // Recurse for great-grandchildren
                    if (grandchild.children) {
                      collectGrandchildren(
                        grandchild.children,
                        grandchild.indent,
                      );
                    }
                  }
                };
                collectGrandchildren(child.children, child.indent);
              }
            } else if (child.children) {
              // If child is not checked, recurse to check its children
              collectTaskHierarchy(child, baseIndent, indentSize);
            }
          }
        }
      }
    };

    for (const section of sections) {
      const sectionNameUpper = section.name.toUpperCase();
      if (sectionNameUpper !== "COMPLETED") {
        // Process only top-level tasks (those without parents)
        for (const task of section.tasks) {
          if (!task.parentLineNumber) {
            collectTaskHierarchy(task);
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
      if (completedSection && i === completedSection.startLine) {
        inCompletedSection = true;
        completedHeaderLine = i;
        newLines.push(line);
        continue;
      }

      // Check if we're leaving completed section
      if (inCompletedSection && completedSection) {
        // Check for next section
        const headerMatch = line.match(/^(#+)\s+(.+)$/);
        if (
          headerMatch &&
          headerMatch[1].length <= completedSection.level &&
          i !== completedHeaderLine
        ) {
          inCompletedSection = false;
        }
      }


      // Skip completed tasks from other sections
      if (skipLines.has(i)) {
        continue;
      }

      newLines.push(line);
    }

    // Add completed tasks to completed section
    if (completedTasks.length > 0) {
      // If no completed section exists, create it
      if (!completedSection) {
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
        const sectionPattern = new RegExp(`^##\\s+(${completedSection.name})$`, "i");
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

          // Collect existing tasks in completed section
          const existingCompletedTasks: string[] = [];
          let existingIndex = insertIndex;
          while (existingIndex < newLines.length) {
            const line = newLines[existingIndex];
            // Check if we've reached a new section
            if (line.match(/^#+\s+/)) break;
            // Collect task lines
            if (line.match(/^\s*-\s+/)) {
              existingCompletedTasks.push(line);
            }
            existingIndex++;
          }

          // Insert completed tasks, avoiding duplicates using fuzzy matching
          for (const task of completedTasks) {
            const taskText = task.replace(/^\s*-\s+/, "").trim();
            const similarIndex = findSimilarTask(
              taskText,
              existingCompletedTasks.map((t) =>
                t.replace(/^\s*-\s+/, "").trim()
              ),
            );

            if (similarIndex === -1) {
              // No similar task found, insert it
              newLines.splice(insertIndex, 0, task);
              insertIndex++;
            }
          }

          // Add empty line after if next line is not empty
          if (
            insertIndex < newLines.length &&
            newLines[insertIndex].trim() !== ""
          ) {
            newLines.splice(insertIndex, 0, "");
          }

          // Clear the array since we've processed all tasks
          completedTasks.length = 0;
        }
      }

      // Add any remaining tasks
      for (const task of completedTasks) {
        newLines.push(task);
      }
    }

    // Count completed tasks before writing
    const completedTaskCount = completedTasksWithHierarchy.length;

    // Normalize format before writing (only if validation was not skipped)
    const finalContent = options.skipValidation
      ? newLines.join("\n")
      : normalizeMarkdownFormat(newLines.join("\n"));

    // Write back to file
    await Deno.writeTextFile(filePath, finalContent);

    if (completedTaskCount > 0) {
      const sectionName = completedSection?.name || "COMPLETED";
      operations.push(
        `moved ${completedTaskCount} completed tasks to ${sectionName}`,
      );
    }
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
