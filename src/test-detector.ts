import { TodoItem } from "./types.ts";
import { generateId } from "./markdown-parser.ts";

export interface TestCase {
  name: string;
  line: number;
  column: number;
  type: "test" | "describe" | "it";
  skipped: boolean;
  filePath: string;
  id: string;
}

// Patterns for detecting test cases
const TEST_PATTERNS = [
  // Deno.test("name", ...) or Deno.test({ name: "...", ... })
  /Deno\.test\.skip\s*\(\s*(?:["'`]([^"'`]+)["'`]|{\s*name:\s*["'`]([^"'`]+)["'`])/g,
  /Deno\.test\s*\(\s*(?:["'`]([^"'`]+)["'`]|{\s*name:\s*["'`]([^"'`]+)["'`])/g,
  // it.skip("name", ...) or it("name", ...)
  /it\.skip\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /it\s*\(\s*["'`]([^"'`]+)["'`]/g,
  // test.skip("name", ...) or test("name", ...)
  /test\.skip\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /test\s*\(\s*["'`]([^"'`]+)["'`]/g,
  // describe.skip("name", ...) or describe("name", ...)
  /describe\.skip\s*\(\s*["'`]([^"'`]+)["'`]/g,
  /describe\s*\(\s*["'`]([^"'`]+)["'`]/g,
];

export async function detectTestCases(
  filePath: string,
  content: string,
  includeSkipped: boolean = true,
): Promise<TestCase[]> {
  const testCases: TestCase[] = [];
  const lines = content.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Check each pattern
    for (const pattern of TEST_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex state
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const patternStr = pattern.source;
        const isSkipped = patternStr.includes("\\.skip");

        // Skip non-skipped tests if includeSkipped is false
        if (!isSkipped && !includeSkipped) {
          continue;
        }

        // Skip regular tests if we only want skipped ones
        if (!isSkipped && includeSkipped) {
          continue;
        }

        const testName = match[1] || match[2]; // Handle both string and object syntax
        if (!testName) continue;

        let type: TestCase["type"] = "test";
        if (patternStr.includes("describe")) {
          type = "describe";
        } else if (patternStr.includes("it")) {
          type = "it";
        }

        const id = await generateId(
          `test-${testName}`,
          lineNum + 1,
          filePath,
        );

        testCases.push({
          name: testName,
          line: lineNum + 1,
          column: match.index + 1,
          type,
          skipped: isSkipped,
          filePath,
          id,
        });
      }
    }
  }

  return testCases;
}

export function convertTestCasesToTodos(testCases: TestCase[]): TodoItem[] {
  return testCases.map((testCase) => {
    const prefix = testCase.skipped ? "SKIP" : "TEST";
    const typeEmoji = testCase.type === "describe" ? "📁" : "🧪";

    return {
      type: prefix as TodoItem["type"],
      text: `${typeEmoji} ${testCase.name}`,
      filePath: testCase.filePath,
      line: testCase.line,
      column: testCase.column,
      id: testCase.id,
    };
  });
}

// Integrate with existing file search
export async function findTestsInFile(
  filePath: string,
  includeSkipped: boolean = true,
): Promise<TodoItem[]> {
  // Only process TypeScript files
  if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
    return [];
  }

  // Skip test files themselves by default
  if (filePath.includes(".test.") || filePath.includes(".spec.")) {
    const content = await Deno.readTextFile(filePath);
    const testCases = await detectTestCases(filePath, content, includeSkipped);
    return convertTestCasesToTodos(testCases);
  }

  return [];
}
