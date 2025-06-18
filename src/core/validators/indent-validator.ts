import { ParsedTask } from "../markdown-parser.ts";
import {
  ValidationError,
  ValidationWarning,
  ValidatorOptions,
} from "../../types/validation.ts";

export interface IndentValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class IndentValidator {
  private readonly defaultIndentSize = 2;

  validate(
    tasks: ParsedTask[],
    options: ValidatorOptions = {}
  ): IndentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const indentSize = options.indentSize || this.defaultIndentSize;

    // Track expected indent levels
    const indentLevels = new Set<number>();

    for (const task of tasks) {
      // Check if indent is a multiple of expected indent size
      if (task.indent % indentSize !== 0) {
        warnings.push({
          type: "INDENT_WARNING",
          message: `Inconsistent indentation detected (expected multiple of ${indentSize} spaces, found ${task.indent})`,
          line: task.lineNumber,
          severity: "warning",
          details: {
            expectedIndentSize: indentSize,
            actualIndent: task.indent,
          },
        });
      }

      indentLevels.add(task.indent);
    }

    // Check for indent level jumps
    const sortedLevels = Array.from(indentLevels).sort((a, b) => a - b);

    for (let i = 1; i < sortedLevels.length; i++) {
      const prevLevel = sortedLevels[i - 1];
      const currentLevel = sortedLevels[i];
      const jump = currentLevel - prevLevel;

      // If jump is more than expected indent size, it might be an error
      if (jump > indentSize) {
        // Find a task with this problematic indent level
        const problematicTask = tasks.find((t) => t.indent === currentLevel);
        if (problematicTask) {
          warnings.push({
            type: "INDENT_WARNING",
            message: `Large indent jump detected (from ${prevLevel} to ${currentLevel} spaces)`,
            line: problematicTask.lineNumber,
            severity: "warning",
            details: {
              previousLevel: prevLevel,
              currentLevel: currentLevel,
              jump: jump,
              expectedMaxJump: indentSize,
            },
          });
        }
      }
    }

    // Check for orphaned indents (tasks with no parent at expected level)
    this.validateIndentHierarchy(tasks, errors, warnings, indentSize);

    return { errors, warnings };
  }

  private validateIndentHierarchy(
    tasks: ParsedTask[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    indentSize: number
  ): void {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      if (task.indent > 0) {
        const expectedParentIndent = task.indent - indentSize;

        // Look for a parent task at the expected indent level
        let hasParent = false;

        // Search backwards for a potential parent
        for (let j = i - 1; j >= 0; j--) {
          const potentialParent = tasks[j];

          if (potentialParent.indent === expectedParentIndent) {
            hasParent = true;
            break;
          }

          // If we find a task with less indent than expected parent, stop searching
          if (potentialParent.indent < expectedParentIndent) {
            break;
          }
        }

        if (!hasParent) {
          warnings.push({
            type: "INDENT_WARNING",
            message: `Task appears to be orphaned (no parent found at indent level ${expectedParentIndent})`,
            line: task.lineNumber,
            severity: "warning",
            details: {
              taskIndent: task.indent,
              expectedParentIndent: expectedParentIndent,
              taskContent: task.content,
            },
          });
        }
      }
    }
  }
}
