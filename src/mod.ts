import { walk } from "@std/fs/walk";
import { relative } from "@std/path";

// Re-export from types.ts for backward compatibility
export type { TodoItem } from "./types.ts";

export interface LegacyTodoItem {
  type: "file" | "code" | "markdown";
  path: string;
  line?: number;
  content?: string;
  todos?: LegacyTodoItem[];
  commentType?:
    | "TODO"
    | "FIXME"
    | "HACK"
    | "NOTE"
    | "XXX"
    | "WARNING"
    | "CHECKLIST";
  id?: string;
  checked?: boolean;
}

import type { SearchEngine } from "./search/interface.ts";
import { type PcheckConfig } from "./config.ts";

export interface FindTodosOptions {
  scanFiles?: boolean;
  scanCode?: boolean;
  includeTestCases?: boolean;
  scanTests?: boolean;
  searchEngine?: SearchEngine;
  filterType?: string;
  filterDir?: string;
  excludeDir?: string;
  config?: PcheckConfig;
  ignore?: string;
}

const DEFAULT_OPTIONS: FindTodosOptions = {
  scanFiles: true,
  scanCode: false,
  scanTests: false,
};

const DEFAULT_FILE_OPTIONS: FindTodosOptions = {
  scanFiles: true,
  scanCode: true,
  scanTests: false,
};

const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
];
// Support multiple comment formats: TODO:, TODO(user):, FIXME:, etc., and checklists
const TODO_PATTERNS = [
  /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i,
  /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i, // With username
  /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i, // Python, Ruby, Shell
  /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i, // With username
  /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)\*\//i, // C-style block comments
  /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)\*\//i, // With username
  /\/\/\s*-\s*\[([ x])\]\s*(.+)/i, // Checklist in // comments
  /#\s*-\s*\[([ x])\]\s*(.+)/i, // Checklist in # comments
  /\/\*\s*-\s*\[([ x])\]\s*(.+)/i, // Checklist in /* comments
  /\*\s*-\s*\[([ x])\]\s*(.+)/i, // Checklist in * comments (multi-line)
];
const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
];

/**
 * Check if a path matches the ignore pattern
 */
