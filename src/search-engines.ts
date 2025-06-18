import { TodoItem } from "./mod.ts";

export interface SearchEngine {
  name: string;
  isAvailable(): Promise<boolean>;
  searchTodos(directory: string, patterns: RegExp[]): Promise<TodoItem[]>;
}

// Check if a command exists
async function commandExists(cmd: string): Promise<boolean> {
  try {
    const command = new Deno.Command(cmd, {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

// Parse line number and file from grep-like output
function parseGrepLine(
  line: string,
): { file: string; lineNum: number; content: string } | null {
  // Format: filename:linenum:content
  const match = line.match(/^(.+?):(\d+):(.*)$/);
  if (!match) return null;

  return {
    file: match[1],
    lineNum: parseInt(match[2], 10),
    content: match[3].trim(),
  };
}

// Extract TODO content from a line
function extractTodoContent(line: string): { type: string; content: string } | null {
  const patterns = [
    /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)/i,
    /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)/i,
    /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\s*(.+)\*\//i,
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        type: match[1].toUpperCase(),
        content: match[2].trim(),
      };
    }
  }
  return null;
}

export class RipgrepEngine implements SearchEngine {
  name = "ripgrep";

  async isAvailable(): Promise<boolean> {
    return await commandExists("rg");
  }

  async searchTodos(directory: string, _patterns: RegExp[]): Promise<TodoItem[]> {
    const todos: TodoItem[] = [];

    const command = new Deno.Command("rg", {
      args: [
        "--line-number",
        "--no-heading",
        "--color=never",
        "--type-add=code:*.{ts,tsx,js,jsx,py,go,rs,java,c,cpp,h,hpp}",
        "--type=code",
        "-e", "TODO:",
        "-e", "FIXME:",
        "-e", "HACK:",
        "-e", "NOTE:",
        "-e", "XXX:",
        "-e", "WARNING:",
        directory,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout, stderr, success } = await command.output();
    if (!success) {
      console.error("Ripgrep failed:", new TextDecoder().decode(stderr));
      return todos;
    }

    const output = new TextDecoder().decode(stdout);
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (!line) continue;
      
      // Handle single file output (no filename prefix)
      const singleFileMatch = line.match(/^(\d+):(.*)$/);
      if (singleFileMatch) {
        const lineNum = parseInt(singleFileMatch[1], 10);
        const content = singleFileMatch[2].trim();
        const extracted = extractTodoContent(content);
        if (extracted) {
          todos.push({
            type: "code",
            path: directory, // Use the directory/file path passed in
            line: lineNum,
            content: extracted.content,
            commentType: extracted.type as TodoItem["commentType"],
          });
        }
        continue;
      }
      
      // Handle multi-file output (with filename prefix)
      const parsed = parseGrepLine(line);
      if (parsed) {
        const extracted = extractTodoContent(parsed.content);
        if (extracted) {
          todos.push({
            type: "code",
            path: parsed.file,
            line: parsed.lineNum,
            content: extracted.content,
            commentType: extracted.type as TodoItem["commentType"],
          });
        }
      }
    }

    return todos;
  }
}

export class GitGrepEngine implements SearchEngine {
  name = "git grep";

  async isAvailable(): Promise<boolean> {
    const hasGit = await commandExists("git");
    if (!hasGit) return false;

    // Check if we're in a git repository
    try {
      const command = new Deno.Command("git", {
        args: ["rev-parse", "--git-dir"],
        stdout: "null",
        stderr: "null",
      });
      const { success } = await command.output();
      return success;
    } catch {
      return false;
    }
  }

  async searchTodos(directory: string, _patterns: RegExp[]): Promise<TodoItem[]> {
    const todos: TodoItem[] = [];

    const command = new Deno.Command("git", {
      args: [
        "grep",
        "--line-number",
        "-E",
        "(//|#|/\\*)\\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):?\\s*.+",
        "--",
        "*.ts",
        "*.tsx",
        "*.js",
        "*.jsx",
        "*.py",
        "*.go",
        "*.rs",
        "*.java",
        "*.c",
        "*.cpp",
        "*.h",
        "*.hpp",
      ],
      cwd: directory,
      stdout: "piped",
      stderr: "null",
    });

    const { stdout, success } = await command.output();
    if (!success) return todos;

    const output = new TextDecoder().decode(stdout);
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (!line) continue;
      const parsed = parseGrepLine(line);
      if (parsed) {
        const extracted = extractTodoContent(parsed.content);
        if (extracted) {
          todos.push({
            type: "code",
            path: parsed.file,
            line: parsed.lineNum,
            content: extracted.content,
            commentType: extracted.type as TodoItem["commentType"],
          });
        }
      }
    }

