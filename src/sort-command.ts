import { bold, green, yellow } from "@std/fmt/colors";
import { loadConfig } from "./config.ts";

interface TaskItem {
  line: string;
  priority?: string;
  priorityValue: number;
  checked: boolean;
  indent: number;
}

// Priority values for sorting (lower number = higher priority)
const PRIORITY_VALUES: Record<string, number> = {
  HIGH: 1,
  MID: 5,
  LOW: 10,
};

function parsePriority(line: string): {
  priority?: string;
  priorityValue: number;
} {
  // Match priority patterns like [HIGH], [MID], [LOW], or [number]
  const match = line.match(/^\s*-\s*\[[x ]?\]\s*\[([^\]]+)\]/);
  if (!match) {
    return { priorityValue: 100 }; // No priority = lowest
  }

  const priority = match[1].toUpperCase();

  // Check if it's a named priority
  if (PRIORITY_VALUES[priority]) {
    return { priority, priorityValue: PRIORITY_VALUES[priority] };
  }

  // Check if it's a numeric priority
  const num = parseInt(priority);
  if (!isNaN(num) && num >= 0 && num <= 999) {
    return { priority: priority, priorityValue: num };
  }

  // Unknown priority format
  return { priority: priority, priorityValue: 100 };
}

function parseTask(line: string): TaskItem | null {
  // Match checklist items with various formats
  const checklistMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
  if (!checklistMatch) {
    return null;
  }

  const indent = checklistMatch[1].length;
  const checked = checklistMatch[2] === "x";
  const { priority, priorityValue } = parsePriority(line);

  return {
    line,
    priority,
    priorityValue,
    checked,
    indent,
  };
}

export async function runSortCommand(
  filePath: string,
  indentSize?: number
): Promise<void> {
  // Load config for default indent size
  const config = await loadConfig();
  const actualIndentSize = indentSize ?? config.indentSize ?? 2;
  // Read file
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

  const lines = content.split("\n");
  const result: string[] = [];
  let currentSection: string | null = null;
  let sectionTasks: {
    startIdx: number;
    tasks: TaskItem[];
    otherLines: { idx: number; line: string }[];
  } | null = null;

  function flushSection() {
    if (sectionTasks && sectionTasks.tasks.length > 0) {
      // Group tasks by indent level
      const tasksByIndent = new Map<number, TaskItem[]>();

      for (const task of sectionTasks.tasks) {
        if (!tasksByIndent.has(task.indent)) {
          tasksByIndent.set(task.indent, []);
        }
        tasksByIndent.get(task.indent)!.push(task);
      }

      // Sort each indent level
      for (const [indent, tasks] of tasksByIndent) {
        tasks.sort((a, b) => {
          // Sort by priority value (lower = higher priority)
          if (a.priorityValue !== b.priorityValue) {
            return a.priorityValue - b.priorityValue;
          }
          // Then by checked status (unchecked first)
          if (a.checked !== b.checked) {
            return a.checked ? 1 : -1;
          }
          // Keep original order for same priority
          return 0;
        });
      }

      // Rebuild the task list maintaining hierarchy
      const sortedTasks: TaskItem[] = [];
      const indentLevels = Array.from(tasksByIndent.keys()).sort(
        (a, b) => a - b
      );

      // Process tasks level by level
      for (let i = 0; i < sectionTasks.tasks.length; i++) {
        const originalTask = sectionTasks.tasks[i];

        // Find the next task at the same or lower indent level
        let nextSiblingIdx = i + 1;
        while (
          nextSiblingIdx < sectionTasks.tasks.length &&
          sectionTasks.tasks[nextSiblingIdx].indent > originalTask.indent
        ) {
          nextSiblingIdx++;
        }

        // If this is a parent task, include it with its children
        if (nextSiblingIdx > i + 1) {
          // This task has children
          const children = sectionTasks.tasks.slice(i + 1, nextSiblingIdx);
          sortedTasks.push(originalTask);
          sortedTasks.push(...children);
          i = nextSiblingIdx - 1; // Skip the children we just added
        } else {
          // Leaf task
          sortedTasks.push(originalTask);
        }
      }

      // Actually sort within same parent groups
      const finalSorted: TaskItem[] = [];
      let i = 0;
      while (i < sortedTasks.length) {
        const currentIndent = sortedTasks[i].indent;

        // Find all siblings at this position
        let j = i;
        while (
          j < sortedTasks.length &&
          sortedTasks[j].indent === currentIndent
        ) {
          // Look ahead to see if this task has children
          if (
            j + 1 < sortedTasks.length &&
            sortedTasks[j + 1].indent > currentIndent
          ) {
            // Skip to after children
            let k = j + 1;
            while (
              k < sortedTasks.length &&
              sortedTasks[k].indent > currentIndent
            ) {
              k++;
            }
            j = k;
          } else {
            j++;
          }
        }

        // Sort the siblings
        const siblings = sortedTasks.slice(i, j);
        const groups: TaskItem[][] = [];

        for (const task of siblings) {
          const taskIdx = sortedTasks.indexOf(task);
          const group = [task];

          // Find children
          let childIdx = taskIdx + 1;
          while (
            childIdx < sortedTasks.length &&
            sortedTasks[childIdx].indent > task.indent
          ) {
            group.push(sortedTasks[childIdx]);
            childIdx++;
          }

          groups.push(group);
        }

        // Sort groups by their parent's priority
        groups.sort((a, b) => {
          const taskA = a[0];
          const taskB = b[0];
          if (taskA.priorityValue !== taskB.priorityValue) {
            return taskA.priorityValue - taskB.priorityValue;
          }
          if (taskA.checked !== taskB.checked) {
            return taskA.checked ? 1 : -1;
          }
          return 0;
        });

        // Add sorted groups
        for (const group of groups) {
          finalSorted.push(...group);
        }

        i = j;
      }

      // Output sorted tasks
      for (const task of finalSorted) {
        result.push(task.line);
      }

      // Add other lines that were between tasks
      for (const { line } of sectionTasks.otherLines) {
        result.push(line);
      }
    }
    sectionTasks = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#+)\s+(.+)$/);

    if (headerMatch) {
      // New section header
      flushSection();
      currentSection = headerMatch[2];
      result.push(line);
      sectionTasks = { startIdx: i + 1, tasks: [], otherLines: [] };
    } else {
      const task = parseTask(line);
      if (task && sectionTasks) {
        sectionTasks.tasks.push(task);
      } else {
        if (sectionTasks && line.trim() !== "") {
          // Non-task line within a section
          sectionTasks.otherLines.push({ idx: i, line });
        } else {
          // Line outside of task section or empty line
          if (!sectionTasks || line.trim() === "") {
            result.push(line);
          }
        }
      }
    }
  }

  // Flush last section
  flushSection();

  // Write back to file
  await Deno.writeTextFile(filePath, result.join("\n"));

  console.log(bold(green("✨ Tasks sorted by priority")));
  console.log(`  File: ${filePath}`);
  console.log(
    yellow(
      "  Priority order: HIGH (1) > MID (5) > LOW (10) > numeric > no priority (100)"
    )
  );
}
