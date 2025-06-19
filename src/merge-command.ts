import { join, relative } from "@std/path";
import { walk } from "@std/fs/walk";
import { type ParsedSection, parseMarkdown } from "./core/markdown-parser.ts";
import { 
  type AutoResponse, 
  getNextMultiSelectResponse, 
  getNextConfirmResponse 
} from "./cli/auto-response.ts";

export interface MergeOptions {
  targetFile?: string;
  interactive?: boolean;
  dryRun?: boolean;
  preserveSource?: boolean;
  skipEmpty?: boolean;
  autoResponse?: AutoResponse;
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
    filesToProcess = await selectFilesInteractively(filesToProcess, options.autoResponse);

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
      let shouldRemove = false;
      
      if (options.autoResponse) {
        const response = getNextConfirmResponse(options.autoResponse);
        if (response !== undefined) {
          shouldRemove = response;
        } else {
          // Fallback to interactive if no auto response available
          const { $ } = await import("dax");
          shouldRemove = await $.confirm({
            message: "Remove merged source files?",
            default: false,
          });
        }
      } else {
        const { $ } = await import("dax");
        shouldRemove = await $.confirm({
          message: "Remove merged source files?",
          default: false,
        });
      }

      if (shouldRemove) {
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
  autoResponse?: AutoResponse,
): Promise<TodoFile[]> {
  // Prepare options for multiSelect
  const options = files.map((file) => {
    const taskCount = file.sections.reduce((sum, s) => sum + s.tasks.length, 0);
    const sectionNames = file.sections.map((s) => s.name).join(", ");

    return {
      text: `${file.relativePath} (${taskCount} tasks | ${sectionNames})`,
      value: file,
    };
  });

  let selectedIndices: number[] | undefined;

  if (autoResponse) {
    const response = getNextMultiSelectResponse(autoResponse);
    if (response !== undefined) {
      selectedIndices = response;
    } else {
      // Fallback to interactive if no auto response available
      const { $ } = await import("dax");
      selectedIndices = await $.multiSelect({
        message: "Select files to merge:",
        options,
      });
    }
  } else {
    const { $ } = await import("dax");
    selectedIndices = await $.multiSelect({
      message: "Select files to merge:",
      options,
    });
  }

  if (!selectedIndices || selectedIndices.length === 0) {
    return [];
  }

  // Convert indices to actual files
  return selectedIndices.map((index) => options[index].value);
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

      // Add all tasks from source
      for (const task of sourceSection.tasks) {
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

    // Add tasks with their original indentation
    for (const task of section.tasks) {
      // Use the actual leading whitespace from the original line
      const match = task.line.match(/^(\s*)-\s*\[/);
      const prefix = match ? match[1] : "  ".repeat(task.indent);
      const checkbox = task.checked ? "[x]" : "[ ]";

      // Remove priority from content if it exists
      let content = task.content;
      if (task.priority) {
        // Remove priority tag from the beginning of content
        content = content.replace(/^\s*\[[^\]]+\]\s*/, "");
      }
      const priority = task.priority ? ` [${task.priority}]` : "";

      lines.push(`${prefix}- ${checkbox}${priority} ${content}`);
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
