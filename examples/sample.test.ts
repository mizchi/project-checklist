// Sample test file for testing ast-grep

Deno.test("Simple test", () => {
  console.log("test");
});

Deno.test.skip("Skipped test", () => {
  console.log("skipped");
});

it("It test", () => {
  console.log("it");
});

it.skip("Skipped it test", () => {
  console.log("skipped it");
});

describe("Test suite", () => {
  test("Nested test", () => {
    console.log("nested");
  });
  
  test.skip("Skipped nested test", () => {
    console.log("skipped nested");
  });
});