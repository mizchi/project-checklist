import { $ } from "dax";
import { bold } from "@std/fmt/colors";
import { LegacyTodoItem } from "./mod.ts";
import { updateChecklistItem } from "./markdown-parser.ts";
import { relative } from "@std/path";

interface InteractiveItem {
  todo: LegacyTodoItem;
  path: string;
  displayPath: string;
  depth: number;
}

export async function runInteractiveMode(
  todos: LegacyTodoItem[],
  baseDir: string,
) {
  // Flatten todos for interactive selection
  const items: InteractiveItem[] = [];

  function collectItems(
    todoList: LegacyTodoItem[],
    filePath: string,
    depth = 0,
  ) {
    for (const todo of todoList) {
      if (todo.type === "file" && todo.todos) {
        const absolutePath = filePath.startsWith("/")
          ? filePath
          : `${baseDir}/${todo.path}`;
        collectItems(todo.todos, absolutePath, depth);
      } else if (
        todo.type === "markdown" && todo.id && todo.checked !== undefined
      ) {
        items.push({
          todo,
          path: filePath,
          displayPath: relative(baseDir, filePath),
          depth,
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

  // Interactive selection loop
  while (true) {
    // Build options for select
    const options: string[] = [];
    const optionMap = new Map<string, InteractiveItem>();

    // Group items by file
    let currentFile = "";
    for (const item of items) {
      // Add file header when file changes
      if (item.displayPath !== currentFile) {
        currentFile = item.displayPath;
        options.push(`── ${currentFile} ──`);
      }

      const indent = "  ".repeat(item.depth + 1);
      const checkbox = item.todo.checked ? "[x]" : "[ ]";
      const content = item.todo.content || "";
      const optionText = `${indent}${checkbox} ${content}`;

      options.push(optionText);
      optionMap.set(optionText, item);
    }

    // Add special options
    options.push("─────────────────────────");
    options.push("✓ Check all");
    options.push("✗ Uncheck all");
    options.push("↻ Toggle all");
    options.push("✕ Exit");

    // Show select menu (use maybeSelect to handle cancellation)
    const selectedIndex = await $.maybeSelect({
      message: bold("📋 Select a TODO item to toggle:"),
      options,
    });

    // Handle exit or cancellation
    if (selectedIndex === undefined) {
      break;
    }

    const selected = options[selectedIndex];

    if (selected === "✕ Exit") {
      break;
    }

    // Skip file headers and separators
    if (selected.startsWith("──") || selected === "─────────────────────────") {
      continue;
    }

    // Handle special options
    if (selected === "✓ Check all") {
      for (const item of items) {
        if (item.todo.id && !item.todo.checked) {
          await updateChecklistItem(
            item.path,
            item.todo.id,
            true,
          );
          item.todo.checked = true;
        }
      }
      continue;
    }

    if (selected === "✗ Uncheck all") {
      for (const item of items) {
        if (item.todo.id && item.todo.checked) {
          await updateChecklistItem(
            item.path,
            item.todo.id,
            false,
          );
          item.todo.checked = false;
        }
      }
      continue;
    }

    if (selected === "↻ Toggle all") {
      for (const item of items) {
        if (item.todo.id) {
          await updateChecklistItem(
            item.path,
            item.todo.id,
            !item.todo.checked,
          );
          item.todo.checked = !item.todo.checked;
        }
      }
      continue;
    }

    // Handle item selection
    const selectedItem = optionMap.get(selected);
    if (selectedItem && selectedItem.todo.id) {
      await updateChecklistItem(
        selectedItem.path,
        selectedItem.todo.id,
        !selectedItem.todo.checked,
      );
      selectedItem.todo.checked = !selectedItem.todo.checked;
    }
  }

  console.log("\n✨ Changes saved!");
}
