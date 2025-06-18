import { findTodos } from "./mod.ts";
import { updateChecklistItem } from "./markdown-parser.ts";
import { bold, green, red } from "@std/fmt/colors";

interface CheckArgs {
  off?: boolean;
  gitroot?: boolean;
  private?: boolean;
  _?: (string | number)[];
}

export async function runCheckCommand(itemId: string, args: CheckArgs) {
  // Determine target path based on options
  let targetPath = ".";
  
  if (args.gitroot && args.private) {
    console.error("Error: Cannot use both --gitroot and --private options together");
    Deno.exit(1);
  }
  
  if (args.gitroot) {
    // Find git root
    try {
      const command = new Deno.Command("git", {
        args: ["rev-parse", "--show-toplevel"],
        stdout: "piped",
        stderr: "null",
      });
      const { stdout, success } = await command.output();
      if (success) {
        targetPath = new TextDecoder().decode(stdout).trim();
      } else {
        console.error("Error: Not in a git repository");
        Deno.exit(1);
      }
    } catch {
      console.error("Error: Git command failed");
      Deno.exit(1);
    }
  } else if (args.private) {
    // Use ~/.todo directory
    const homeDir = Deno.env.get("HOME");
    if (!homeDir) {
      console.error("Error: HOME environment variable not set");
      Deno.exit(1);
    }
    targetPath = `${homeDir}/.todo`;
  }
  
  // Find all TODOs
  const todos = await findTodos(targetPath, { scanCode: false });
  
  // Find the item with matching ID
  interface FoundItem {
    todo: any;
    filePath: string;
  }
  
  let foundItem: FoundItem | null = null;
  
  function findItemById(todoList: any[], filePath: string): void {
    for (const todo of todoList) {
      if (todo.type === "file" && todo.todos) {
        const absolutePath = todo.path.startsWith("/") ? todo.path : `${targetPath}/${todo.path}`;
        findItemById(todo.todos, absolutePath);
      } else if (todo.type === "markdown" && todo.id === itemId) {
        foundItem = { todo, filePath };
        return;
      } else if (todo.todos) {
        findItemById(todo.todos, filePath);
      }
    }
  }
  
  findItemById(todos, targetPath);
  
  if (!foundItem) {
    console.error(`Error: No item found with ID: ${itemId}`);
    Deno.exit(1);
  }
  
  // Determine new state
  const currentState = foundItem.todo.checked || false;
  const newState = args.off ? false : !currentState;
  
  // Update the item
  await updateChecklistItem(foundItem.filePath, itemId, newState);
  
  // Show result
  const stateSymbol = newState ? "✓" : "☐";
  const stateColor = newState ? green : red;
  
  console.log(bold("\n✨ Updated checklist item:"));
  console.log(`  ${stateColor(stateSymbol)} ${foundItem.todo.content}`);
  console.log(`  ID: ${itemId}`);
  console.log(`  File: ${foundItem.filePath}`);
  console.log(`  State: ${currentState ? "checked" : "unchecked"} → ${newState ? "checked" : "unchecked"}`);
}