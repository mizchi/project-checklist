import { ParsedSection } from "../markdown-parser.ts";
import {
  ValidationError,
  ValidationWarning,
  ValidatorOptions,
} from "../../types/validation.ts";

export interface SectionValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class SectionValidator {
  validate(
    sections: ParsedSection[],
    lines: string[],
    _options: ValidatorOptions = {},
  ): SectionValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate section hierarchy
    this.validateSectionHierarchy(sections, errors, warnings);

    // Validate section content
    this.validateSectionContent(sections, lines, errors, warnings);

    // Validate section naming
    this.validateSectionNaming(sections, warnings);

    return { errors, warnings };
  }

  private validateSectionHierarchy(
    sections: ParsedSection[],
    _errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      // Check for valid header levels (should start from 1 and not skip levels)
      if (i === 0 && section.level > 1) {
        warnings.push({
          type: "INDENT_WARNING", // Using existing type
          message:
            `First section starts at level ${section.level}, consider starting from level 1`,
          line: section.startLine,
          severity: "warning",
          details: {
            sectionName: section.name,
            currentLevel: section.level,
            recommendedLevel: 1,
          },
        });
      }

      // Check for level jumps (skipping levels)
      if (i > 0) {
        const prevSection = sections[i - 1];
        const levelJump = section.level - prevSection.level;

        if (levelJump > 1) {
          warnings.push({
            type: "INDENT_WARNING",
            message:
              `Section level jumps from ${prevSection.level} to ${section.level}, consider gradual progression`,
            line: section.startLine,
            severity: "warning",
            details: {
              sectionName: section.name,
              previousSection: prevSection.name,
              previousLevel: prevSection.level,
              currentLevel: section.level,
              levelJump: levelJump,
            },
          });
        }
      }

      // Check for very deep nesting (more than 6 levels is unusual)
      if (section.level > 6) {
        warnings.push({
          type: "INDENT_WARNING",
          message:
            `Section is deeply nested (level ${section.level}), consider restructuring`,
          line: section.startLine,
          severity: "warning",
          details: {
            sectionName: section.name,
            currentLevel: section.level,
            maxRecommendedLevel: 6,
          },
        });
      }
    }
  }

  private validateSectionContent(
    sections: ParsedSection[],
    lines: string[],
    _errors: ValidationError[],
    warnings: ValidationWarning[],
  ): void {
    for (const section of sections) {
      // Check for empty sections
      if (section.tasks.length === 0) {
        // Check if section has any content at all
        let hasContent = false;
        for (let i = section.startLine + 1; i <= section.endLine; i++) {
          if (lines[i] && lines[i].trim().length > 0) {
            hasContent = true;
            break;
          }
        }

        if (!hasContent) {
          warnings.push({
            type: "INDENT_WARNING",
            message: `Section "${section.name}" is empty`,
            line: section.startLine,
            severity: "warning",
            details: {
              sectionName: section.name,
              sectionLevel: section.level,
              startLine: section.startLine,
              endLine: section.endLine,
            },
          });
        }
      }

      // Check for sections with only completed tasks
      if (section.tasks.length > 0) {
        const allCompleted = section.tasks.every((task) => task.checked);
        // const noneCompleted = section.tasks.every((task) => !task.checked);

        if (allCompleted && section.name.toUpperCase() !== "COMPLETED") {
          warnings.push({
            type: "PARENT_CHILD_INCONSISTENCY",
            message:
              `Section "${section.name}" has all tasks completed, consider moving to COMPLETED section`,
            line: section.startLine,
            severity: "warning",
            details: {
              sectionName: section.name,
              totalTasks: section.tasks.length,
              completedTasks: section.tasks.length,
            },
          });
        }
      }
    }
  }

  private validateSectionNaming(
    sections: ParsedSection[],
    warnings: ValidationWarning[],
  ): void {
    const sectionNames = new Set<string>();
    const commonSectionNames = [
      "TODO",
      "COMPLETED",
      "IN PROGRESS",
      "ICEBOX",
      "BUGS",
      "FEATURES",
    ];

    for (const section of sections) {
      // Check for duplicate section names
      const upperName = section.name.toUpperCase();
      if (sectionNames.has(upperName)) {
        warnings.push({
          type: "INDENT_WARNING",
          message: `Duplicate section name: "${section.name}"`,
          line: section.startLine,
          severity: "warning",
          details: {
            sectionName: section.name,
            duplicateName: upperName,
          },
        });
      }
      sectionNames.add(upperName);

      // Check for empty section names
      if (!section.name || section.name.trim().length === 0) {
        warnings.push({
          type: "INDENT_WARNING",
          message: `Section has empty name`,
          line: section.startLine,
          severity: "warning",
          details: {
            sectionLevel: section.level,
          },
        });
      }

      // Check for very long section names
      if (section.name && section.name.length > 100) {
        warnings.push({
          type: "INDENT_WARNING",
          message:
            `Section name is very long (${section.name.length} characters)`,
          line: section.startLine,
          severity: "warning",
          details: {
            sectionName: section.name,
            nameLength: section.name.length,
            maxRecommendedLength: 100,
          },
        });
      }

      // Suggest common section naming conventions
      if (section.level === 2 && !commonSectionNames.includes(upperName)) {
        // This is just informational, not a warning
        // Could be made configurable in the future
      }
    }
  }

  // Helper method to get section statistics
  getSectionStatistics(sections: ParsedSection[]): {
    sectionsCount: number;
    maxLevel: number;
    emptySections: number;
    sectionsWithTasks: number;
  } {
    const sectionsCount = sections.length;
    const maxLevel = sections.length > 0
      ? Math.max(...sections.map((s) => s.level))
      : 0;
    const emptySections = sections.filter((s) => s.tasks.length === 0).length;
    const sectionsWithTasks = sections.filter((s) => s.tasks.length > 0).length;

    return {
      sectionsCount,
      maxLevel,
      emptySections,
      sectionsWithTasks,
    };
  }
}
