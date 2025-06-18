// Ripgrep search engine implementation
import type { SearchEngine } from "../interface.ts";
import type { LegacyTodoItem } from "../../mod.ts";
import { commandExists, parseGrepLine, extractTodoContent, createTodoItem } from "../base.ts";

export class RipgrepEngine implements SearchEngine {
  name = "ripgrep";

  async isAvailable(): Promise<boolean> {
    return await commandExists("rg");
  }

  async searchTodos(directory: string, patterns: RegExp[]): Promise<LegacyTodoItem[]> {
    const todos: LegacyTodoItem[] = [];

    for (const pattern of patterns) {
      try {
        // Build regex pattern for ripgrep
        const patternStr = pattern.source;
        
        const command = new Deno.Command("rg", {
          args: [
            "--line-number",
            "--no-heading",
            "--color=never",
            patternStr,
            directory,
          ],
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