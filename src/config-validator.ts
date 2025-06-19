import { PcheckConfig } from "./config.ts";

// Manual validation without external dependencies
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface ConfigValidationResult {
  valid: boolean;
  errors?: {
    path: string;
    message: string;
  }[];
}

export function validateConfig(config: unknown): ConfigValidationResult {
  const errors: { path: string; message: string }[] = [];
  
  if (!isObject(config)) {
    return { 
      valid: false, 
      errors: [{ path: "", message: "Config must be an object" }] 
    };
  }
  
  // Check for unknown properties
  const knownProps = new Set([
    "$schema", "include", "exclude", "code", "display", "output", 
    "languages", "search", "markdown", "ignore", "todoPatterns", 
    "searchEngine", "indentSize"
  ]);
  
  for (const key of Object.keys(config)) {
    if (!knownProps.has(key)) {
      errors.push({ path: key, message: `Unknown property: ${key}` });
    }
  }
  
  // Validate include/exclude arrays
  if ("include" in config && config.include !== undefined) {
    if (!isArray(config.include)) {
      errors.push({ path: "include", message: "Must be an array" });
    } else if (!config.include.every(isString)) {
      errors.push({ path: "include", message: "All items must be strings" });
    }
  }
  
  if ("exclude" in config && config.exclude !== undefined) {
    if (!isArray(config.exclude)) {
      errors.push({ path: "exclude", message: "Must be an array" });
    } else if (!config.exclude.every(isString)) {
      errors.push({ path: "exclude", message: "All items must be strings" });
    }
  }
  
  // Validate code object
  if ("code" in config && config.code !== undefined) {
    if (!isObject(config.code)) {
      errors.push({ path: "code", message: "Must be an object" });
    } else {
      const code = config.code;
      if ("enabled" in code && code.enabled !== undefined && !isBoolean(code.enabled)) {
        errors.push({ path: "code.enabled", message: "Must be a boolean" });
      }
      if ("patterns" in code && code.patterns !== undefined) {
        if (!isArray(code.patterns)) {
          errors.push({ path: "code.patterns", message: "Must be an array" });
        } else if (!code.patterns.every(isString)) {
          errors.push({ path: "code.patterns", message: "All items must be strings" });
        }
      }
      if ("includeTests" in code && code.includeTests !== undefined && !isBoolean(code.includeTests)) {
        errors.push({ path: "code.includeTests", message: "Must be a boolean" });
      }
      if ("fileExtensions" in code && code.fileExtensions !== undefined) {
        if (!isArray(code.fileExtensions)) {
          errors.push({ path: "code.fileExtensions", message: "Must be an array" });
        } else if (!code.fileExtensions.every(isString)) {
          errors.push({ path: "code.fileExtensions", message: "All items must be strings" });
        }
      }
    }
  }
  
  // Validate output object
  if ("output" in config && config.output !== undefined) {
    if (!isObject(config.output)) {
      errors.push({ path: "output", message: "Must be an object" });
    } else {
      const output = config.output;
      if ("format" in output && output.format !== undefined) {
        if (!["tree", "flat", "json"].includes(output.format as string)) {
          errors.push({ path: "output.format", message: "Must be 'tree', 'flat', or 'json'" });
        }
      }
      if ("colors" in output && output.colors !== undefined && !isBoolean(output.colors)) {
        errors.push({ path: "output.colors", message: "Must be a boolean" });
      }
      if ("quiet" in output && output.quiet !== undefined && !isBoolean(output.quiet)) {
        errors.push({ path: "output.quiet", message: "Must be a boolean" });
      }
    }
  }
  
  // Validate search object
  if ("search" in config && config.search !== undefined) {
    if (!isObject(config.search)) {
      errors.push({ path: "search", message: "Must be an object" });
    } else {
      const search = config.search;
      if ("engine" in search && search.engine !== undefined) {
        if (!["auto", "rg", "git-grep", "grep", "native"].includes(search.engine as string)) {
          errors.push({ path: "search.engine", message: "Must be 'auto', 'rg', 'git-grep', 'grep', or 'native'" });
        }
      }
    }
  }
  
  // Validate indentSize
  if ("indentSize" in config && config.indentSize !== undefined) {
    if (!isNumber(config.indentSize)) {
      errors.push({ path: "indentSize", message: "Must be a number" });
    } else if (config.indentSize < 1 || config.indentSize > 8) {
      errors.push({ path: "indentSize", message: "Must be between 1 and 8" });
    }
  }
  
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}

export async function validateConfigFile(filePath: string): Promise<ConfigValidationResult> {
  try {
    const content = await Deno.readTextFile(filePath);
    const config = JSON.parse(content);
    return validateConfig(config);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return { 
        valid: false, 
        errors: [{ path: "", message: `Config file not found: ${filePath}` }] 
      };
    }
    if (error instanceof SyntaxError) {
      return { 
        valid: false, 
        errors: [{ path: "", message: `Invalid JSON: ${error.message}` }] 
      };
    }
    return { 
      valid: false, 
      errors: [{ path: "", message: `Error reading config file: ${error}` }] 
    };
  }
}