function matchesIgnorePattern(path: string, ignorePattern: string): boolean {
  // Split multiple patterns by comma
  const patterns = ignorePattern.split(",").map((p) => p.trim());

  for (const pattern of patterns) {
    // Simple glob pattern matching
    if (pattern.includes("*")) {
      // Convert glob to regex
      const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special chars
        .replace(/\*/g, ".*") // Replace * with .*
        .replace(/\?/g, "."); // Replace ? with .

      if (new RegExp(regex).test(path)) {
        return true;
      }
    } else {
      // Exact match or path contains pattern
      if (path.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find todos in a single file
 */
export async function findTodosInFile(
  filePath: string,
  options: FindTodosOptions = DEFAULT_FILE_OPTIONS,
): Promise<LegacyTodoItem[]> {
  const todos: LegacyTodoItem[] = [];
  const mergedOptions = { ...DEFAULT_FILE_OPTIONS, ...options };

  try {
    const stat = await Deno.stat(filePath);
    if (!stat.isFile) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }

  const fileName = filePath.split("/").pop() || "";

  // Check if file should be ignored
  if (
    mergedOptions.ignore && matchesIgnorePattern(filePath, mergedOptions.ignore)
  ) {
    return todos;
  }

  // Check if it's a TODO.md or README.md file
  const lowerFileName = fileName.toLowerCase();
  if (
    mergedOptions.scanFiles &&
    (lowerFileName === "todo.md" || lowerFileName === "readme.md")
  ) {
    const fileTodos = await parseTodoFile(filePath);
    if (fileTodos.length > 0) {
      todos.push({
        type: "file" as const,
        path: fileName,
        todos: fileTodos,
      });
    }
  }

  // Check if it's a code file
  if (mergedOptions.scanCode && isCodeFile(filePath)) {
    // Skip test files unless includeTestCases is true
    if (!mergedOptions.includeTestCases && isTestFile(filePath)) {
      return todos;
    }

    // For single files, always use native search
    // Search engines are designed for directory searches
    const codeTodos = await findTodosInCode(filePath);
    if (codeTodos.length > 0) {
      // Update paths to use fileName
      const updatedTodos = codeTodos.map((todo) => ({
        ...todo,
        path: fileName,
      }));

      todos.push({
        type: "file" as const,
        path: fileName,
        todos: updatedTodos,
      });
    }
  }

  return todos;
}

export async function findTodos(
  directory: string,
  options: FindTodosOptions = DEFAULT_OPTIONS,
): Promise<LegacyTodoItem[]> {
  const todos: LegacyTodoItem[] = [];
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Parse filter options
  const filterExtensions = mergedOptions.filterType?.split(",").map((ext) =>
    ext.trim().startsWith(".") ? ext.trim() : `.${ext.trim()}`
  );
  const filterDirs = mergedOptions.filterDir?.split(",").map((dir) =>
    dir.trim()
  );
  const excludeDirs = mergedOptions.excludeDir?.split(",").map((dir) =>
    dir.trim()
  );

  // Use search engine for code if provided
  if (mergedOptions.scanCode && mergedOptions.searchEngine) {
    const codeTodos = await mergedOptions.searchEngine.searchTodos(
      directory,
      TODO_PATTERNS,
    );

    // Apply filters to search engine results
    const filteredTodos = codeTodos.filter((todo) => {
      // Normalize path (remove ./ prefix if present)
      const normalizedPath = todo.path.startsWith("./")
        ? todo.path.slice(2)
        : todo.path;

      // Skip test files unless includeTestCases is true
      if (!mergedOptions.includeTestCases && isTestFile(normalizedPath)) {
        return false;
      }

      // Filter by extension
      // Use default code extensions if no filter is specified
      const extensionsToCheck = filterExtensions ||
        (mergedOptions.config?.code?.fileExtensions?.map((ext) =>
          ext.startsWith(".") ? ext : `.${ext}`
        )) ||
        CODE_EXTENSIONS;

      if (!extensionsToCheck.some((ext) => normalizedPath.endsWith(ext))) {
        return false;
      }

      // Filter by directory
      if (filterDirs) {
        const inFilterDir = filterDirs.some((dir) =>
          normalizedPath.startsWith(dir + "/") ||
          normalizedPath.includes("/" + dir + "/")
        );
        if (!inFilterDir) return false;
      }

      // Exclude directories
      if (excludeDirs) {
        const inExcludeDir = excludeDirs.some((dir) =>
          normalizedPath.startsWith(dir + "/") ||
          normalizedPath.includes("/" + dir + "/")
        );
        if (inExcludeDir) return false;
      }

      // Apply config exclude patterns
      if (mergedOptions.config?.exclude) {
        for (const pattern of mergedOptions.config.exclude) {
          if (pattern.endsWith("/**")) {
            const dir = pattern.slice(0, -3);
            if (
              normalizedPath.startsWith(dir + "/") || normalizedPath === dir
            ) {
              return false;
            }
          } else if (pattern.includes("*")) {
            // Convert glob to regex
            const regex = pattern
              .replace(/[.+^${}()|[\]\\]/g, "\\$&")
              .replace(/\*\*/g, ".*")
              .replace(/\*/g, "[^/]*");
            if (new RegExp(regex).test(normalizedPath)) {
              return false;
            }
          } else {
            // Exact match
            if (
              normalizedPath === pattern ||
              normalizedPath.startsWith(pattern + "/")
            ) {
              return false;
            }
          }
        }
      }

      return true;
    });

    todos.push(...filteredTodos);
  }

  // Build skip patterns including exclude directories
  const skipPatterns = IGNORE_DIRS.map((dir) =>
    new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`)
  );
  if (excludeDirs) {
    excludeDirs.forEach((dir) => {
      skipPatterns.push(new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
      skipPatterns.push(new RegExp(`^${dir}[\\/\\\\]`));
    });
  }

  // Add patterns from config exclude
  if (mergedOptions.config?.exclude) {
    mergedOptions.config.exclude.forEach((pattern) => {
      // Handle glob patterns
      if (pattern.endsWith("/**")) {
        const dir = pattern.slice(0, -3);
        // Match both as subdirectory and as root directory
        skipPatterns.push(new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${dir}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${dir}$`));
      } else if (pattern.includes("*")) {
        // Convert glob to regex
        const regex = pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*");
        skipPatterns.push(new RegExp(regex));
      } else {
        // Match exact directory name
        skipPatterns.push(new RegExp(`[\\/\\\\]${pattern}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${pattern}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${pattern}$`));
      }
    });
  }

  let fileCount = 0;
  for await (
    const entry of walk(directory, {
      includeDirs: false,
      skip: skipPatterns,
    })
  ) {
    fileCount++;
    const relativePath = relative(directory, entry.path);

    // Check if file should be ignored
    if (
      mergedOptions.ignore &&
      matchesIgnorePattern(relativePath, mergedOptions.ignore)
    ) {
      continue;
    }

    // Apply directory filters
    if (filterDirs) {
      const inFilterDir = filterDirs.some((dir) =>
        relativePath.startsWith(dir + "/") ||
        relativePath.includes("/" + dir + "/") || relativePath.startsWith(dir)
      );
      if (!inFilterDir) continue;
    }

    const lowerEntryName = entry.name.toLowerCase();

    // Check if it's a markdown file we should scan
    const isTodoOrReadme = lowerEntryName === "todo.md" ||
      lowerEntryName === "readme.md";
    const isMarkdownFile = entry.name.toLowerCase().endsWith(".md");

    // If we have include patterns, check if this file should be included
    if (
      mergedOptions.config?.include &&
      mergedOptions.config.include.length > 0 && !isTodoOrReadme
    ) {
      let matches = false;
      for (const pattern of mergedOptions.config.include) {
        if (pattern.includes("*")) {
          // Convert glob to regex
          const regex = pattern
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*\*/g, ".*")
            .replace(/\*/g, "[^/]*");
          if (new RegExp(regex).test(relativePath)) {
            matches = true;
            break;
          }
        } else if (relativePath.endsWith(pattern) || relativePath === pattern) {
          matches = true;
          break;
        }
      }
      if (!matches) {
        // Skip files that don't match include patterns
        continue;
      }
    }

    if (
      mergedOptions.scanFiles &&
      (isTodoOrReadme || (mergedOptions.config?.include && isMarkdownFile))
    ) {
      const fileTodos = await parseTodoFile(entry.path);
      if (fileTodos.length > 0) {
        todos.push({
          type: "file" as const,
          path: relativePath,
          todos: fileTodos,
        });
      }
    }

    // Only use native file search if no search engine is provided
    if (
      mergedOptions.scanCode && !mergedOptions.searchEngine &&
      isCodeFile(entry.path)
    ) {
      // Skip test files unless includeTestCases is true
      if (!mergedOptions.includeTestCases && isTestFile(entry.path)) {
        continue;
      }

      // Apply extension filter
      if (
        filterExtensions &&
        !filterExtensions.some((ext) => entry.path.endsWith(ext))
      ) {
        continue;
      }

      const codeTodos = await findTodosInCode(entry.path);
      for (const todo of codeTodos) {
        todos.push({
          ...todo,
          path: relativePath,
        });
      }
    }
  }

  // Group code todos by file if scanCode is enabled
  if (mergedOptions.scanCode) {
    const groupedTodos: LegacyTodoItem[] = [];
    const codeByFile = new Map<string, LegacyTodoItem[]>();

    // Separate code todos from other types
    for (const todo of todos) {
      if (todo.type === "code") {
        const fileTodos = codeByFile.get(todo.path) || [];
        fileTodos.push(todo);
        codeByFile.set(todo.path, fileTodos);
      } else {
        groupedTodos.push(todo);
      }
    }

    // Create file-type todo items for each file with code todos
    for (const [filePath, fileTodos] of codeByFile) {
      // Sort by line number
      fileTodos.sort((a, b) => (a.line || 0) - (b.line || 0));
      groupedTodos.push({
        type: "file",
        path: filePath,
        todos: fileTodos,
      });
    }

    return groupedTodos;
  }

  return todos;
}

