import { join, relative } from "@std/path";
import { walk } from "@std/fs/walk";
import { type ParsedSection, parseMarkdown } from "./core/markdown-parser.ts";

export interface MergeOptions {
  targetFile?: string;
  interactive?: boolean;
  dryRun?: boolean;
  preserveSource?: boolean;
  skipEmpty?: boolean;
}

interface TodoFile {
  path: string;
  relativePath: string;
  sections: ParsedSection[];
  selected?: boolean;
}

export async function runMergeCommand(
  directory: string = ".",
  options: MergeOptions = {},
): Promise<void> {
  const targetFile = options.targetFile || join(directory, "TODO.md");

  // Find all TODO.md files in the project
  const todoFiles = await findTodoFiles(directory, targetFile);

  if (todoFiles.length === 0) {
    console.log("No TODO.md files found in subdirectories.");
    return;
  }

  // Filter out empty files if requested
  let filesToProcess = options.skipEmpty
    ? todoFiles.filter((f) => f.sections.some((s) => s.tasks.length > 0))
    : todoFiles;

  if (filesToProcess.length === 0) {
    console.log("No TODO.md files with tasks found.");
    return;
  }

  // Interactive selection
  if (options.interactive !== false) {
    filesToProcess = await selectFilesInteractively(filesToProcess);

    if (filesToProcess.length === 0) {
      console.log("No files selected.");
      return;
    }
  }

  // Perform merge
  const mergedContent = await mergeFiles(targetFile, filesToProcess);

  if (options.dryRun) {
    console.log("\n=== DRY RUN - Merged content preview ===");
    console.log(mergedContent);
    console.log("=== End of preview ===\n");
    console.log(
      `Would merge ${filesToProcess.length} files into ${targetFile}`,
    );
  } else {
    // Write merged content
    await Deno.writeTextFile(targetFile, mergedContent);
    console.log(`✓ Merged ${filesToProcess.length} files into ${targetFile}`);

    // Optionally remove source files
    if (!options.preserveSource) {
      console.log("\nRemove merged source files? (y/n)");
      const answer = prompt(">");

      if (answer?.toLowerCase() === "y") {
        for (const file of filesToProcess) {
          await Deno.remove(file.path);
          console.log(`✓ Removed ${file.relativePath}`);
        }
      }
    }
  }
}

async function findTodoFiles(
  directory: string,
  excludePath: string,
): Promise<TodoFile[]> {
  const todoFiles: TodoFile[] = [];
  const excludeAbsPath = await Deno.realPath(excludePath).catch(() =>
    excludePath
  );

  for await (
    const entry of walk(directory, {
      includeDirs: false,
      match: [/todo\.md$/i],
      skip: [/node_modules/, /\.git/, /dist/, /build/],
    })
  ) {
    // Skip the target file itself
    const absPath = await Deno.realPath(entry.path).catch(() => entry.path);
    if (absPath === excludeAbsPath) {
      continue;
    }

    try {
      const content = await Deno.readTextFile(entry.path);
      const { sections } = parseMarkdown(content);

      todoFiles.push({
        path: entry.path,
        relativePath: relative(directory, entry.path),
        sections,
      });
    } catch (error) {
      console.warn(`Warning: Could not read ${entry.path}: ${error}`);
    }
  }

  return todoFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function selectFilesInteractively(
  files: TodoFile[],
): Promise<TodoFile[]> {
  console.log(
    "\nSelect files to merge (use arrow keys and space to select, enter to confirm):\n",
  );

  // Display files with task counts
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const taskCount = file.sections.reduce((sum, s) => sum + s.tasks.length, 0);
    const sectionNames = file.sections.map((s) => s.name).join(", ");

    console.log(`${i + 1}. [ ] ${file.relativePath}`);
    console.log(`     Tasks: ${taskCount} | Sections: ${sectionNames}`);
    console.log();
  }

  // Simple selection prompt (in real implementation, would use interactive UI)
  console.log(
    "Enter file numbers to merge (comma-separated, or 'all' for all files):",
  );
  const input = prompt(">");

  if (!input) {
    return [];
  }

  if (input.toLowerCase() === "all") {
    return files;
  }

  const indices = input.split(",").map((s) => parseInt(s.trim()) - 1);
  return files.filter((_, i) => indices.includes(i));
}

