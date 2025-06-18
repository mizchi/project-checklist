// Tree display utilities for CLI output

export interface TreeDisplayOptions {
  showIds?: boolean;
  maxItems?: number;
  maxDepth?: number;
  uncheckedOnly?: boolean;
}

export interface TreeNode {
  content: string;
  children?: TreeNode[];
  isChecked?: boolean;
  id?: string;
  type?: string;
}

const TREE_CHARS = {
  BRANCH: "├── ",
  LAST_BRANCH: "└── ",
  VERTICAL: "│   ",
  EMPTY: "    ",
};

export function displayTree(
  nodes: TreeNode[],
  options: TreeDisplayOptions = {},
  prefix = "",
  isLast = true,
  currentDepth = 0,
): string[] {
  const lines: string[] = [];
  let displayCount = 0;
  const maxItems = options.maxItems;
  const maxDepth = options.maxDepth;

  // Check if we've reached max depth
  if (maxDepth !== undefined && currentDepth >= maxDepth) {
    if (nodes.length > 0) {
      const totalChildren = countAllChildren(nodes);
      lines.push(
        `${prefix}└── ... (${totalChildren} items hidden by depth limit)`,
      );
    }
    return lines;
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLastNode = i === nodes.length - 1;

    // Check if we've reached the max items limit
    if (maxItems !== undefined && displayCount >= maxItems) {
      const remaining = nodes.length - i;
      if (remaining > 0) {
        const branch = isLastNode ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH;
        lines.push(`${prefix}${branch}... and ${remaining} more items`);
      }
      break;
    }

    // Skip checked items in unchecked mode
    if (options.uncheckedOnly && node.isChecked) {
      // Check if it has unchecked children
      if (node.children && hasUncheckedChildren(node.children)) {
        // Show it with indication
        const branch = isLastNode ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH;
        const checkbox = "[x]";
        const idSuffix = options.showIds && node.id ? ` [${node.id}]` : "";
        lines.push(
          `${prefix}${branch}${checkbox} ${node.content} (has unchecked items)${idSuffix}`,
        );

        // Process children
        const childPrefix = prefix +
          (isLastNode ? TREE_CHARS.EMPTY : TREE_CHARS.VERTICAL);
        const childLines = displayTree(
          node.children,
          options,
          childPrefix,
          false,
          currentDepth + 1,
        );
        lines.push(...childLines);
        displayCount++;
      }
      continue;
    }

    // Build the display line
    const branch = isLastNode ? TREE_CHARS.LAST_BRANCH : TREE_CHARS.BRANCH;
    let display = "";

    if (node.isChecked !== undefined) {
      const checkbox = node.isChecked ? "[x]" : "[ ]";
      display = `${checkbox} ${node.content}`;
    } else {
      display = node.content;
    }

    if (options.showIds && node.id) {
      display += ` [${node.id}]`;
    }

    lines.push(`${prefix}${branch}${display}`);
    displayCount++;

    // Process children
    if (node.children && node.children.length > 0) {
      const childPrefix = prefix +
        (isLastNode ? TREE_CHARS.EMPTY : TREE_CHARS.VERTICAL);
      const childLines = displayTree(
        node.children,
        options,
        childPrefix,
        false,
        currentDepth + 1,
      );
      lines.push(...childLines);
    }
  }

  return lines;
}

function hasUncheckedChildren(nodes: TreeNode[]): boolean {
  for (const node of nodes) {
    if (node.isChecked === false) {
      return true;
    }
    if (node.children && hasUncheckedChildren(node.children)) {
      return true;
    }
  }
  return false;
}

function countAllChildren(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++; // Count the node itself
    if (node.children && node.children.length > 0) {
      count += countAllChildren(node.children);
    }
  }
  return count;
}

// Convert legacy TodoItem format to TreeNode
export function convertTodoToTreeNode(todo: any): TreeNode {
  const node: TreeNode = {
    content: "",
    type: todo.type,
  };

  if (todo.type === "file") {
    node.content = todo.path;
  } else if (todo.type === "code") {
    const typeEmoji = {
      "TODO": "📝",
      "FIXME": "🔧",
      "HACK": "⚡",
      "NOTE": "📌",
      "XXX": "❌",
      "WARNING": "⚠️",
    } as Record<string, string>;
    const emoji = typeEmoji[todo.commentType || "TODO"] || "📝";
    node.content = `${emoji} ${todo.path}:${todo.line} [${
      todo.commentType || "TODO"
    }] - ${todo.content}`;
  } else if (todo.type === "markdown") {
    node.content = todo.content;
    node.isChecked = todo.checked;
    node.id = todo.id;
  }

  if (todo.todos && todo.todos.length > 0) {
    node.children = todo.todos.map(convertTodoToTreeNode);
  }

  return node;
}
