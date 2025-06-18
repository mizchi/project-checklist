import { TodoItem } from "./mod.ts";
import { updateChecklistItem } from "./markdown-parser.ts";
import { relative } from "@std/path";
import { bold, cyan, gray, green } from "@std/fmt/colors";

interface SelectableItem {
  todo: TodoItem;
  path: string;
  displayPath: string;
  depth: number;
  index: number;
}

export async function runSelectMode(todos: TodoItem[], baseDir: string, itemId?: string) {
  // Flatten todos for selection
  const items: SelectableItem[] = [];
  let index = 1;
  
  function collectItems(todoList: TodoItem[], filePath: string, depth = 0) {
    for (const todo of todoList) {
      if (todo.type === "file" && todo.todos) {
        const absolutePath = filePath.startsWith("/") ? filePath : `${baseDir}/${todo.path}`;
        collectItems(todo.todos, absolutePath, depth);
      } else if (todo.type === "markdown" && todo.id && todo.checked !== undefined) {
        items.push({
          todo,
          path: filePath,
          displayPath: relative(baseDir, filePath),
          depth,
          index: index++,
        });
        if (todo.todos) {
          collectItems(todo.todos, filePath, depth + 1);
        }
      }
    }
  }
  
  collectItems(todos, baseDir);
  
  if (items.length === 0) {
    console.log("No checklist items found.");
    return;
  }
  
  // Display all items
  console.log(bold("📋 TODO Checklist Items"));
  console.log(gray("Use number to toggle items\n"));
  
  let currentFile = "";
  for (const item of items) {
    if (item.displayPath !== currentFile) {
      currentFile = item.displayPath;
      console.log(bold(`\n📄 ${currentFile}`));
    }
    
    const indent = "  ".repeat(item.depth + 1);
    const checkbox = item.todo.checked ? green("[x]") : gray("[ ]");
    const content = item.todo.content || "";
    const number = cyan(`${item.index}.`);
    
    console.log(`${indent}${number} ${checkbox} ${content}`);
  }
  
  // If itemId is provided, toggle that specific item
  if (itemId) {
    // Parse as number only (ID is internal)
    const itemNumber = parseInt(itemId);
    let targetItem: SelectableItem | undefined;
    
    if (!isNaN(itemNumber) && itemNumber >= 1 && itemNumber <= items.length) {
      targetItem = items[itemNumber - 1];
    }
    
    if (targetItem && targetItem.todo.id) {
      await updateChecklistItem(
        targetItem.path,
        targetItem.todo.id,
        !targetItem.todo.checked
      );
      
      console.log(`\n✅ Toggled: ${targetItem.todo.content} -> ${!targetItem.todo.checked ? '[x]' : '[ ]'}`);
    } else {
      console.error(`\n❌ Item not found: ${itemId}`);
    }
  } else {
    console.log("\n" + gray("Use --select <number> to toggle a specific item"));
  }
}