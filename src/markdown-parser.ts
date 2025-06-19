import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { ListItem, Root } from "npm:@types/mdast@^4.0.0";
import { crypto } from "@std/crypto";

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  line?: number;
  parent?: string;
  children?: ChecklistItem[];
}

export interface ParsedTodoFile {
  items: ChecklistItem[];
  rawContent: string;
}

// Generate a stable ID based on content and position
export async function generateId(
  content: string,
  line: number,
  parentId?: string,
): Promise<string> {
  const input = `${parentId || "root"}-${line}-${content}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return hashHex.substring(0, 8);
}

export async function parseTodoFileWithChecklist(
  filePath: string,
): Promise<ParsedTodoFile> {
  const rawContent = await Deno.readTextFile(filePath);
  const items: ChecklistItem[] = [];

  const processor = remark().use(remarkGfm);
  const tree = processor.parse(rawContent) as Root;

  // Track current nesting level
  const itemStack: ChecklistItem[] = [];
  let currentParentId: string | undefined;

  const listItemNodes: Array<{
    node: ListItem;
    parent: any;
  }> = [];

  let hasCheckboxes = false;
  visit(tree, "listItem", (node: ListItem, _index, parent) => {
    if (node.checked !== null && node.checked !== undefined) {
      hasCheckboxes = true;
      listItemNodes.push({ node, parent });
    }
  });

  // If no checkboxes found, return empty items
  if (!hasCheckboxes) {
    return {
      items: [],
      rawContent,
    };
  }

  // Process nodes with async ID generation
  for (const { node, parent } of listItemNodes) {
    const content = extractTextContent(node).trim();
    const line = node.position?.start.line || 0;

    // Generate ID based on content and position
    const id = await generateId(content, line, currentParentId);

    const item: ChecklistItem = {
      id,
      content,
      checked: node.checked ?? false,
      line,
      parent: currentParentId,
    };

    // Determine nesting level
    if (parent && parent.type === "list" && parent.position) {
      const indent = parent.position.start.column - 1;
      const level = Math.floor(indent / 2);

      // Pop items from stack that are at the same or deeper level
      while (itemStack.length > level) {
        itemStack.pop();
      }

      // Set parent based on stack
      if (itemStack.length > 0) {
        const parentItem = itemStack[itemStack.length - 1];
        item.parent = parentItem.id;

        // Add to parent's children
        if (!parentItem.children) {
          parentItem.children = [];
        }
        parentItem.children.push(item);
      } else {
        items.push(item);
      }

      // Push current item to stack
      itemStack.push(item);
      currentParentId = item.id;
    } else {
      // Top-level item
      items.push(item);
      itemStack.length = 0;
      itemStack.push(item);
      currentParentId = item.id;
    }
  }

  return {
    items,
    rawContent,
  };
}

// Extract text content from a node recursively
function extractTextContent(node: any): string {
  if (node.type === "text") {
    return node.value;
  }

  if (node.type === "inlineCode") {
    return node.value;
  }

  if (node.type === "paragraph" && node.children) {
    return node.children.map(extractTextContent).join("");
  }

  // For list items, only get the direct text content, not nested lists
  if (node.type === "listItem" && node.children) {
    for (const child of node.children) {
      if (child.type === "paragraph") {
        return extractTextContent(child);
      }
    }
  }

  return "";
}

// Update the checked status of an item and save the file
export async function updateChecklistItem(
  filePath: string,
  itemId: string,
  checked: boolean,
): Promise<void> {
  const { items, rawContent } = await parseTodoFileWithChecklist(filePath);

  // Find the item to update
  const findItem = (items: ChecklistItem[]): ChecklistItem | null => {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      if (item.children) {
        const found = findItem(item.children);
        if (found) return found;
      }
    }
    return null;
  };

  const targetItem = findItem(items);
  if (!targetItem || targetItem.line === undefined) {
    throw new Error(`Item with ID ${itemId} not found`);
  }

  // Update the raw content
  const lines = rawContent.split("\n");
  const lineIndex = targetItem.line - 1;

  if (lineIndex >= 0 && lineIndex < lines.length) {
    const line = lines[lineIndex];
    const newCheckbox = checked ? "[x]" : "[ ]";
    const updatedLine = line.replace(/\[([ x])\]/, newCheckbox);
    lines[lineIndex] = updatedLine;
  }

  const updatedContent = lines.join("\n");
  await Deno.writeTextFile(filePath, updatedContent);
}
