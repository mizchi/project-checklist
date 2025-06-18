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
  commentType?: "TODO" | "FIXME" | "HACK" | "NOTE" | "XXX" | "WARNING";
  id?: string;
  checked?: boolean;
}

import type { SearchEngine } from "./search/interface.ts";
import { loadConfig, type PcheckConfig } from "./config.ts";
import { findTestsInFileWithAst, checkAstGrepInstalled } from "./ast-test-detector.ts";
import type { TodoItem } from "./types.ts";

export interface FindTodosOptions {
  scanFiles?: boolean;
  scanCode?: boolean;
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
// Support multiple comment formats: TODO, FIXME, HACK, NOTE, XXX, WARNING
const TODO_PATTERNS = [
  /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)/i,
  /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)/i,  // Python, Ruby, Shell
  /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)\*\//i,  // C-style block comments
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
  const patterns = ignorePattern.split(',').map(p => p.trim());
  
  for (const pattern of patterns) {
    // Simple glob pattern matching
    if (pattern.includes('*')) {
      // Convert glob to regex
      const regex = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
        .replace(/\*/g, '.*') // Replace * with .*
        .replace(/\?/g, '.'); // Replace ? with .
      
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
  options: FindTodosOptions = DEFAULT_OPTIONS,
): Promise<TodoItem[]> {
  const todos: TodoItem[] = [];
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
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
  
  const fileName = filePath.split('/').pop() || '';
  
  // Check if file should be ignored
  if (mergedOptions.ignore && matchesIgnorePattern(filePath, mergedOptions.ignore)) {
    return todos;
  }
  
  // Check if it's a TODO.md or README.md file
  const lowerFileName = fileName.toLowerCase();
  if (mergedOptions.scanFiles && (lowerFileName === 'todo.md' || lowerFileName === 'readme.md')) {
    const fileTodos = await parseTodoFile(filePath);
    if (fileTodos.length > 0) {
      todos.push({
        type: "file",
        path: fileName,
        todos: fileTodos,
      });
    }
  }
  
  // Check if it's a code file
  if (mergedOptions.scanCode && isCodeFile(filePath)) {
    // For single files, always use native search
    // Search engines are designed for directory searches
    const codeTodos = await findTodosInCode(filePath);
    for (const todo of codeTodos) {
      todos.push({
        ...todo,
        path: fileName,
      });
    }
  }
  
  return todos;
}

export async function findTodos(
  directory: string,
  options: FindTodosOptions = DEFAULT_OPTIONS,
): Promise<TodoItem[]> {
  const todos: TodoItem[] = [];
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Parse filter options
  const filterExtensions = mergedOptions.filterType?.split(",").map(ext => 
    ext.trim().startsWith(".") ? ext.trim() : `.${ext.trim()}`
  );
  const filterDirs = mergedOptions.filterDir?.split(",").map(dir => dir.trim());
  const excludeDirs = mergedOptions.excludeDir?.split(",").map(dir => dir.trim());

  // Use search engine for code if provided
  if (mergedOptions.scanCode && mergedOptions.searchEngine) {
    const codeTodos = await mergedOptions.searchEngine.searchTodos(
      directory,
      TODO_PATTERNS,
    );
    
    // Apply filters to search engine results
    const filteredTodos = codeTodos.filter(todo => {
      // Filter by extension
      if (filterExtensions && !filterExtensions.some(ext => todo.path.endsWith(ext))) {
        return false;
      }
      
      // Filter by directory
      if (filterDirs) {
        const inFilterDir = filterDirs.some(dir => 
          todo.path.startsWith(dir + "/") || todo.path.includes("/" + dir + "/")
        );
        if (!inFilterDir) return false;
      }
      
      // Exclude directories
      if (excludeDirs) {
        const inExcludeDir = excludeDirs.some(dir => 
          todo.path.startsWith(dir + "/") || todo.path.includes("/" + dir + "/")
        );
        if (inExcludeDir) return false;
      }
      
      return true;
    });
    
    todos.push(...filteredTodos);
  }

  // Build skip patterns including exclude directories
  const skipPatterns = IGNORE_DIRS.map((dir) => new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
  if (excludeDirs) {
    excludeDirs.forEach(dir => {
      skipPatterns.push(new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
      skipPatterns.push(new RegExp(`^${dir}[\\/\\\\]`));
    });
  }

  for await (
    const entry of walk(directory, {
      includeDirs: false,
      skip: skipPatterns,
    })
  ) {
    const relativePath = relative(directory, entry.path);

    // Check if file should be ignored
    if (mergedOptions.ignore && matchesIgnorePattern(relativePath, mergedOptions.ignore)) {
      continue;
    }

    // Apply directory filters
    if (filterDirs) {
      const inFilterDir = filterDirs.some(dir => 
        relativePath.startsWith(dir + "/") || relativePath.includes("/" + dir + "/") || relativePath.startsWith(dir)
      );
      if (!inFilterDir) continue;
    }

    const lowerEntryName = entry.name.toLowerCase();
    if (mergedOptions.scanFiles && (lowerEntryName === "todo.md" || lowerEntryName === "readme.md")) {
      const fileTodos = await parseTodoFile(entry.path);
      if (fileTodos.length > 0) {
        todos.push({
          type: "file",
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
      // Apply extension filter
      if (filterExtensions && !filterExtensions.some(ext => entry.path.endsWith(ext))) {
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

  return todos;
}

function isCodeFile(path: string): boolean {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

import { parseTodoFileWithChecklist } from "./markdown-parser.ts";

async function parseTodoFile(filePath: string): Promise<TodoItem[]> {
  try {
    // Try to parse as markdown with checklist
    const { items } = await parseTodoFileWithChecklist(filePath);
    
    // If we got checklist items, convert them
    if (items.length > 0) {
      // Convert ChecklistItem to TodoItem
      const convertItems = (checklistItems: typeof items): TodoItem[] => {
        return checklistItems.map(item => ({
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
  const todos: TodoItem[] = [];
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("- ") || trimmed.startsWith("* ") ||
      trimmed.startsWith("+ ")
    ) {
      todos.push({
        type: "markdown",
        path: filePath,
        content: trimmed.substring(2).trim(),
      });
    } else if (trimmed.match(/^\d+\.\s+/)) {
      const match = trimmed.match(/^\d+\.\s+(.+)/);
      if (match) {
        todos.push({
          type: "markdown",
          path: filePath,
          content: match[1].trim(),
        });
      }
    }
  }

  return todos;
}

async function findTodosInCode(filePath: string): Promise<TodoItem[]> {
  const todos: TodoItem[] = [];
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    for (const pattern of TODO_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const commentType = match[1].toUpperCase() as TodoItem["commentType"];
        const content = match[2].trim();
        todos.push({
          type: "code",
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
