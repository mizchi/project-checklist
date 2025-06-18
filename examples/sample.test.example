// Sample test file for testing ast-grep

Deno.test("Simple test", () => {
  console.log("test");
});

Deno.test({
  name: "Skipped test",
  ignore: true,
  fn: () => {
    console.log("skipped");
  },
});

// Jest/Mocha style tests (for testing detection of different test frameworks)
// These are intentionally here to test the AST detector's ability to find them
// @ts-ignore
it("It test", () => {
  console.log("it");
});

// @ts-ignore
it.skip("Skipped it test", () => {
  console.log("skipped it");
});

// @ts-ignore
describe("Test suite", () => {
  // @ts-ignore
  test("Nested test", () => {
    console.log("nested");
  });

  // @ts-ignore
  test.skip("Skipped nested test", () => {
    console.log("skipped nested");
  });
});
