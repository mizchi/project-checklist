import { expect } from "@std/expect";
import {
  parseTodoFileWithChecklist,
  updateChecklistItem,
} from "./markdown-parser.ts";
import { join } from "@std/path";

Deno.test("parseTodoFileWithChecklist should parse simple checklist", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  await Deno.writeTextFile(
    todoFile,
    `# TODO List
- [ ] First task
- [x] Second task (completed)
- [ ] Third task
`,
  );

  const { items } = await parseTodoFileWithChecklist(todoFile);

  expect(items.length).toBe(3);
  expect(items[0].content).toBe("First task");
  expect(items[0].checked).toBe(false);
  expect(items[0].id).toBeTruthy();

  expect(items[1].content).toBe("Second task (completed)");
  expect(items[1].checked).toBe(true);

  expect(items[2].content).toBe("Third task");
  expect(items[2].checked).toBe(false);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("parseTodoFileWithChecklist should parse nested checklist", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  await Deno.writeTextFile(
    todoFile,
    `# Nested TODO

- [ ] Parent task
  - [ ] Child task 1
  - [x] Child task 2
    - [ ] Grandchild task
  - [ ] Child task 3
- [x] Another parent
`,
  );

  const { items } = await parseTodoFileWithChecklist(todoFile);

  expect(items.length).toBe(2);

  // First parent
  expect(items[0].content).toBe("Parent task");
  expect(items[0].checked).toBe(false);
  expect(items[0].children).toBeTruthy();
  expect(items[0].children!.length).toBe(3);

  // Children of first parent
  const children = items[0].children!;
  expect(children[0].content).toBe("Child task 1");
  expect(children[1].content).toBe("Child task 2");
  expect(children[1].checked).toBe(true);
  expect(children[1].children).toBeTruthy();
  expect(children[1].children!.length).toBe(1);
  expect(children[1].children![0].content).toBe("Grandchild task");

  // Second parent
  expect(items[1].content).toBe("Another parent");
  expect(items[1].checked).toBe(true);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("updateChecklistItem should toggle checkbox status", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  const initialContent = `# TODO
- [ ] Task to toggle
- [x] Already completed
`;

  await Deno.writeTextFile(todoFile, initialContent);

  // Parse initial state
  const { items: initialItems } = await parseTodoFileWithChecklist(todoFile);
  const taskId = initialItems[0].id;

  expect(initialItems[0].checked).toBe(false);

  // Toggle to checked
  await updateChecklistItem(todoFile, taskId, true);

  // Parse updated state
  const { items: updatedItems } = await parseTodoFileWithChecklist(todoFile);
  expect(updatedItems[0].checked).toBe(true);

  // Toggle back to unchecked
  await updateChecklistItem(todoFile, taskId, false);

  // Parse final state
  const { items: finalItems } = await parseTodoFileWithChecklist(todoFile);
  expect(finalItems[0].checked).toBe(false);

  await Deno.remove(testDir, { recursive: true });
});
