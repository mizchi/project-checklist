import { ParsedTask } from "../markdown-parser.ts";
import {
  ValidationError,
  ValidationWarning,
  ValidatorOptions,
} from "../../types/validation.ts";

export interface FormatValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class FormatValidator {
  private readonly validCheckboxPatterns = [
    /^\s*-\s*\[\s*\]\s*.*$/, // - [ ] content
    /^\s*-\s*\[x\]\s*.*$/, // - [x] content
    /^\s*-\s*\[X\]\s*.*$/, // - [X] content
  ];

  private readonly validPriorityPatterns = [
    /\[HIGH\]/i,
    /\[MID\]/i,
    /\[LOW\]/i,
    /\[\d+\]/, // numeric priority
  ];

  validate(
    tasks: ParsedTask[],
    lines: string[],
    options: ValidatorOptions = {},
  ): FormatValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const task of tasks) {
      this.validateTaskFormat(task, lines[task.lineNumber], errors, warnings);
    }

    return { errors, warnings };
  }

  private validateTaskFormat(
    task: ParsedTask,
    originalLine: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Validate checkbox format
    this.validateCheckboxFormat(task, originalLine, errors);

    // Validate priority format if present
    this.validatePriorityFormat(task, originalLine, warnings);

    // Validate content
    this.validateContent(task, errors, warnings);

    // Validate spacing and indentation
    this.validateSpacing(task, originalLine, warnings);
  }

  private validateCheckboxFormat(
    task: ParsedTask,
    originalLine: string,
    errors: ValidationError[],
  ): void {
    const isValidFormat = this.validCheckboxPatterns.some((pattern) =>
      pattern.test(originalLine)
    );

    if (!isValidFormat) {
      errors.push({
        type: "FORMAT_ERROR",
        message: `Invalid checkbox format. Expected "- [ ]" or "- [x]" format`,
        line: task.lineNumber,
        severity: "error",
        details: {
          actualLine: originalLine.trim(),
          expectedFormats: ["- [ ] content", "- [x] content"],
        },
      });
    }
  }

  private validatePriorityFormat(
    task: ParsedTask,
    originalLine: string,
    warnings: ValidationWarning[],
  ): void {
    // Check if line contains priority-like patterns
    const priorityMatch = originalLine.match(/\[([^\]]+)\]/g);

    if (priorityMatch) {
      for (const match of priorityMatch) {
        // Skip the checkbox itself
        if (match === "[ ]" || match === "[x]" || match === "[X]") {
          continue;
        }

        // Check if it's a valid priority format
        const isValidPriority = this.validPriorityPatterns.some((pattern) =>
          pattern.test(match)
        );

        if (!isValidPriority) {
          warnings.push({
            type: "INDENT_WARNING", // Using existing type, could add FORMAT_WARNING
            message:
              `Potentially invalid priority format: ${match}. Expected [HIGH], [MID], [LOW], or [number]`,
            line: task.lineNumber,
            severity: "warning",
            details: {
              foundPriority: match,
              validFormats: ["[HIGH]", "[MID]", "[LOW]", "[1-999]"],
            },
          });
        }
      }
    }
  }

  private validateContent(
    task: ParsedTask,
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    // Check for empty content
    if (!task.content || task.content.trim().length === 0) {
      warnings.push({
        type: "INDENT_WARNING", // Using existing type
        message: `Task has empty content`,
        line: task.lineNumber,
        severity: "warning",
        details: {
          taskContent: task.content,
        },
      });
    }

    // Check for very long content (might indicate formatting issues)
    if (task.content && task.content.length > 200) {
      warnings.push({
        type: "INDENT_WARNING", // Using existing type
        message:
          `Task content is very long (${task.content.length} characters). Consider breaking it down`,
        line: task.lineNumber,
        severity: "warning",
        details: {
          contentLength: task.content.length,
          maxRecommendedLength: 200,
        },
      });
    }

    // Check for suspicious characters or patterns
    if (task.content && /[\t\r\n]/.test(task.content)) {
      errors.push({
        type: "FORMAT_ERROR",
        message:
          `Task content contains invalid characters (tabs, carriage returns, or newlines)`,
        line: task.lineNumber,
        severity: "error",
        details: {
          taskContent: task.content,
          invalidChars: task.content.match(/[\t\r\n]/g),
        },
      });
    }
  }

  private validateSpacing(
    task: ParsedTask,
    originalLine: string,
    warnings: ValidationWarning[],
  ): void {
    // Check for inconsistent spacing after checkbox
    const checkboxMatch = originalLine.match(/^(\s*)-\s*\[[x ]\](\s*)(.*)/i);

    if (checkboxMatch) {
      const spaceAfterCheckbox = checkboxMatch[2];

      // Recommend single space after checkbox
      if (spaceAfterCheckbox.length !== 1) {
        warnings.push({
          type: "INDENT_WARNING",
          message:
            `Inconsistent spacing after checkbox (found ${spaceAfterCheckbox.length} spaces, recommended 1)`,
          line: task.lineNumber,
          severity: "warning",
          details: {
            actualSpaces: spaceAfterCheckbox.length,
            recommendedSpaces: 1,
            actualSpacing: `"${spaceAfterCheckbox}"`,
          },
        });
      }
    }

    // Check for trailing whitespace
    if (originalLine.endsWith(" ") || originalLine.endsWith("\t")) {
      warnings.push({
        type: "INDENT_WARNING",
        message: `Line has trailing whitespace`,
        line: task.lineNumber,
        severity: "warning",
        details: {
          lineLength: originalLine.length,
          trimmedLength: originalLine.trimEnd().length,
        },
      });
    }
  }
}