function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isTestFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return lowerPath.includes(".test.") ||
    lowerPath.includes(".spec.") ||
    lowerPath.includes("_test.") ||
    lowerPath.includes("_spec.") ||
    lowerPath.includes("/test/") ||
    lowerPath.includes("/tests/") ||
    lowerPath.includes("/__tests__/");
}

import { parseTodoFileWithChecklist } from "./markdown-parser.ts";

async function parseTodoFile(filePath: string): Promise<LegacyTodoItem[]> {
  try {
    // Try to parse as markdown with checklist
    const { items } = await parseTodoFileWithChecklist(filePath);

    // If we got checklist items, convert them
    if (items.length > 0) {
      // Convert ChecklistItem to LegacyTodoItem
      const convertItems = (checklistItems: typeof items): LegacyTodoItem[] => {
        return checklistItems.map((item) => ({
          type: "markdown" as const,
          path: filePath,
          content: item.content,
          id: item.id,
          checked: item.checked,
          line: item.line,
          todos: item.children ? convertItems(item.children) : undefined,
        }));
      };

      return convertItems(items);
    }
  } catch {
    // Parsing with remark failed, continue with simple parsing
  }

  // Fallback to simple parsing
  const todos: LegacyTodoItem[] = [];
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Only match checklist items with [ ] or [x]
    const checklistMatch = trimmed.match(/^[-*+]\s*\[([ x])\]\s*(.+)/);
    if (checklistMatch) {
      todos.push({
        type: "markdown" as const,
        path: filePath,
        content: checklistMatch[2].trim(),
        checked: checklistMatch[1] === "x",
      });
    }
  }

  return todos;
}

