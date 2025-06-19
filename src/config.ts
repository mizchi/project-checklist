// Configuration for pcheck
export interface PcheckConfig {
  // File patterns to include/exclude
  include?: string[];
  exclude?: string[];

  // Code scanning options
  code?: {
    enabled?: boolean;
    patterns?: string[];
    includeTests?: boolean;
    fileExtensions?: string[];
  };

  // Display options
  display?: {
    showLineNumbers?: boolean;
    showEmptyTodos?: boolean;
    groupByFile?: boolean;
    showSectionTitles?: boolean;
    maxDepth?: number;
  };

  // Output options
  output?: {
    format?: "tree" | "flat" | "json";
    colors?: boolean;
    quiet?: boolean;
  };

  // Language-specific features
  languages?: {
    typescript?: {
      // Detect test cases in TypeScript files
      detectTests?: boolean;
      // Test patterns to match (default: ["Deno.test", "it(", "test("])
      testPatterns?: string[];
      // Include skipped tests as todos
      includeSkipped?: boolean;
    };
  };

  // Search engine preferences
  search?: {
    engine?: "auto" | "rg" | "git-grep" | "grep" | "native";
    parallel?: boolean;
    ignoreCase?: boolean;
  };

  // Markdown specific settings
  markdown?: {
    extensions?: string[];
    checklistOnly?: boolean;
  };

  // Legacy options (for backward compatibility)
  ignore?: string[];
  todoPatterns?: string[];
  searchEngine?: "rg" | "git-grep" | "grep" | "native";
  indentSize?: number;
}

export const DEFAULT_CONFIG: PcheckConfig = {
  include: ["**/*.md", "README.md", "TODO.md"],
  exclude: [
    "node_modules/**",
    "vendor/**",
    "target/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "*.min.js",
    "*.bundle.js",
    ".git/**",
    ".next/**",
    ".nuxt/**",
    ".cache/**",
  ],
  code: {
    enabled: false,
    patterns: ["TODO", "FIXME", "HACK", "NOTE", "BUG", "OPTIMIZE", "REFACTOR"],
    includeTests: false,
    fileExtensions: [
      "js",
      "jsx",
      "ts",
      "tsx",
      "mjs",
      "cjs",
      "py",
      "pyw",
      "rs",
      "go",
      "java",
      "c",
      "cpp",
      "cc",
      "cxx",
      "h",
      "hpp",
      "cs",
      "rb",
      "php",
      "swift",
      "kt",
      "kts",
      "scala",
      "lua",
      "sh",
      "bash",
    ],
  },
  display: {
    showLineNumbers: true,
    showEmptyTodos: false,
    groupByFile: true,
    showSectionTitles: true,
    maxDepth: 10,
  },
  output: {
    format: "tree",
    colors: true,
    quiet: false,
  },
  search: {
    engine: "auto",
    parallel: true,
    ignoreCase: false,
  },
  markdown: {
    extensions: ["md", "mdx", "markdown"],
    checklistOnly: true,
  },
  languages: {
    typescript: {
      detectTests: false,
      testPatterns: ["Deno.test", "it(", "test(", "describe("],
      includeSkipped: true,
    },
  },
  indentSize: 2,
};

export async function loadConfig(path?: string): Promise<PcheckConfig> {
  const configPath = path || "./pcheck.config.json";

  try {
    const content = await Deno.readTextFile(configPath);
    const userConfig = JSON.parse(content);

    // Deep merge with defaults
    return mergeConfig(DEFAULT_CONFIG, userConfig);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // No config file, use defaults
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

// Deep merge configuration objects
export function mergeConfig(
  base: PcheckConfig,
  override: PcheckConfig,
): PcheckConfig {
  const result = { ...base };

  // Simple properties
  if (override.include !== undefined) result.include = override.include;
  if (override.exclude !== undefined) result.exclude = override.exclude;
  if (override.ignore !== undefined) result.ignore = override.ignore;
  if (override.todoPatterns !== undefined) {
    result.todoPatterns = override.todoPatterns;
  }
  if (override.searchEngine !== undefined) {
    result.searchEngine = override.searchEngine;
  }
  if (override.indentSize !== undefined) {
    result.indentSize = override.indentSize;
  }

  // Nested objects
  if (override.code !== undefined) {
    result.code = { ...base.code, ...override.code };
  }

  if (override.display !== undefined) {
    result.display = { ...base.display, ...override.display };
  }

  if (override.output !== undefined) {
    result.output = { ...base.output, ...override.output };
  }

  if (override.search !== undefined) {
    result.search = { ...base.search, ...override.search };
  }

  if (override.markdown !== undefined) {
    result.markdown = { ...base.markdown, ...override.markdown };
  }

  if (override.languages !== undefined) {
    result.languages = {
      ...base.languages,
      ...override.languages,
    };
    if (override.languages.typescript !== undefined) {
      result.languages.typescript = {
        ...base.languages?.typescript,
        ...override.languages.typescript,
      };
    }
  }

  return result;
}

// Apply CLI options to config
export function applyCliOptions(
  config: PcheckConfig,
  options: Record<string, unknown>,
): PcheckConfig {
  const result = { ...config };

  // Map CLI options to config
  // If --code is explicitly set, override config
  if (options.code === true) {
    result.code = { ...result.code, enabled: true };
  } else if (options.code === false) {
    result.code = { ...result.code, enabled: false };
  }
  // Otherwise, keep the config value

  if (options.cases === true && result.code) {
    result.code.includeTests = true;
  }
  if (options.engine && typeof options.engine === "string") {
    result.search = { ...result.search, engine: options.engine as any };
  }
  if (options.json === true) {
    result.output = { ...result.output, format: "json" };
  }
  if (options.quiet === true) {
    result.output = { ...result.output, quiet: true };
  }

  // Handle --exclude option
  if (options.exclude && typeof options.exclude === "string") {
    const excludePatterns = options.exclude.split(",").map((p) => p.trim());
    result.exclude = [...(result.exclude || []), ...excludePatterns];
  }

  return result;
}

// Validate config file
export function validateConfig(config: unknown): config is PcheckConfig {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const cfg = config as Record<string, unknown>;

  // Validate arrays
  if (cfg.include !== undefined && !Array.isArray(cfg.include)) {
    throw new Error("Config error: 'include' must be an array of strings");
  }
  if (cfg.exclude !== undefined && !Array.isArray(cfg.exclude)) {
    throw new Error("Config error: 'exclude' must be an array of strings");
  }

  // Validate nested objects
  if (
    cfg.code !== undefined &&
    (typeof cfg.code !== "object" || cfg.code === null)
  ) {
    throw new Error("Config error: 'code' must be an object");
  }

  if (cfg.output !== undefined) {
    const output = cfg.output as Record<string, unknown>;
    if (
      output.format !== undefined &&
      !["tree", "flat", "json"].includes(output.format as string)
    ) {
      throw new Error(
        "Config error: 'output.format' must be 'tree', 'flat', or 'json'",
      );
    }
  }

  return true;
}
