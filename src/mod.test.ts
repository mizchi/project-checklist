import { expect } from "@std/expect";
import { findTodos, findTodosInFile } from "./mod.ts";
import { join } from "@std/path";

Deno.test("findTodos should find TODO.md files", async () => {
  const testDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    join(testDir, "TODO.md"),
    `# TODO List
- [ ] First task
- [ ] Second task
- [x] Third task
- [ ] Fourth task
`,
  );

  const todos = await findTodos(testDir, { scanCode: false });

  expect(todos.length).toBe(1);
  expect(todos[0].type).toBe("file");
  expect(todos[0].path).toBe("TODO.md");
  expect(todos[0].todos?.length).toBe(4);

  const todoContents = todos[0].todos!.map((t) => t.content);
  expect(todoContents).toEqual([
    "First task",
    "Second task",
    "Third task",
    "Fourth task",
  ]);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodosInFile should process single TODO.md file", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");

  await Deno.writeTextFile(
    todoFile,
    `# TODO List
- [ ] First task
- [ ] Second task
- [x] Third task
- [ ] Fourth task
`,
  );

  const todos = await findTodosInFile(todoFile);

  expect(todos.length).toBe(1);
  expect(todos[0].type).toBe("file");
  expect(todos[0].path).toBe("TODO.md");
  expect(todos[0].todos?.length).toBe(4);

  const todoContents = todos[0].todos!.map((t) => t.content);
  expect(todoContents).toEqual([
    "First task",
    "Second task",
    "Third task",
    "Fourth task",
  ]);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodosInFile should process single code file", async () => {
  const testDir = await Deno.makeTempDir();
  const codeFile = join(testDir, "test.ts");

  await Deno.writeTextFile(
    codeFile,
    `function example() {
  // TODO: Implement this function
  console.log("Not implemented");
  // FIXME: Add error handling
}`,
  );

  const todos = await findTodosInFile(codeFile);

  expect(todos.length).toBe(2);
  expect(todos[0].type).toBe("code");
  expect(todos[0].path).toBe("test.ts");
  expect(todos[0].line).toBe(2);
  expect(todos[0].content).toBe("Implement this function");
  expect(todos[0].commentType).toBe("TODO");
  expect(todos[1].line).toBe(4);
  expect(todos[1].content).toBe("Add error handling");
  expect(todos[1].commentType).toBe("FIXME");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodosInFile should throw error for non-existent file", async () => {
  await expect(
    findTodosInFile("/non/existent/file.txt"),
  ).rejects.toThrow("File not found");
});

Deno.test("findTodosInFile should throw error for directory", async () => {
  const testDir = await Deno.makeTempDir();

  await expect(
    findTodosInFile(testDir),
  ).rejects.toThrow("Path is not a file");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodosInFile should respect options", async () => {
  const testDir = await Deno.makeTempDir();
  const todoFile = join(testDir, "TODO.md");
  const codeFile = join(testDir, "code.ts");

  await Deno.writeTextFile(todoFile, "- [ ] Task in TODO.md");
  await Deno.writeTextFile(codeFile, "// TODO: Fix in code");

  // Test with scanFiles: false
  const noFiles = await findTodosInFile(todoFile, { scanFiles: false });
  expect(noFiles.length).toBe(0);

  // Test with scanCode: false
  const noCode = await findTodosInFile(codeFile, { scanCode: false });
  expect(noCode.length).toBe(0);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodos should find TODO comments in code", async () => {
  const testDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    join(testDir, "test.ts"),
    `function example() {
  // TODO: Implement this function
  console.log("Not implemented");
  // TODO Add error handling
}`,
  );

  const todos = await findTodos(testDir, { scanFiles: false, scanCode: true });

  expect(todos.length).toBe(2);
  expect(todos[0].type).toBe("code");
  expect(todos[0].line).toBe(2);
  expect(todos[0].content).toBe("Implement this function");
  expect(todos[0].commentType).toBe("TODO");
  expect(todos[1].content).toBe("Add error handling");
  expect(todos[1].commentType).toBe("TODO");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodos should find different comment types", async () => {
  const testDir = await Deno.makeTempDir();

  await Deno.writeTextFile(
    join(testDir, "test.ts"),
    `function example() {
  // TODO: Implement this
  // FIXME: Fix the bug here
  // HACK: Temporary workaround
  // NOTE: Important information
  // XXX: This needs attention
  // WARNING: Be careful with this
}`,
  );

  await Deno.writeTextFile(
    join(testDir, "test.py"),
    `def example():
    # TODO: Python todo
    # FIXME: Python fixme
    pass`,
  );

  await Deno.writeTextFile(
    join(testDir, "test.c"),
    `void example() {
  /* TODO: C-style todo */
  /* HACK: C-style hack */
}`,
  );

  const todos = await findTodos(testDir, { scanFiles: false, scanCode: true });

  // Filter and check TypeScript comments
  const tsTodos = todos.filter((t) => t.path.endsWith("test.ts"));
  expect(tsTodos.length).toBe(6);
  expect(tsTodos[0].commentType).toBe("TODO");
  expect(tsTodos[1].commentType).toBe("FIXME");
  expect(tsTodos[2].commentType).toBe("HACK");
  expect(tsTodos[3].commentType).toBe("NOTE");
  expect(tsTodos[4].commentType).toBe("XXX");
  expect(tsTodos[5].commentType).toBe("WARNING");

  // Check Python comments
  const pyTodos = todos.filter((t) => t.path.endsWith("test.py"));
  expect(pyTodos.length).toBe(2);
  expect(pyTodos[0].commentType).toBe("TODO");
  expect(pyTodos[1].commentType).toBe("FIXME");

  // Check C comments
  const cTodos = todos.filter((t) => t.path.endsWith("test.c"));
  expect(cTodos.length).toBe(2);
  expect(cTodos[0].commentType).toBe("TODO");
  expect(cTodos[1].commentType).toBe("HACK");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodos should respect options", async () => {
  const testDir = await Deno.makeTempDir();

  await Deno.writeTextFile(join(testDir, "TODO.md"), "- [ ] Task");
  await Deno.writeTextFile(join(testDir, "code.ts"), "// TODO: Fix");

  const noFiles = await findTodos(testDir, { scanFiles: false, scanCode: true });
  expect(noFiles.length).toBe(1);
  expect(noFiles[0].type).toBe("code");

  const noCode = await findTodos(testDir, { scanCode: false });
  expect(noCode.length).toBe(1);
  expect(noCode[0].type).toBe("file");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodos should handle nested directories", async () => {
  const testDir = await Deno.makeTempDir();
  const subDir = join(testDir, "src");
  await Deno.mkdir(subDir);

  await Deno.writeTextFile(
    join(subDir, "app.js"),
    "// TODO: Refactor this code",
  );

  const todos = await findTodos(testDir, { scanCode: true });

  expect(todos.length).toBe(1);
  expect(todos[0].path).toBe("src/app.js");

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findTodos should ignore node_modules", async () => {
  const testDir = await Deno.makeTempDir();
  const nodeModules = join(testDir, "node_modules");
  await Deno.mkdir(nodeModules);

  await Deno.writeTextFile(
    join(nodeModules, "code.js"),
    "// TODO: Should be ignored",
  );

  await Deno.writeTextFile(
    join(testDir, "code.js"),
    "// TODO: Should be found",
  );

  const todos = await findTodos(testDir, { scanCode: true });

  expect(todos.length).toBe(1);
  expect(todos[0].content).toBe("Should be found");

  await Deno.remove(testDir, { recursive: true });
});