async function findTodosInCode(filePath: string): Promise<LegacyTodoItem[]> {
  const todos: LegacyTodoItem[] = [];
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // First check for checklist patterns
    const checklistPatterns = [
      /\/\/\s*-\s*\[([ x])\]\s*(.+)/i,
      /#\s*-\s*\[([ x])\]\s*(.+)/i,
      /\/\*\s*-\s*\[([ x])\]\s*(.+)/i,
      /\*\s*-\s*\[([ x])\]\s*(.+)/i,
    ];

    let matched = false;
    for (const pattern of checklistPatterns) {
      const match = line.match(pattern);
      if (match) {
        const checked = match[1] === "x";
        const prefix = checked ? "[✓]" : "[ ]";
        todos.push({
          type: "code" as const,
          path: filePath,
          line: index + 1,
          content: `${prefix} ${match[2].trim()}`,
          commentType: "CHECKLIST",
        });
        matched = true;
        break;
      }
    }

    if (matched) return;

    // Then check for traditional TODO patterns
    const todoPatterns = [
      /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i,
      /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i,
      /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i,
      /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i,
      /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)\*\//i,
      /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)\*\//i,
    ];

    for (const pattern of todoPatterns) {
      const match = line.match(pattern);
      if (match) {
        const commentType = match[1]
          .toUpperCase() as LegacyTodoItem["commentType"];
        const content = match[2].trim();
        todos.push({
          type: "code" as const,
          path: filePath,
          line: index + 1,
          content,
          commentType,
        });
        break; // Only match once per line
      }
    }
  });

  return todos;
}
