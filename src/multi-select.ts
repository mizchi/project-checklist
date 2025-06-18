import { $ } from "dax";
import { bold } from "@std/fmt/colors";
import { TodoItem } from "./mod.ts";
import { updateChecklistItem } from "./markdown-parser.ts";
import { relative } from "@std/path";

interface SelectableItem {
  todo: TodoItem;
  path: string;
  displayPath: string;
  depth: number;
  originalChecked?: boolean;
}

interface ChangeResult {
  id: string;
  path: string;
  content: string;
  before: boolean;
  after: boolean;
}

export async function runMultiSelectMode(todos: TodoItem[], baseDir: string, uncheckedOnly: boolean) {
  // Collect all selectable items
  const items: SelectableItem[] = [];
  
  function collectItems(todoList: TodoItem[], filePath: string, depth = 0) {
    for (const todo of todoList) {
      if (todo.type === "file" && todo.todos) {
        const absolutePath = todo.path.startsWith("/") ? todo.path : `${baseDir}/${todo.path}`;
        collectItems(todo.todos, absolutePath, 0); // Reset depth for new file
      } else if (todo.type === "markdown" && todo.id && todo.checked !== undefined) {
        // Filter by uncheckedOnly if specified
        if (!uncheckedOnly || !todo.checked) {
          items.push({
            todo,
            path: filePath,
            displayPath: relative(baseDir, filePath),
            depth,
            originalChecked: todo.checked,
          });
        }
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
  
  // Build options for multi-select
  const options: string[] = [];
  const optionMap = new Map<string, SelectableItem>();
  
  // Group items by file
  let currentFile = "";
  for (const item of items) {
    // Add file header when file changes
    if (item.displayPath !== currentFile) {
      currentFile = item.displayPath;
      // Don't add file headers to selectable options
    }
    
    const indent = "  ".repeat(item.depth);
    const content = item.todo.content || "";
    const optionText = `${indent}${content} (${currentFile})`;
    
    options.push(optionText);
    optionMap.set(optionText, item);
  }
  
  // Show multi-select menu
  let selected: string[] | undefined;
  
  // Check for demo mode with mock selections
  const mockSelections = Deno.env.get("PTODO_MOCK_SELECTIONS");
  if (mockSelections) {
    const indices = mockSelections.split(",").map(n => parseInt(n.trim()) - 1);
    selected = indices
      .filter(i => i >= 0 && i < options.length)
      .map(i => options[i]);
    console.log("Mock mode: Selected items", indices.map(i => i + 1).join(", "));
  } else {
    try {
      selected = await $.maybeMultiSelect({
        message: bold("📋 Select items to toggle (Space to select, Enter to confirm):"),
        options,
      });
    } catch (error) {
      // If not in TTY (e.g., in CI or piped), show available options
      if (error.message.includes("not a tty")) {
        console.log("Available items to select:");
        options.forEach((opt, idx) => {
          console.log(`  ${idx + 1}. ${opt}`);
        });
        console.log("\nNote: Interactive mode requires a TTY environment.");
        console.log("Use in a terminal or provide --select option for specific items.");
        console.log("For testing, use: PTODO_MOCK_SELECTIONS=\"1,3,5\" to select items by number.");
        return;
      }
      throw error;
    }
  }
  
  if (!selected || selected.length === 0) {
    console.log("No items selected.");
    return;
  }
  
  // Process selected items and track changes
  const changes: ChangeResult[] = [];
  
  for (const selection of selected) {
    const item = optionMap.get(selection);
    if (item && item.todo.id) {
      const newCheckedState = !item.todo.checked;
      
      // Update the item
      await updateChecklistItem(
        item.path,
        item.todo.id,
        newCheckedState
      );
      
      // Track the change
      changes.push({
        id: item.todo.id,
        path: item.displayPath,
        content: item.todo.content || "",
        before: item.todo.checked || false,
        after: newCheckedState,
      });
      
      // Update local state
      item.todo.checked = newCheckedState;
    }
  }
  
  // Output changes for AI consumption
  console.log("\n✨ Changes completed!");
  console.log("\n=== CHANGES FOR AI ===");
  console.log(JSON.stringify({
    action: "multi-select-toggle",
    timestamp: new Date().toISOString(),
    changes: changes,
    summary: {
      total_changed: changes.length,
      checked_to_unchecked: changes.filter(c => c.before && !c.after).length,
      unchecked_to_checked: changes.filter(c => !c.before && c.after).length,
    }
  }, null, 2));
  console.log("=== END CHANGES ===");
}