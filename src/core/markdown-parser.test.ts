import { assertEquals } from "@std/assert";
import {
  addTaskToSection,
  clearDoneSection,
  findCompletedSection,
  findSection,
  formatTask,
  insertSection,
  moveCompletedTasksToDone,
  parseMarkdown,
  parsePriority,
  parseTask,
  sortTasksByPriority,
} from "./markdown-parser.ts";

Deno.test("parseTask - basic task", () => {
  const task = parseTask("- [ ] Test task", 0);
  assertEquals(task?.checked, false);
  assertEquals(task?.content, "Test task");
  assertEquals(task?.indent, 0);
});

Deno.test("parseTask - checked task", () => {
  const task = parseTask("- [x] Completed task", 0);
  assertEquals(task?.checked, true);
  assertEquals(task?.content, "Completed task");
});

Deno.test("parseTask - indented task", () => {
  const task = parseTask("  - [ ] Indented task", 0);
  assertEquals(task?.indent, 2);
  assertEquals(task?.content, "Indented task");
});

Deno.test("parseTask - with priority", () => {
  const task = parseTask("- [ ] [HIGH] Priority task", 0);
  assertEquals(task?.content, "[HIGH] Priority task");
  assertEquals(task?.priority, "HIGH");
  assertEquals(task?.priorityValue, 1);
});

Deno.test("parsePriority - HIGH/MID/LOW", () => {
  assertEquals(parsePriority("- [ ] [HIGH] Task"), {
    priority: "HIGH",
    priorityValue: 1,
  });
  assertEquals(parsePriority("- [ ] [MID] Task"), {
    priority: "MID",
    priorityValue: 5,
  });
  assertEquals(parsePriority("- [ ] [LOW] Task"), {
    priority: "LOW",
    priorityValue: 10,
  });
});

Deno.test("parsePriority - numeric", () => {
  assertEquals(parsePriority("- [ ] [3] Task"), {
    priority: "3",
    priorityValue: 3,
  });
  assertEquals(parsePriority("- [ ] [99] Task"), {
    priority: "99",
    priorityValue: 99,
  });
});

Deno.test("parsePriority - no priority", () => {
  assertEquals(parsePriority("- [ ] Task without priority"), {
    priorityValue: 100,
  });
});

Deno.test("parseMarkdown - basic structure", () => {
  const content = `# TODO

- [ ] Task 1
- [x] Task 2

## ICEBOX

- [ ] Future task`;

  const result = parseMarkdown(content);

  assertEquals(result.sections.length, 2);
  assertEquals(result.sections[0].name, "TODO");
  assertEquals(result.sections[0].tasks.length, 2);
  assertEquals(result.sections[1].name, "ICEBOX");
  assertEquals(result.sections[1].tasks.length, 1);
});

Deno.test("findSection - case insensitive", () => {
  const content = `## TODO\n\n## IceBox\n\n## done`;
  const { sections } = parseMarkdown(content);

  assertEquals(findSection(sections, "todo")?.name, "TODO");
  assertEquals(findSection(sections, "ICEBOX")?.name, "IceBox");
  assertEquals(findSection(sections, "Done")?.name, "done");
  assertEquals(findSection(sections, "missing"), null);
});

Deno.test("sortTasksByPriority", () => {
  const tasks = [
    {
      line: "- [ ] No priority",
      lineNumber: 0,
      checked: false,
      content: "No priority",
      indent: 0,
      priorityValue: 100,
    },
    {
      line: "- [ ] [LOW] Low",
      lineNumber: 1,
      checked: false,
      content: "[LOW] Low",
      indent: 0,
      priority: "LOW",
      priorityValue: 10,
    },
    {
      line: "- [ ] [HIGH] High",
      lineNumber: 2,
      checked: false,
      content: "[HIGH] High",
      indent: 0,
      priority: "HIGH",
      priorityValue: 1,
    },
    {
      line: "- [ ] [MID] Mid unchecked",
      lineNumber: 3,
      checked: false,
      content: "[MID] Mid unchecked",
      indent: 0,
      priority: "MID",
      priorityValue: 5,
    },
  ];

  const sorted = sortTasksByPriority(tasks);

  // Should be sorted by priority value (lower = higher priority)
  assertEquals(sorted[0].priority, "HIGH");
  assertEquals(sorted[1].priority, "MID");
  assertEquals(sorted[2].priority, "LOW");
  assertEquals(sorted[3].priorityValue, 100);
});

Deno.test("formatTask - with checkbox", () => {
  const task = {
    line: "- [x] [HIGH] Task content",
    lineNumber: 0,
    checked: true,
    content: "[HIGH] Task content",
    indent: 0,
    priority: "HIGH",
    priorityValue: 1,
  };

  assertEquals(formatTask(task), "- [x] [HIGH] Task content");
  assertEquals(formatTask(task, true), "- Task content");
});

