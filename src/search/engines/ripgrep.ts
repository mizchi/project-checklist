// Ripgrep search engine implementation
import type { SearchEngine } from "../interface.ts";
import type { LegacyTodoItem } from "../../mod.ts";
import {
  commandExists,
  createTodoItem,
  extractTodoContent,
  parseGrepLine,
} from "../base.ts";

export class RipgrepEngine implements SearchEngine {
  name = "ripgrep";

  async isAvailable(): Promise<boolean> {
    return await commandExists("rg");
  }

  async searchTodos(
    directory: string,
    _patterns: RegExp[],
  ): Promise<LegacyTodoItem[]> {
    const todos: LegacyTodoItem[] = [];

    // Use ripgrep with multiple patterns for efficiency
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

    return todos;
  }
}
