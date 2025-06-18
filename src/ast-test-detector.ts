import { $ } from "dax";
import { TodoItem } from "./types.ts";
import { generateId } from "./markdown-parser.ts";

export interface AstTestCase {
  name: string;
  line: number;
  column: number;
  type: "test" | "describe" | "it";
  skipped: boolean;
  filePath: string;
  code: string;
}

// Check if ast-grep is installed
export async function checkAstGrepInstalled(): Promise<boolean> {
  try {
    const cmd = new Deno.Command("ast-grep", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const output = await cmd.output();
    return output.success;
  } catch {
    return false;
  }
}

// ast-grep patterns for different test frameworks
const AST_GREP_PATTERNS = {
  denoTest: 'Deno.test($$$)',
  denoTestSkip: 'Deno.test.skip($$$)',
  itTest: 'it($$$)',
  itTestSkip: 'it.skip($$$)',
  testFn: 'test($$$)',
  testSkip: 'test.skip($$$)',
  describe: 'describe($$$)',
  describeSkip: 'describe.skip($$$)',
};

interface AstGrepMatch {
  text: string;
  range: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  file: string;
}

async function runAstGrep(filePath: string, pattern: string): Promise<AstGrepMatch[]> {
  try {
    const cmd = new Deno.Command("ast-grep", {
      args: ["--pattern", pattern, filePath, "--json"],
      stdout: "piped",
      stderr: "piped",
    });
    const output = await cmd.output();
    
    if (!output.success) {
      return [];
    }
    
    const stdoutText = new TextDecoder().decode(output.stdout).trim();
    if (!stdoutText) {
      return [];
    }
    
    // ast-grep outputs JSON array
    try {
      const data = JSON.parse(stdoutText);
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        // Single match
        return [data];
      }
      return [];
    } catch {
      // Try parsing as newline-delimited JSON
      const matches: AstGrepMatch[] = [];
      const lines = stdoutText.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const match = JSON.parse(line);
            matches.push(match);
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
      
      return matches;
    }
  } catch {
    return [];
  }
}

function extractTestName(text: string): string | null {
  // Extract the arguments part from the test call
  const argsMatch = text.match(/(?:Deno\.test|it|test|describe)(?:\.skip)?\s*\(([^)]*)\)/s);
  if (!argsMatch) return null;
  
  const args = argsMatch[1].trim();
  
  // Match string literals: "test", 'test', `test`
  const stringMatch = args.match(/^["'`]([^"'`]+)["'`]/);
  if (stringMatch) {
    return stringMatch[1];
  }
  
  // Match object with name property: { name: "test", ... }
  const objectMatch = args.match(/{\s*name:\s*["'`]([^"'`]+)["'`]/);
  if (objectMatch) {
    return objectMatch[1];
  }
  
  return null;
}

export async function detectTestCasesWithAst(
  filePath: string,
  includeSkipped: boolean = true
): Promise<AstTestCase[]> {
  const testCases: AstTestCase[] = [];
  
  // Check if ast-grep is available
  if (!await checkAstGrepInstalled()) {
    throw new Error("ast-grep is not installed. Please install it first: https://ast-grep.github.io/guide/quick-start.html");
  }
  
  // Define patterns to search for
  const patterns = [
    { pattern: AST_GREP_PATTERNS.denoTest, type: "test" as const, skipped: false },
    { pattern: AST_GREP_PATTERNS.denoTestSkip, type: "test" as const, skipped: true },
    { pattern: AST_GREP_PATTERNS.itTest, type: "it" as const, skipped: false },
    { pattern: AST_GREP_PATTERNS.itTestSkip, type: "it" as const, skipped: true },
    { pattern: AST_GREP_PATTERNS.testFn, type: "test" as const, skipped: false },
    { pattern: AST_GREP_PATTERNS.testSkip, type: "test" as const, skipped: true },
    { pattern: AST_GREP_PATTERNS.describe, type: "describe" as const, skipped: false },
    { pattern: AST_GREP_PATTERNS.describeSkip, type: "describe" as const, skipped: true },
  ];
  
  // Run all patterns and collect matches
  for (const { pattern, type, skipped } of patterns) {
    const matches = await runAstGrep(filePath, pattern);
    
    for (const match of matches) {
      // Skip non-skipped tests if includeSkipped is true and this is not skipped
      if (includeSkipped && !skipped) {
        continue;
      }
      
      const testName = extractTestName(match.text);
      if (!testName) continue;
      
      testCases.push({
        name: testName,
        line: match.range.start.line,
        column: match.range.start.column,
        type,
        skipped,
        filePath,
        code: match.text,
      });
    }
  }
  
  return testCases;
}

export async function convertAstTestCasesToTodos(testCases: AstTestCase[]): Promise<TodoItem[]> {
  const todos: TodoItem[] = [];
  
  for (const testCase of testCases) {
    const prefix = testCase.skipped ? "SKIP" : "TEST";
    const typeEmoji = testCase.type === "describe" ? "📁" : "🧪";
    
    const id = await generateId(
      `test-${testCase.name}`,
      testCase.line,
      testCase.filePath
    );
    
    todos.push({
      type: prefix as TodoItem["type"],
      text: `${typeEmoji} ${testCase.name}`,
      filePath: testCase.filePath,
      line: testCase.line,
      column: testCase.column,
      id,
    });
  }
  
  return todos;
}

// Integrate with existing file search
export async function findTestsInFileWithAst(
  filePath: string,
  includeSkipped: boolean = true
): Promise<TodoItem[]> {
  // Only process TypeScript/JavaScript files
  if (!filePath.match(/\.(ts|tsx|js|jsx)$/)) {
    return [];
  }
  
  // Only process test files
  if (!filePath.match(/\.(test|spec)\./)) {
    return [];
  }
  
  try {
    const testCases = await detectTestCasesWithAst(filePath, includeSkipped);
    return await convertAstTestCasesToTodos(testCases);
  } catch (error) {
    if (error.message.includes("ast-grep is not installed")) {
      throw error;
    }
    // Log other errors but continue
    console.error(`Failed to detect tests in ${filePath}: ${error}`);
    return [];
  }
}