async function mergeFiles(
  targetPath: string,
  sourceFiles: TodoFile[],
): Promise<string> {
  // Read existing target file
  let targetContent = "";
  let targetSections: ParsedSection[] = [];

  try {
    targetContent = await Deno.readTextFile(targetPath);
    const parsed = parseMarkdown(targetContent);
    targetSections = parsed.sections;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
    // Target file doesn't exist, will create new one
  }

  // Create a map of existing sections
  const sectionMap = new Map<string, ParsedSection>();
  for (const section of targetSections) {
    sectionMap.set(section.name.toUpperCase(), section);
  }

  // Merge tasks from source files
  for (const sourceFile of sourceFiles) {
    console.log(`\nMerging from ${sourceFile.relativePath}:`);

    for (const sourceSection of sourceFile.sections) {
      const sectionKey = sourceSection.name.toUpperCase();

      if (sourceSection.tasks.length === 0) {
        continue;
      }

      console.log(
        `  - ${sourceSection.name}: ${sourceSection.tasks.length} tasks`,
      );

      // Get or create target section
      if (!sectionMap.has(sectionKey)) {
        // Create new section
        const newSection: ParsedSection = {
          name: sourceSection.name,
          level: sourceSection.level,
          startLine: -1,
          endLine: -1,
          tasks: [],
        };
        sectionMap.set(sectionKey, newSection);
        targetSections.push(newSection);
      }

      const targetSection = sectionMap.get(sectionKey)!;

      // Add tasks from source (maintaining hierarchy)
      for (const task of sourceSection.tasks) {
        // Skip if task is a child (will be included with parent)
        if (task.parentLineNumber !== undefined) {
          continue;
        }

        // Add task and its children
        targetSection.tasks.push(task);
      }
    }
  }

  // Rebuild markdown content
  const lines: string[] = [];

  if (targetContent && !targetContent.trim().startsWith("#")) {
    // Preserve any header content
    const firstSectionIndex = targetContent.indexOf("\n##");
    if (firstSectionIndex > 0) {
      lines.push(targetContent.substring(0, firstSectionIndex).trim());
      lines.push("");
    }
  } else if (!targetContent) {
    // Create default header for new file
    lines.push("# Project TODO List");
    lines.push("");
    lines.push("Merged from multiple TODO.md files across the project.");
    lines.push("");
  }

  // Add sections with tasks
  const sectionOrder = ["TODO", "IN PROGRESS", "ICEBOX", "COMPLETED"];
  const orderedSections = [...targetSections].sort((a, b) => {
    const aIndex = sectionOrder.indexOf(a.name.toUpperCase());
    const bIndex = sectionOrder.indexOf(b.name.toUpperCase());

    if (aIndex >= 0 && bIndex >= 0) {
      return aIndex - bIndex;
    }
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;

    return a.name.localeCompare(b.name);
  });

  for (const section of orderedSections) {
    if (section.tasks.length === 0) {
      continue;
    }

    lines.push(`## ${section.name}`);
    lines.push("");

    // Add tasks with proper indentation
    const addTask = (task: any, indent: number = 0) => {
      const prefix = "  ".repeat(indent);
      const checkbox = task.checked ? "[x]" : "[ ]";
      const priority = task.priority ? ` [${task.priority}]` : "";

      lines.push(`${prefix}- ${checkbox}${priority} ${task.content}`);

      // Add children
      if (task.children) {
        for (const child of task.children) {
          addTask(child, indent + 1);
        }
      }
    };

    for (const task of section.tasks) {
      if (task.parentLineNumber === undefined) {
        addTask(task);
      }
    }

    lines.push("");
  }

  return normalizeMarkdownFormat(lines.join("\n"));
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

  // Ensure file ends with a newline
  if (normalized.length > 0 && normalized[normalized.length - 1] !== "") {
    normalized.push("");
  }

  return normalized.join("\n");
}
