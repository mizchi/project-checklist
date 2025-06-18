// Search engine interface definition
import type { LegacyTodoItem } from "../mod.ts";

export interface SearchEngine {
  name: string;
  isAvailable(): Promise<boolean>;
  searchTodos(directory: string, patterns: RegExp[]): Promise<LegacyTodoItem[]>;
}

export interface SearchOptions {
  filterType?: string;
  filterDir?: string;
  excludeDir?: string;
}