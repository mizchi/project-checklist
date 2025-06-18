import { ValidationResult } from "../types/validation.ts";
import { blue, bold, dim, green, red, yellow } from "@std/fmt/colors";

export interface OutputOptions {
  json?: boolean;
  pretty?: boolean;
  showDetails?: boolean;
}

export class OutputFormatter {
  formatValidationResult(
    result: ValidationResult,
    filePath: string,
    options: OutputOptions = {},
  ): string {
    if (options.json) {
      return this.formatAsJson(result, filePath, options.pretty);
    } else {
      return this.formatAsConsole(result, filePath, options);
    }
  }

  private formatAsJson(
    result: ValidationResult,
    filePath: string,
    pretty: boolean = false,
  ): string {
    const output = {
      file: filePath,
      valid: result.valid,
      summary: result.summary,
      errors: result.errors,
      warnings: result.warnings,
      info: result.info,
    };

    return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  }

  private formatAsConsole(
    result: ValidationResult,
    filePath: string,
    options: OutputOptions = {},
  ): string {
    const lines: string[] = [];

    // Header
    const statusIcon = result.valid ? "✅" : "❌";
    lines.push(bold(`${statusIcon} Validation Results for ${filePath}`));
    lines.push("");

    // Summary
    lines.push(bold("📊 Summary:"));
    lines.push(
      `  ${
        result.valid ? green("✅") : red("❌")
      } ${result.summary.totalTasks} tasks validated`,
    );

    if (result.warnings.length > 0) {
      lines.push(`  ${yellow("⚠️")}  ${result.warnings.length} warnings found`);
    }

    if (result.errors.length > 0) {
      lines.push(`  ${red("❌")} ${result.errors.length} errors found`);
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      lines.push(`  ${green("✅")} No issues found`);
    }

    lines.push("");

    // Errors
    if (result.errors.length > 0) {
      lines.push(bold(red("❌ Errors:")));
      for (const error of result.errors) {
        lines.push(`  Line ${error.line}: ${error.message}`);
        if (options.showDetails && error.details) {
          lines.push(dim(`    Details: ${JSON.stringify(error.details)}`));
        }
      }
      lines.push("");
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push(bold(yellow("⚠️  Warnings:")));
      for (const warning of result.warnings) {
        lines.push(`  Line ${warning.line}: ${warning.message}`);
        if (options.showDetails && warning.details) {
          lines.push(dim(`    Details: ${JSON.stringify(warning.details)}`));
        }
      }
      lines.push("");
    }

    // Structure Analysis
    if (result.summary.totalTasks > 0) {
      lines.push(bold(green("✅ Structure Analysis:")));
      lines.push(`  📁 ${result.summary.sectionsCount} sections found`);
      lines.push(`  📝 ${result.summary.totalTasks} total tasks`);
      lines.push(
        `  ${green("✅")} ${result.summary.completedTasks} completed tasks`,
      );
      lines.push(`  ${blue("☐")} ${result.summary.pendingTasks} pending tasks`);
      lines.push(`  🔢 Max nesting depth: ${result.summary.maxDepth} levels`);

      if (result.summary.totalTasks > 0) {
        const completionRate = Math.round(
          (result.summary.completedTasks / result.summary.totalTasks) * 100,
        );
        lines.push(`  📊 Completion rate: ${completionRate}%`);
      }
      lines.push("");
    }

    // Info messages
    if (result.info.length > 0) {
      lines.push(bold(blue("ℹ️  Information:")));
      for (const info of result.info) {
        lines.push(`  ${info.message}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  formatSummaryOnly(result: ValidationResult, filePath: string): string {
    const statusIcon = result.valid ? green("✅") : red("❌");
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;

    let summary = `${statusIcon} ${filePath}`;

    if (errorCount > 0) {
      summary += ` ${red(`${errorCount} errors`)}`;
    }

    if (warningCount > 0) {
      summary += ` ${yellow(`${warningCount} warnings`)}`;
    }

    if (errorCount === 0 && warningCount === 0) {
      summary += ` ${green("✓")}`;
    }

    return summary;
  }

  formatErrorsOnly(result: ValidationResult): string {
    const lines: string[] = [];

    for (const error of result.errors) {
      lines.push(red(`Error (Line ${error.line}): ${error.message}`));
    }

    for (const warning of result.warnings) {
      lines.push(yellow(`Warning (Line ${warning.line}): ${warning.message}`));
    }

    return lines.join("\n");
  }

  // Helper method to format validation statistics
  formatStatistics(results: ValidationResult[]): string {
    const lines: string[] = [];

    const totalFiles = results.length;
    const validFiles = results.filter((r) => r.valid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce(
      (sum, r) => sum + r.warnings.length,
      0,
    );
    const totalTasks = results.reduce(
      (sum, r) => sum + r.summary.totalTasks,
      0,
    );
    const totalCompleted = results.reduce(
      (sum, r) => sum + r.summary.completedTasks,
      0,
    );

    lines.push(bold("📊 Overall Statistics:"));
    lines.push(`  📁 Files validated: ${totalFiles}`);
    lines.push(`  ${green("✅")} Valid files: ${validFiles}`);
    lines.push(`  ${red("❌")} Files with errors: ${totalFiles - validFiles}`);
    lines.push(`  📝 Total tasks: ${totalTasks}`);
    lines.push(`  ${green("✅")} Completed tasks: ${totalCompleted}`);

    if (totalTasks > 0) {
      const overallCompletion = Math.round((totalCompleted / totalTasks) * 100);
      lines.push(`  📊 Overall completion: ${overallCompletion}%`);
    }

    lines.push(`  ${red("❌")} Total errors: ${totalErrors}`);
    lines.push(`  ${yellow("⚠️")} Total warnings: ${totalWarnings}`);

    return lines.join("\n");
  }
}
