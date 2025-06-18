import { ParsedMarkdown, parseMarkdown } from "./markdown-parser.ts";
import { IndentValidator } from "./validators/indent-validator.ts";
import { ParentChildValidator } from "./validators/parent-child-validator.ts";
import { FormatValidator } from "./validators/format-validator.ts";
import { SectionValidator } from "./validators/section-validator.ts";
import {
  ValidationError,
  ValidationInfo,
  ValidationResult,
  ValidationWarning,
  ValidatorOptions,
} from "../types/validation.ts";

export class ValidationEngine {
  private indentValidator = new IndentValidator();
  private parentChildValidator = new ParentChildValidator();
  private formatValidator = new FormatValidator();
  private sectionValidator = new SectionValidator();

  async validateFile(
    filePath: string,
    options: ValidatorOptions = {},
  ): Promise<ValidationResult> {
    try {
      const content = await Deno.readTextFile(filePath);
      return this.validateContent(content, options);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      return {
        valid: false,
        errors: [
          {
            type: "FORMAT_ERROR",
            message: `Failed to read file: ${errorMessage}`,
            line: 0,
            severity: "error",
            details: { filePath, error: errorMessage },
          },
        ],
        warnings: [],
        info: [],
        summary: {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          maxDepth: 0,
          sectionsCount: 0,
        },
      };
    }
  }

  validateContent(
    content: string,
    options: ValidatorOptions = {},
  ): ValidationResult {
    const parsed = parseMarkdown(content);
    return this.validateParsedMarkdown(parsed, options);
  }

  validateParsedMarkdown(
    parsed: ParsedMarkdown,
    options: ValidatorOptions = {},
  ): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];
    const allInfo: ValidationInfo[] = [];

    // Collect all tasks from all sections
    const allTasks = parsed.sections.flatMap((section) => section.tasks);

    // Run indent validation
    const indentResult = this.indentValidator.validate(allTasks, options);
    allErrors.push(...indentResult.errors);
    allWarnings.push(...indentResult.warnings);

    // Run parent-child validation
    const parentChildResult = this.parentChildValidator.validate(
      allTasks,
      options,
    );
    allWarnings.push(...parentChildResult.warnings);

    // Run format validation
    const formatResult = this.formatValidator.validate(
      allTasks,
      parsed.lines,
      options,
    );
    allErrors.push(...formatResult.errors);
    allWarnings.push(...formatResult.warnings);

    // Run section validation
    const sectionResult = this.sectionValidator.validate(
      parsed.sections,
      parsed.lines,
      options,
    );
    allErrors.push(...sectionResult.errors);
    allWarnings.push(...sectionResult.warnings);

    // Generate summary statistics
    const taskStats = this.parentChildValidator.getTaskStatistics(allTasks);
    const sectionStats = this.sectionValidator.getSectionStatistics(
      parsed.sections,
    );

    const summary = {
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      pendingTasks: taskStats.pendingTasks,
      maxDepth: taskStats.maxDepth,
      sectionsCount: sectionStats.sectionsCount,
    };

    // Add informational messages
    if (allErrors.length === 0 && allWarnings.length === 0) {
      allInfo.push({
        type: "STRUCTURE_INFO",
        message: "Well-structured checklist with proper hierarchy",
        severity: "info",
        details: summary,
      });
    }

    if (summary.totalTasks > 0) {
      const completionRate = Math.round(
        (summary.completedTasks / summary.totalTasks) * 100,
      );
      allInfo.push({
        type: "STRUCTURE_INFO",
        message:
          `Task completion: ${summary.completedTasks}/${summary.totalTasks} (${completionRate}%)`,
        severity: "info",
        details: { completionRate, ...summary },
      });
    }

    // Sort results by line number
    allErrors.sort((a, b) => a.line - b.line);
    allWarnings.sort((a, b) => a.line - b.line);

    const valid = allErrors.length === 0;

    return {
      valid,
      errors: allErrors,
      warnings: allWarnings,
      info: allInfo,
      summary,
    };
  }

  // Helper method to get validation statistics
  getValidationStatistics(result: ValidationResult): {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    issuesByType: Record<string, number>;
  } {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;
    const infoCount = result.info.length;
    const totalIssues = errorCount + warningCount;

    // Count issues by type
    const issuesByType: Record<string, number> = {};

    for (const error of result.errors) {
      issuesByType[error.type] = (issuesByType[error.type] || 0) + 1;
    }

    for (const warning of result.warnings) {
      issuesByType[warning.type] = (issuesByType[warning.type] || 0) + 1;
    }

    return {
      totalIssues,
      errorCount,
      warningCount,
      infoCount,
      issuesByType,
    };
  }
}
