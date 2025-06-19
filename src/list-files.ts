import { walk } from "@std/fs/walk";
import { relative } from "@std/path";
import { FindTodosOptions } from "./mod.ts";

const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", 
  ".c", ".cpp", ".h", ".hpp"
];

const IGNORE_DIRS = [
  "node_modules", ".git", "dist", "build", "coverage", 
  ".next", ".nuxt"
];

export async function listScanFiles(
  directory: string,
  options: FindTodosOptions
): Promise<string[]> {
  const files: string[] = [];
  
  // Build skip patterns including exclude directories
  const skipPatterns = IGNORE_DIRS.map((dir) =>
    new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`)
  );
  
  // Add excludeDir patterns
  if (options.excludeDir) {
    const excludeDirs = options.excludeDir.split(",").map((dir) => dir.trim());
    excludeDirs.forEach((dir) => {
      skipPatterns.push(new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`));
      skipPatterns.push(new RegExp(`^${dir}[\\/\\\\]`));
    });
  }
  
  // Add patterns from config exclude
  if (options.config?.exclude) {
    options.config.exclude.forEach((pattern) => {
      if (pattern.startsWith("**/") && pattern.endsWith("/**")) {
        // Handle patterns like **/node_modules/**
        const dir = pattern.slice(3, -3);
        skipPatterns.push(new RegExp(`[\\/\\\\]${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\/\\\\]`));
      } else if (pattern.startsWith("**/")) {
        // Handle patterns like **/dist
        const dir = pattern.slice(3);
        skipPatterns.push(new RegExp(`[\\/\\\\]${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
        skipPatterns.push(new RegExp(`[\\/\\\\]${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\/\\\\]`));
      } else if (pattern.endsWith("/**")) {
        // Handle patterns like dist/**
        const dir = pattern.slice(0, -3);
        skipPatterns.push(new RegExp(`[\\/\\\\]${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      } else if (pattern.includes("*")) {
        // Handle other glob patterns
        const regex = pattern
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*");
        skipPatterns.push(new RegExp(regex));
      } else {
        // Handle exact patterns
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        skipPatterns.push(new RegExp(`[\\/\\\\]${escaped}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${escaped}[\\/\\\\]`));
        skipPatterns.push(new RegExp(`^${escaped}$`));
      }
    });
  }
  
  for await (const entry of walk(directory, {
    includeDirs: false,
    skip: skipPatterns,
  })) {
    const relativePath = relative(directory, entry.path);
    
    // Check if file matches include patterns from config
    if (options.config?.include && options.config.include.length > 0) {
      let matches = false;
      
      // First check if it's a code file and code scanning is enabled
      if ((options.scanCode || options.config?.code?.enabled) && isCodeFile(entry.path)) {
        matches = true;
      } else {
        // Check include patterns
        for (const pattern of options.config.include) {
          if (pattern.includes("*")) {
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
      }
      
      if (!matches) {
        continue;
      }
    }
    
    const lowerEntryName = entry.name.toLowerCase();
    
    // Check for markdown files
    if (options.scanFiles !== false) {
      if (lowerEntryName === "todo.md" || lowerEntryName === "readme.md" || 
          (options.config?.include && entry.name.toLowerCase().endsWith(".md"))) {
        files.push(relativePath);
        continue;
      }
    }
    
    // Check for code files (only if we haven't already added it as markdown)
    if ((options.scanCode || options.config?.code?.enabled) && !files.includes(relativePath)) {
      if (isCodeFile(entry.path)) {
        // Skip test files unless includeTestCases is true
        if (!options.includeTestCases && !options.config?.code?.includeTests && isTestFile(entry.path)) {
          continue;
        }
        files.push(relativePath);
      }
    }
  }
  
  return files.sort();
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