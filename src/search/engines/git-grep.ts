// Git grep search engine implementation
import type { SearchEngine } from "../interface.ts";
import type { LegacyTodoItem } from "../../mod.ts";
import { commandExists, parseGrepLine, extractTodoContent, createTodoItem } from "../base.ts";

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

  async searchTodos(directory: string, patterns: RegExp[]): Promise<LegacyTodoItem[]> {
    const todos: LegacyTodoItem[] = [];

    for (const pattern of patterns) {
      try {
        const patternStr = pattern.source;
        
        const command = new Deno.Command("git", {
          args: [
            "grep",
            "--line-number",
            "--extended-regexp",
            patternStr,
          ],
          cwd: directory,
          stdout: "piped",
          stderr: "null",
        });

        const { stdout } = await command.output();
        const output = new TextDecoder().decode(stdout);
        const lines = output.trim().split("\n").filter(Boolean);

        for (const line of lines) {
          const parsed = parseGrepLine(line);
          if (!parsed) continue;

          const todoInfo = extractTodoContent(parsed.content);
          if (!todoInfo) continue;

          todos.push(createTodoItem(
            parsed.file,
            parsed.lineNum,
            todoInfo.type,
            todoInfo.content,
          ));
        }
      } catch {
        // Continue with next pattern
      }
    }

    return todos;
  }
}