// Shared types for pcheck

export interface TodoItem {
  type:
    | "TODO"
    | "FIXME"
    | "HACK"
    | "NOTE"
    | "XXX"
    | "WARNING"
    | "SKIP"
    | "TEST";
  text: string;
  filePath: string;
  line: number;
  column?: number;
  id: string;
  checked?: boolean;
  children?: TodoItem[];
}
