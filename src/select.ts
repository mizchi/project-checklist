import { LegacyTodoItem } from "./mod.ts";
import { TodoItem } from "./types.ts";
import { updateChecklistItem } from "./markdown-parser.ts";
import { relative } from "@std/path";
import { bold, cyan, gray, green } from "@std/fmt/colors";

interface SelectableItem {
  todo: LegacyTodoItem;
  path: string;
  displayPath: string;
  depth: number;
  index: number;
}

export async function runSelectMode(
  todos: TodoItem[] | LegacyTodoItem[],
  baseDir: string,
  itemId?: string,
) {
  // Flatten todos for selection
  const items: SelectableItem[] = [];
  let index = 1;

  function collectItems(
    todoList: TodoItem[] | LegacyTodoItem[],
    filePath: string,
    depth = 0,
  ) {
    for (const todo of todoList) {
      // Handle LegacyTodoItem
      if (
        "type" in todo && todo.type === "file" && "todos" in todo && todo.todos
      ) {
        const legacyTodo = todo as LegacyTodoItem;
        const absolutePath = filePath.startsWith("/")
          ? filePath
          : `${baseDir}/${legacyTodo.path}`;
        if (legacyTodo.todos) {
          collectItems(legacyTodo.todos, absolutePath, depth);
        }
      } else if (
        "type" in todo && todo.type === "markdown" && "id" in todo && todo.id &&
        "checked" in todo && todo.checked !== undefined
      ) {
        const legacyTodo = todo as LegacyTodoItem;
        items.push({
          todo: legacyTodo,
          path: filePath,
          displayPath: relative(baseDir, filePath),
          depth,
          index: index++,
        });
        if ("todos" in legacyTodo && legacyTodo.todos) {
          collectItems(legacyTodo.todos, filePath, depth + 1);
        }
      }
    }
  }

  collectItems(todos as LegacyTodoItem[], baseDir);

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
        !targetItem.todo.checked,
      );

      console.log(
        `\n✅ Toggled: ${targetItem.todo.content} -> ${
          !targetItem.todo.checked ? "[x]" : "[ ]"
        }`,
      );
    } else {
      console.error(`\n❌ Item not found: ${itemId}`);
    }
  } else {
    console.log("\n" + gray("Use --select <number> to toggle a specific item"));
  }
}
