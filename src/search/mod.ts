// Search module exports
export type { SearchEngine, SearchOptions } from "./interface.ts";
export { RipgrepEngine } from "./engines/ripgrep.ts";
export { GitGrepEngine } from "./engines/git-grep.ts";
export { GrepEngine } from "./engines/grep.ts";
export { DenoNativeEngine } from "./engines/deno.ts";

import type { SearchEngine } from "./interface.ts";
import { RipgrepEngine } from "./engines/ripgrep.ts";
import { GitGrepEngine } from "./engines/git-grep.ts";
import { GrepEngine } from "./engines/grep.ts";
import { DenoNativeEngine } from "./engines/deno.ts";

// Detect the best available search engine
export async function detectBestEngine(): Promise<SearchEngine> {
  const engines = [
    new RipgrepEngine(),
    new GitGrepEngine(),
    new GrepEngine(),
    new DenoNativeEngine(),
  ];

  for (const engine of engines) {
    if (await engine.isAvailable()) {
      return engine;
    }
  }

  // Fallback to native engine (always available)
  return new DenoNativeEngine();
}

// Get engine by name
export async function getEngineByName(
  name: string,
): Promise<SearchEngine | null> {
  const engines: Record<string, SearchEngine> = {
    "rg": new RipgrepEngine(),
    "ripgrep": new RipgrepEngine(),
    "git-grep": new GitGrepEngine(),
    "grep": new GrepEngine(),
    "native": new DenoNativeEngine(),
  };

  const engine = engines[name];
  if (!engine) return null;

  if (await engine.isAvailable()) {
    return engine;
  }

  return null;
}
