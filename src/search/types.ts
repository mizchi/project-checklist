// Search engine interface definitions

export interface SearchResult {
  path: string;
  line: number;
  content: string;
  type: string;
}

export interface SearchEngine {
  name: string;
  isAvailable(): Promise<boolean>;
  search(directory: string, patterns: RegExp[]): Promise<SearchResult[]>;
}

export interface TodoSearchResult {
  type: "code";
  path: string;
  line: number;
  content: string;
  commentType?: "TODO" | "FIXME" | "HACK" | "NOTE" | "XXX" | "WARNING";
}

export interface SearchOptions {
  filterType?: string;
  filterDir?: string;
  excludeDir?: string;
}