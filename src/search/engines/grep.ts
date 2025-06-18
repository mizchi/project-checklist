// Standard grep search engine implementation
import type { SearchEngine } from "../interface.ts";
import type { LegacyTodoItem } from "../../mod.ts";
import { commandExists, parseGrepLine, extractTodoContent, createTodoItem } from "../base.ts";

export class GrepEngine implements SearchEngine {
  name = "grep";

  async isAvailable(): Promise<boolean> {
    return await commandExists("grep");
  }

  async searchTodos(directory: string, patterns: RegExp[]): Promise<LegacyTodoItem[]> {
    const todos: LegacyTodoItem[] = [];

    for (const pattern of patterns) {
      try {
        const patternStr = pattern.source;
        
        const command = new Deno.Command("grep", {
          args: [
            "-r",
            "--line-number",
            "--extended-regexp",
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