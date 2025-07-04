// Deno native search engine implementation
import type { SearchEngine } from "../interface.ts";
import type { LegacyTodoItem } from "../../mod.ts";

export class DenoNativeEngine implements SearchEngine {
  name = "native";

  isAvailable(): Promise<boolean> {
    // Always available
    return Promise.resolve(true);
  }

  searchTodos(
    _directory: string,
    _patterns: RegExp[],
  ): Promise<LegacyTodoItem[]> {
    // This is a fallback engine, actual implementation is in mod.ts
    // For now, return empty as the native implementation is handled elsewhere
    return Promise.resolve([]);
  }
}
