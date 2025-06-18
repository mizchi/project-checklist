import { expect } from "@std/expect";
import {
  DenoNativeEngine,
  detectBestEngine,
  getEngineByName,
} from "./search-engines.ts";

Deno.test("DenoNativeEngine should always be available", async () => {
  const engine = new DenoNativeEngine();
  expect(await engine.isAvailable()).toBe(true);
  expect(engine.name).toBe("deno-native");
});

Deno.test("getEngineByName should return correct engines", async () => {
  const nativeEngine = await getEngineByName("deno-native");
  expect(nativeEngine).not.toBeNull();
  expect(nativeEngine?.name).toBe("deno-native");

  // Test aliases
  const denoEngine = await getEngineByName("deno");
  expect(denoEngine).not.toBeNull();
  expect(denoEngine?.name).toBe("deno-native");
});

Deno.test("detectBestEngine should always return an engine", async () => {
  const engine = await detectBestEngine();
  expect(engine).not.toBeNull();
  expect(await engine.isAvailable()).toBe(true);
});

Deno.test("Search engines should find TODOs in test files", async () => {
  // Skip this test for now as there seems to be an issue with walk() in temp directories
  // This is likely a Deno bug or permission issue
  
  const testDir = await Deno.makeTempDir();

  // Create a test file with TODO
  await Deno.writeTextFile(
    `${testDir}/test.ts`,
    `function example() {
  // TODO: Implement this function
  console.log("Not implemented");
  // TODO Add error handling
}`,
  );

  // Test with native engine
  const nativeEngine = new DenoNativeEngine();
  const todos = await nativeEngine.searchTodos(
    testDir,
    [/\/\/\s*TODO:?\s*(.+)/i],
  );

  expect(todos.length).toBe(2);
  expect(todos[0].content).toBe("Implement this function");
  expect(todos[0].line).toBe(2);
  expect(todos[1].content).toBe("Add error handling");
  expect(todos[1].line).toBe(4);

  await Deno.remove(testDir, { recursive: true });
});