Deno.test("insertSection - at end", () => {
  const lines = ["# TODO", "", "- [ ] Task"];
  const result = insertSection(lines, "DONE");

  assertEquals(result.includes("## DONE"), true);
  assertEquals(result[result.length - 1], "");
});

Deno.test("addTaskToSection", () => {
  const lines = ["## TODO", "", "- [ ] Existing task", "", "## OTHER"];
  const section = {
    name: "TODO",
    level: 2,
    startLine: 0,
    endLine: 3,
    tasks: [],
  };

  const result = addTaskToSection(lines, section, "New task", 4);

  // The new task should be added after the existing task
  assertEquals(result[3], "- [ ] New task");
  assertEquals(result.length, 6); // Original 5 lines + 1 new task
});

Deno.test("moveCompletedTasksToDone", () => {
  const content = `# TODO

- [ ] Unchecked
- [x] Checked 1
- [x] [HIGH] Checked 2

## ICEBOX

- [x] Checked 3`;

  const result = moveCompletedTasksToDone(content);

  assertEquals(result.movedCount, 3);
  assertStringIncludes(result.content, "## COMPLETED");
  assertStringIncludes(result.content, "- Checked 1");
  assertStringIncludes(result.content, "- Checked 2");
  assertStringIncludes(result.content, "- Checked 3");
  // Priority should be removed
  assertEquals(result.content.includes("[HIGH]"), false);
});

Deno.test("clearDoneSection - clears DONE section", () => {
  const content = `# TODO

- [ ] Task

## DONE

- Completed 1
- Completed 2

## OTHER

- [ ] Other task`;

  const result = clearDoneSection(content);

  assertEquals(result.includes("## DONE"), false);
  assertEquals(result.includes("Completed 1"), false);
  assertEquals(result.includes("Completed 2"), false);
  assertStringIncludes(result, "## OTHER");
});

Deno.test("clearDoneSection - prefers COMPLETED over DONE", () => {
  const content = `# TODO

- [ ] Task

## DONE

- Done task

## COMPLETED

- Completed 1
- Completed 2

## OTHER

- [ ] Other task`;

  const result = clearDoneSection(content);

  assertEquals(result.includes("## COMPLETED"), false);
  assertEquals(result.includes("Completed 1"), false);
  assertEquals(result.includes("Completed 2"), false);
  assertStringIncludes(result, "## DONE");
  assertStringIncludes(result, "## OTHER");
});

Deno.test("findCompletedSection - prefers COMPLETED over DONE", () => {
  const content = `# TODO

## TODO
- [ ] Task 1

## DONE
- Done task 1

## COMPLETED
- Completed task 1`;

  const { sections } = parseMarkdown(content);
  const completedSection = findCompletedSection(sections);

  assertEquals(completedSection?.name, "COMPLETED");
});

Deno.test("findCompletedSection - falls back to DONE", () => {
  const content = `# TODO

## TODO
- [ ] Task 1

## DONE
- Done task 1`;

  const { sections } = parseMarkdown(content);
  const completedSection = findCompletedSection(sections);

  assertEquals(completedSection?.name, "DONE");
});

Deno.test("findCompletedSection - returns null when neither exists", () => {
  const content = `# TODO

## TODO
- [ ] Task 1

## OTHER
- Other task`;

  const { sections } = parseMarkdown(content);
  const completedSection = findCompletedSection(sections);

  assertEquals(completedSection, null);
});

Deno.test("moveCompletedTasksToDone - creates COMPLETED section", () => {
  const content = `# TODO

## TODO
- [x] Completed task
- [ ] Pending task`;

  const result = moveCompletedTasksToDone(content);

  assertEquals(result.movedCount, 1);
  assertStringIncludes(result.content, "## COMPLETED");
  assertStringIncludes(result.content, "- Completed task");
  assertEquals(result.content.includes("## DONE"), false);
});

Deno.test("moveCompletedTasksToDone - uses existing COMPLETED section", () => {
  const content = `# TODO

## TODO
- [x] New completed task
- [ ] Pending task

## COMPLETED
- Old completed task`;

  const result = moveCompletedTasksToDone(content);

  assertEquals(result.movedCount, 1);
  assertStringIncludes(result.content, "## COMPLETED");
  assertStringIncludes(result.content, "- New completed task");
  assertStringIncludes(result.content, "- Old completed task");
});

function assertStringIncludes(actual: string, expected: string) {
  if (!actual.includes(expected)) {
    throw new Error(
      `Expected string to include "${expected}", but got: ${actual}`,
    );
  }
}
