// Validation types for pcheck validate command

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  summary: ValidationSummary;
}

export interface ValidationSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  maxDepth: number;
  sectionsCount: number;
}

export interface ValidationError {
  type: "INDENT_ERROR" | "FORMAT_ERROR" | "SECTION_ERROR";
  message: string;
  line: number;
  severity: "error";
  details?: Record<string, any>;
}

export interface ValidationWarning {
  type: "PARENT_CHILD_INCONSISTENCY" | "INDENT_WARNING";
  message: string;
  line: number;
  severity: "warning";
  parentTask?: string;
  childTask?: string;
  details?: Record<string, any>;
}

export interface ValidationInfo {
  type: "STRUCTURE_INFO";
  message: string;
  line?: number;
  severity: "info";
  details?: Record<string, any>;
}

export interface ValidatorOptions {
  strict?: boolean;
  indentSize?: number;
}

export interface Validator {
  validate(content: string, options?: ValidatorOptions): ValidationResult;
}
