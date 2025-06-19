import {
  DenoNativeEngine,
  GitGrepEngine,
  GrepEngine,
  RipgrepEngine,
} from "./search/mod.ts";

interface DiagnosticResult {
  name: string;
  available: boolean;
  version?: string;
  notes?: string;
}

async function getCommandVersion(
  cmd: string,
  args: string[],
): Promise<string | null> {
  try {
    const command = new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout, stderr, success } = await command.output();

    if (success) {
      const output = new TextDecoder().decode(stdout) ||
        new TextDecoder().decode(stderr);
      return output.trim().split("\n")[0]; // Get first line
    }
  } catch {
    // Command not found
  }
  return null;
}

async function checkGitRepository(): Promise<boolean> {
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--git-dir"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

async function getGitRoot(): Promise<string | null> {
  try {
    const command = new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout, success } = await command.output();
    if (success) {
      return new TextDecoder().decode(stdout).trim();
    }
  } catch {
    // Command failed
  }
  return null;
}

async function diagnoseRipgrep(): Promise<DiagnosticResult> {
  const engine = new RipgrepEngine();
  const available = await engine.isAvailable();

  let version: string | undefined;
  if (available) {
    const versionOutput = await getCommandVersion("rg", ["--version"]);
    if (versionOutput) {
      version = versionOutput;
    }
  }

  return {
    name: "ripgrep (rg)",
    available,
    version,
    notes: available
      ? "✅ Recommended for best performance"
      : "❌ Not installed. Install with: cargo install ripgrep",
  };
}

async function diagnoseGitGrep(): Promise<DiagnosticResult> {
  const engine = new GitGrepEngine();
  const available = await engine.isAvailable();
  const inGitRepo = await checkGitRepository();

  let version: string | undefined;
  let notes: string;

  if (await getCommandVersion("git", ["--version"])) {
    version = await getCommandVersion("git", ["--version"]) || undefined;
    if (!inGitRepo) {
      notes =
        "⚠️  Git is installed but current directory is not a git repository";
    } else {
      notes = "✅ Available in git repositories";
    }
  } else {
    notes = "❌ Git not installed";
  }

  return {
    name: "git grep",
    available,
    version,
    notes,
  };
}

async function diagnoseGrep(): Promise<DiagnosticResult> {
  const engine = new GrepEngine();
  const available = await engine.isAvailable();

  let version: string | undefined;
  if (available) {
    const versionOutput = await getCommandVersion("grep", ["--version"]);
    if (versionOutput) {
      version = versionOutput;
    }
  }

  return {
    name: "grep",
    available,
    version,
    notes: available ? "✅ Standard grep available" : "❌ Not available",
  };
}

async function diagnoseDenoNative(): Promise<DiagnosticResult> {
  const engine = new DenoNativeEngine();
  const available = await engine.isAvailable();

  return {
    name: "deno",
    available,
    version: `Deno ${Deno.version.deno}`,
    notes: "✅ Always available (fallback option)",
  };
}

async function diagnoseAstGrep(): Promise<DiagnosticResult> {
  const version = await getCommandVersion("ast-grep", ["--version"]);
  const available = version !== null;

  return {
    name: "ast-grep",
    available,
    version: version || undefined,
    notes: available
      ? "✅ Available for TypeScript test detection"
      : "❌ Not installed. Install from: https://ast-grep.github.io/guide/quick-start.html",
  };
}

export async function runDiagnostics(): Promise<void> {
  console.log("pcheck doctor\n");

  const searchEngines = await Promise.all([
    diagnoseRipgrep(),
    diagnoseGitGrep(),
    diagnoseGrep(),
    diagnoseDenoNative(),
  ]);

  const astGrepResult = await diagnoseAstGrep();

  // Simple status display
  console.log("Tools:");
  for (const result of searchEngines) {
    const status = result.available ? "✅" : "❌";
    console.log(`  ${status} ${result.name}`);
  }

  console.log("\nOptional (for test cases):");
  console.log(
    `  ${astGrepResult.available ? "✅" : "❌"} ${astGrepResult.name}`,
  );

  // Git repository status
  await checkGitRepository();
  const gitRoot = await getGitRoot();

  console.log("\nGit:");
  if (gitRoot) {
    console.log(`  ✅ root: ${gitRoot}`);
  } else {
    console.log("  ❌ not initialized");
  }

  // Configuration file validation
  console.log("\nConfiguration:");
  const { validateConfigFile } = await import("./config-validator.ts");
  const { loadConfig, DEFAULT_CONFIG } = await import("./config.ts");
  const configPath = "./pcheck.config.json";
  
  let config = DEFAULT_CONFIG;
  let hasConfigFile = false;
  
  try {
    const stat = await Deno.stat(configPath);
    if (stat.isFile) {
      hasConfigFile = true;
      const result = await validateConfigFile(configPath);
      if (result.valid) {
        console.log(`  ✅ pcheck.config.json (valid)`);
        config = await loadConfig(configPath);
      } else {
        console.log(`  ❌ pcheck.config.json (invalid)`);
        for (const error of result.errors || []) {
          console.log(`     - ${error.path ? error.path + ": " : ""}${error.message}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log(`  ℹ️  No pcheck.config.json found (using defaults)`);
    } else {
      console.log(`  ❌ Error checking config: ${error}`);
    }
  }
  
  // Display recognized file patterns
  console.log("\nRecognized patterns:");
  
  // Markdown files
  console.log("  Markdown files:");
  if (config.include && config.include.some(p => p.includes(".md") || p.includes("*.md"))) {
    console.log("    ✓ Pattern-based: " + config.include.filter(p => p.includes(".md")).join(", "));
  } else {
    console.log("    ✓ TODO.md, README.md (always scanned)");
  }
  
  // Code files
  if (config.code?.enabled) {
    console.log("  Code files:");
    console.log(`    ✓ Extensions: ${config.code.fileExtensions?.map(ext => `.${ext}`).join(", ") || "default set"}`);
    console.log(`    ✓ Patterns: ${config.code.patterns?.join(", ") || "TODO, FIXME, HACK, NOTE"}`);
    if (config.code.includeTests) {
      console.log("    ✓ Test files included");
    } else {
      console.log("    ✗ Test files excluded (*.test.*, *.spec.*)");
    }
  } else {
    console.log("  Code files:");
    console.log("    ✗ Disabled (use --code or enable in config)");
  }
  
  // Excluded patterns
  console.log("  Excluded:");
  const excludePatterns = config.exclude || [];
  if (excludePatterns.length > 0) {
    for (const pattern of excludePatterns.slice(0, 5)) {
      console.log(`    - ${pattern}`);
    }
    if (excludePatterns.length > 5) {
      console.log(`    ... and ${excludePatterns.length - 5} more`);
    }
  } else {
    console.log("    - (none)");
  }
}
