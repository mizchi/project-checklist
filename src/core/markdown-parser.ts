// Pure string manipulation functions for markdown parsing
// No I/O operations

export interface ParsedTask {
  line: string;
  lineNumber: number;
  checked: boolean;
  content: string;
  indent: number;
  priority?: string;
  priorityValue: number;
}

export interface ParsedSection {
  name: string;
  level: number;
  startLine: number;
  endLine: number;
  tasks: ParsedTask[];
}

export interface ParsedMarkdown {
  sections: ParsedSection[];
  lines: string[];
}

// Priority values for sorting (lower number = higher priority)
const PRIORITY_VALUES: Record<string, number> = {
  HIGH: 1,
  MID: 5,
  LOW: 10,
};

export function parsePriority(line: string): {
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

/**
 * 指定された行がコードブロック内にあるかどうかを判定する
 */
export function isInsideCodeBlock(lines: string[], lineIndex: number): boolean {
  let inCodeBlock = false;
  let codeBlockType: "fenced" | "indented" | null = null;

  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];

    // フェンスコードブロック（```）の検出
    if (line.match(/^\s*```/)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockType = "fenced";
      } else if (codeBlockType === "fenced") {
        inCodeBlock = false;
        codeBlockType = null;
      }
    }
    // インデントコードブロック（4スペース以上）の検出
    else if (line.match(/^    /) || line.match(/^\t/)) {
      if (!inCodeBlock && line.trim() !== "") {
        inCodeBlock = true;
        codeBlockType = "indented";
      }
    }
    // インデントコードブロックの終了判定
    else if (
      codeBlockType === "indented" &&
      line.trim() !== "" &&
      !line.match(/^    /) &&
      !line.match(/^\t/)
    ) {
      inCodeBlock = false;
      codeBlockType = null;
    }
  }

  return inCodeBlock;
}

/**
 * 指定された行がHTMLコメント内にあるかどうかを判定する
 */
export function isInsideHTMLComment(
  lines: string[],
  lineIndex: number
): boolean {
  let inComment = false;

  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i];

    // HTMLコメント開始の検出
    if (line.includes("<!--")) {
      inComment = true;
    }

    // HTMLコメント終了の検出
    if (line.includes("-->")) {
      inComment = false;
    }
  }

  return inComment;
}

export function parseTask(
  line: string,
  lineNumber: number,
  lines?: string[]
): ParsedTask | null {
  // Match checklist items with various formats
  const checklistMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.*)$/);
  if (!checklistMatch) {
    return null;
  }

  // コードブロック内やHTMLコメント内の場合は無視
  if (lines) {
    if (
      isInsideCodeBlock(lines, lineNumber) ||
      isInsideHTMLComment(lines, lineNumber)
    ) {
      return null;
    }
  }

  const indent = checklistMatch[1].length;
  const checked = checklistMatch[2] === "x";
  const content = checklistMatch[3];
  const { priority, priorityValue } = parsePriority(line);

  return {
    line,
    lineNumber,
    checked,
    content,
    indent,
    priority,
    priorityValue,
  };
}

export function parseMarkdown(content: string): ParsedMarkdown {
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
      // Check if it's a task (with lines context for safety checks)
      const task = parseTask(line, i, lines);
      if (task) {
        currentSection.tasks.push(task);
      }
    }
  }

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return { sections, lines };
}

export function findSection(
  sections: ParsedSection[],
  name: string
): ParsedSection | null {
  const upperName = name.toUpperCase();
  return sections.find((s) => s.name.toUpperCase() === upperName) || null;
}

/**
 * 完了セクションを検索する（COMPLETED > DONE の優先順位で）
 */
export function findCompletedSection(
  sections: ParsedSection[]
): ParsedSection | null {
  // 優先順位: COMPLETED > DONE
  const completedSection = findSection(sections, "COMPLETED");
  if (completedSection) {
    return completedSection;
  }

  return findSection(sections, "DONE");
}

export function sortTasksByPriority(tasks: ParsedTask[]): ParsedTask[] {
  // Group tasks by indent level to maintain hierarchy
  const tasksByIndent = new Map<number, ParsedTask[]>();

  for (const task of tasks) {
    if (!tasksByIndent.has(task.indent)) {
      tasksByIndent.set(task.indent, []);
    }
    tasksByIndent.get(task.indent)!.push(task);
  }

  // Sort each indent level
  for (const [indent, levelTasks] of tasksByIndent) {
    levelTasks.sort((a, b) => {
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

  // Rebuild sorted array maintaining indent hierarchy
  const result: ParsedTask[] = [];
  const sortedIndents = Array.from(tasksByIndent.keys()).sort((a, b) => a - b);

  for (const indent of sortedIndents) {
    result.push(...tasksByIndent.get(indent)!);
  }

  return result;
}

export function formatTask(
  task: ParsedTask,
  removeCheckbox: boolean = false
): string {
  if (removeCheckbox) {
    // Remove [x] checkbox and priority if present
    const content = task.content.replace(/^\[.*?\]\s*/, "");
    return `${"  ".repeat(task.indent)}- ${content}`;
  }
  return task.line;
}

export function insertSection(
  lines: string[],
  sectionName: string,
  level: number = 2
): string[] {
  const newLines = [...lines];

  // Find a good place to insert the new section
  let insertIndex = lines.length;

  // Look for existing sections to determine where to add
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].match(new RegExp(`^${"#".repeat(level)}\\s+`))) {
      insertIndex = i + 1;
      // Skip empty lines after the section
      while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
        insertIndex++;
      }
      // Find the end of the current section's items
      while (
        insertIndex < lines.length &&
        (lines[insertIndex].startsWith("- ") ||
          lines[insertIndex].trim() === "" ||
          lines[insertIndex].match(/^\s+/))
      ) {
        insertIndex++;
      }
      break;
    }
  }

  // Insert new section
  const sectionHeader = `${"#".repeat(level)} ${sectionName}`;
  if (insertIndex === lines.length) {
    // Add at end
    if (lines[lines.length - 1]?.trim() !== "") {
      newLines.push("");
    }
    newLines.push(sectionHeader);
    newLines.push("");
  } else {
    // Insert in middle
    newLines.splice(insertIndex, 0, "", sectionHeader, "");
  }

  return newLines;
}

export function addTaskToSection(
  lines: string[],
  section: ParsedSection,
  taskText: string,
  nextSectionStart?: number
): string[] {
  const newLines = [...lines];
  let insertIndex = section.startLine + 1;
  const endLine = nextSectionStart ?? section.endLine;

  // Skip empty lines after section header
  while (insertIndex < endLine && lines[insertIndex].trim() === "") {
    insertIndex++;
  }

  // Find the end of the current list items
  let lastItemIndex = insertIndex - 1;
  for (let i = insertIndex; i <= endLine; i++) {
    if (
      lines[i].startsWith("- ") ||
      (lines[i].match(/^\s+/) && lines[i].trim() !== "")
    ) {
      lastItemIndex = i;
    } else if (lines[i].trim() !== "") {
      // Found non-list content
      break;
    }
  }

  // Insert after the last item
  newLines.splice(lastItemIndex + 1, 0, `- [ ] ${taskText}`);

  return newLines;
}

export function moveCompletedTasksToDone(content: string): {
  content: string;
  movedCount: number;
} {
  const { sections, lines } = parseMarkdown(content);
  const newLines: string[] = [];
  let completedSection = findCompletedSection(sections);
  const completedTasks: string[] = [];
  const skipLines = new Set<number>();

  // Collect completed tasks from all sections except COMPLETED/DONE
  // 修正されたparseMarkdownを使用しているため、コードブロック内のタスクは既に除外されている
  for (const section of sections) {
    const sectionNameUpper = section.name.toUpperCase();
    if (sectionNameUpper !== "DONE" && sectionNameUpper !== "COMPLETED") {
      for (const task of section.tasks) {
        if (task.checked) {
          completedTasks.push(formatTask(task, true));
          skipLines.add(task.lineNumber);
        }
      }
    }
  }

  // Build new content
  for (let i = 0; i < lines.length; i++) {
    if (!skipLines.has(i)) {
      newLines.push(lines[i]);
    }
  }

  // Add completed tasks to COMPLETED/DONE section
  if (completedTasks.length > 0) {
    let resultLines = newLines;

    if (!completedSection) {
      // Create COMPLETED section (preferred over DONE)
      resultLines = insertSection(resultLines, "COMPLETED");
      // Re-parse to get the new section
      const reparsed = parseMarkdown(resultLines.join("\n"));
      completedSection = findCompletedSection(reparsed.sections);
    }

    if (completedSection) {
      // Find insertion point in completed section
      const sectionPattern = new RegExp(
        `^##\\s+(${completedSection.name})$`,
        "i"
      );
      const sectionIndex = resultLines.findIndex((line) =>
        sectionPattern.test(line)
      );
      if (sectionIndex >= 0) {
        let insertIndex = sectionIndex + 1;
        // Skip empty lines
        while (
          insertIndex < resultLines.length &&
          resultLines[insertIndex].trim() === ""
        ) {
          insertIndex++;
        }

        // Insert tasks
        for (const task of completedTasks) {
          resultLines.splice(insertIndex, 0, task);
          insertIndex++;
        }
      }
    }

    return {
      content: resultLines.join("\n"),
      movedCount: completedTasks.length,
    };
  }

  return {
    content: newLines.join("\n"),
    movedCount: 0,
  };
}

export function clearDoneSection(content: string): string {
  const { sections, lines } = parseMarkdown(content);
  const completedSection = findCompletedSection(sections);

  if (!completedSection) {
    return content;
  }

  const newLines: string[] = [];
  let inCompletedSection = false;

  for (let i = 0; i < lines.length; i++) {
    if (i === completedSection.startLine) {
      inCompletedSection = true;
      continue;
    }

    if (inCompletedSection) {
      // Check for next section at same or higher level
      const headerMatch = lines[i].match(/^(#+)\s+(.+)$/);
      if (headerMatch && headerMatch[1].length <= completedSection.level) {
        inCompletedSection = false;
      }
    }

    if (!inCompletedSection) {
      newLines.push(lines[i]);
    }
  }

  return newLines.join("\n");
}
