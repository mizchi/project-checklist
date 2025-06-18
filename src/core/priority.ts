// Pure priority validation and formatting functions
// No I/O operations

export const VALID_PRIORITIES = ["HIGH", "MID", "LOW"];
export const NUMERIC_PRIORITY_REGEX = /^\d+$/;

export interface PriorityValidation {
  valid: boolean;
  normalized: string;
  warning?: string;
}

export function validatePriority(priority: string): PriorityValidation {
  const upper = priority.toUpperCase();
  
  // Check for valid string priorities
  if (VALID_PRIORITIES.includes(upper)) {
    return { valid: true, normalized: upper };
  }
  
  // Check for numeric priority
  if (NUMERIC_PRIORITY_REGEX.test(priority)) {
    const num = parseInt(priority);
    if (num >= 0 && num <= 999) {
      return { valid: true, normalized: priority };
    }
    return { 
      valid: false, 
      normalized: priority,
      warning: "Numeric priority should be between 0-999"
    };
  }
  
  // Check for mixed format (e.g., "5high", "high5")
  const hasNumber = /\d/.test(priority);
  const hasText = /[a-zA-Z]/.test(priority);
  if (hasNumber && hasText) {
    return { 
      valid: false, 
      normalized: priority,
      warning: `Invalid priority format: "${priority}". Use either HIGH/MID/LOW or a number (0-999).`
    };
  }
  
  return { 
    valid: false, 
    normalized: priority,
    warning: `Invalid priority: "${priority}". Use HIGH/MID/LOW or a number (0-999).`
  };
}

export function formatTaskWithPriority(message: string, priority?: string): string {
  if (!priority) {
    return message;
  }
  
  const validation = validatePriority(priority);
  if (!validation.valid) {
    throw new Error(validation.warning || "Invalid priority");
  }
  
  return `[${validation.normalized}] ${message}`;
}