    return todos;
  }
}

export class GrepEngine implements SearchEngine {
  name = "grep";

  async isAvailable(): Promise<boolean> {
    return await commandExists("grep");
  }

  async searchTodos(directory: string, _patterns: RegExp[]): Promise<TodoItem[]> {
    const todos: TodoItem[] = [];

    // Use find + grep for recursive search
    const command = new Deno.Command("sh", {
      args: [
        "-c",
        `find "${directory}" -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" -o -name "*.c" -o -name "*.cpp" -o -name "*.h" -o -name "*.hpp" \\) -exec grep -Hn -E "(//|#|/\\*)\\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):*\\s*.\\+" {} \\;`,
      ],
      stdout: "piped",
      stderr: "null",
    });

    const { stdout, success } = await command.output();
    if (!success) return todos;

    const output = new TextDecoder().decode(stdout);
    const lines = output.trim().split("\n");

    for (const line of lines) {
      if (!line) continue;
      const parsed = parseGrepLine(line);
      if (parsed) {
        const extracted = extractTodoContent(parsed.content);
        if (extracted) {
          todos.push({
            type: "code",
            path: parsed.file.replace(directory + "/", ""),
            line: parsed.lineNum,
            content: extracted.content,
            commentType: extracted.type as TodoItem["commentType"],
          });
        }
      }
    }

    return todos;
  }
}

// Import native implementation
import { walk } from "@std/fs/walk";
import { relative } from "@std/path";

// Native Deno implementation (fallback)
export class DenoNativeEngine implements SearchEngine {
  name = "deno-native";

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true); // Always available
  }

  async searchTodos(directory: string, _patterns: RegExp[]): Promise<TodoItem[]> {
    const todos: TodoItem[] = [];
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
    const IGNORE_DIRS = [
      "node_modules",
      ".git",
      "dist",
      "build",
      "coverage",
      ".next",
      ".nuxt",
    ];

    for await (
      const entry of walk(directory, {
        includeDirs: false,
        skip: IGNORE_DIRS.map((dir) => new RegExp(`[\\/\\\\]${dir}[\\/\\\\]`)),
      })
    ) {
      // Check if it's a code file
      const isCodeFile = CODE_EXTENSIONS.some((ext) =>
        entry.path.endsWith(ext)
      );
      if (!isCodeFile) continue;

      const content = await Deno.readTextFile(entry.path);
      const lines = content.split("\n");
      const relativePath = relative(directory, entry.path);

      lines.forEach((line, index) => {
        const extracted = extractTodoContent(line);
        if (extracted) {
          todos.push({
            type: "code",
            path: relativePath,
            line: index + 1,
            content: extracted.content,
            commentType: extracted.type as TodoItem["commentType"],
          });
        }
      });
    }

    return todos;
  }
}

// Auto-detect the best available engine (prefer ripgrep)
export async function detectBestEngine(): Promise<SearchEngine> {
  // Try ripgrep first as default
  const ripgrep = new RipgrepEngine();
  if (await ripgrep.isAvailable()) {
    return ripgrep;
  }

  // Then try other engines
  const engines = [
    new GitGrepEngine(),
    new GrepEngine(),
    new DenoNativeEngine(),
  ];

  for (const engine of engines) {
    if (await engine.isAvailable()) {
      return engine;
    }
  }

  // Fallback to native implementation
  return new DenoNativeEngine();
}

// Get engine by name
export async function getEngineByName(
  name: string,
): Promise<SearchEngine | null> {
  const engineMap: Record<string, SearchEngine> = {
    "rg": new RipgrepEngine(),
    "ripgrep": new RipgrepEngine(),
    "git-grep": new GitGrepEngine(),
    "git": new GitGrepEngine(),
    "grep": new GrepEngine(),
    "native": new DenoNativeEngine(),
    "deno": new DenoNativeEngine(),
  };

  const engine = engineMap[name.toLowerCase()];
  if (engine && await engine.isAvailable()) {
    return engine;
  }

  return null;
}
