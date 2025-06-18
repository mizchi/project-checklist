import { assertEquals } from "@std/assert";
import { displayTree, convertTodoToTreeNode, type TreeNode } from "./tree-display.ts";

Deno.test("displayTree - basic tree structure", () => {
  const nodes: TreeNode[] = [
    {
      content: "Parent 1",
      children: [
        { content: "Child 1.1" },
        { content: "Child 1.2" },
      ],
    },
    {
      content: "Parent 2",
      children: [
        { content: "Child 2.1" },
      ],
    },
  ];

  const lines = displayTree(nodes);
  
  assertEquals(lines.length, 5);
  assertEquals(lines[0], "└── Parent 1");
  assertEquals(lines[1], "    ├── Child 1.1");
  assertEquals(lines[2], "    └── Child 1.2");
  assertEquals(lines[3], "└── Parent 2");
  assertEquals(lines[4], "    └── Child 2.1");
});

Deno.test("displayTree - with max items", () => {
  const nodes: TreeNode[] = [
    {
      content: "Parent",
      children: [
        { content: "Child 1" },
        { content: "Child 2" },
        { content: "Child 3" },
        { content: "Child 4" },
      ],
    },
  ];

  const lines = displayTree(nodes, { maxItems: 2 });
  
  assertEquals(lines[0], "└── Parent");
  assertEquals(lines[1], "    ├── Child 1");
  assertEquals(lines[2], "    ├── Child 2");
  assertEquals(lines[3], "    └── ... and 2 more items");
});

Deno.test("displayTree - with max depth", () => {
  const nodes: TreeNode[] = [
    {
      content: "Level 0",
      children: [
        {
          content: "Level 1",
          children: [
            {
              content: "Level 2",
              children: [
                { content: "Level 3" },
              ],
            },
          ],
        },
      ],
    },
  ];

  const lines = displayTree(nodes, { maxDepth: 2 });
  
  assertEquals(lines[0], "└── Level 0");
  assertEquals(lines[1], "    └── Level 1");
  assertEquals(lines[2], "        └── ... (1 items hidden by depth limit)");
});

Deno.test("displayTree - with checked items", () => {
  const nodes: TreeNode[] = [
    {
      content: "Task 1",
      isChecked: false,
    },
    {
      content: "Task 2",
      isChecked: true,
    },
  ];

  const lines = displayTree(nodes);
  
  assertEquals(lines[0], "└── [ ] Task 1");
  assertEquals(lines[1], "└── [x] Task 2");
});

Deno.test("displayTree - unchecked only mode", () => {
  const nodes: TreeNode[] = [
    {
      content: "Unchecked task",
      isChecked: false,
    },
    {
      content: "Checked task",
      isChecked: true,
    },
    {
      content: "Checked parent",
      isChecked: true,
      children: [
        {
          content: "Unchecked child",
          isChecked: false,
        },
      ],
    },
  ];

  const lines = displayTree(nodes, { uncheckedOnly: true });
  
  assertEquals(lines.length, 3);
  assertEquals(lines[0], "└── [ ] Unchecked task");
  assertEquals(lines[1], "└── [x] Checked parent (has unchecked items)");
  assertEquals(lines[2], "    └── [ ] Unchecked child");
});

Deno.test("displayTree - with IDs", () => {
  const nodes: TreeNode[] = [
    {
      content: "Task with ID",
      isChecked: false,
      id: "abc123",
    },
  ];

  const lines = displayTree(nodes, { showIds: true });
  
  assertEquals(lines[0], "└── [ ] Task with ID [abc123]");
});

Deno.test("convertTodoToTreeNode - file type", () => {
  const todo = {
    type: "file",
    path: "TODO.md",
    todos: [],
  };

  const node = convertTodoToTreeNode(todo);
  
  assertEquals(node.content, "TODO.md");
  assertEquals(node.type, "file");
});

Deno.test("convertTodoToTreeNode - code type", () => {
  const todo = {
    type: "code",
    path: "src/main.ts",
    line: 42,
    content: "Fix this later",
    commentType: "TODO",
  };

  const node = convertTodoToTreeNode(todo);
  
  assertEquals(node.content, "📝 src/main.ts:42 [TODO] - Fix this later");
  assertEquals(node.type, "code");
});

Deno.test("convertTodoToTreeNode - markdown type", () => {
  const todo = {
    type: "markdown",
    content: "Complete this task",
    checked: false,
    id: "xyz789",
  };

  const node = convertTodoToTreeNode(todo);
  
  assertEquals(node.content, "Complete this task");
  assertEquals(node.isChecked, false);
  assertEquals(node.id, "xyz789");
});