// Configuration for pcheck
export interface PcheckConfig {
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
  // Ignore patterns (gitignore style)
  ignore?: string[];
  // Additional TODO patterns
  todoPatterns?: string[];
  // Default search engine
  searchEngine?: "rg" | "git-grep" | "grep" | "native";
  // Default indent size for validation and formatting
  indentSize?: number;
}

export const DEFAULT_CONFIG: PcheckConfig = {
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

    // Merge with defaults
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      languages: {
        ...DEFAULT_CONFIG.languages,
        ...userConfig.languages,
        typescript: {
          ...DEFAULT_CONFIG.languages?.typescript,
          ...userConfig.languages?.typescript,
        },
      },
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // No config file, use defaults
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}
