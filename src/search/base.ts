// Base search engine utilities
import type { LegacyTodoItem } from "../mod.ts";

// Check if a command exists
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const command = new Deno.Command(cmd, {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

// Parse line number and file from grep-like output
export function parseGrepLine(
  line: string,
): { file: string; lineNum: number; content: string } | null {
  // Format: filename:linenum:content
  const match = line.match(/^(.+?):(\d+):(.*)$/);
  if (!match) return null;

  return {
    file: match[1],
    lineNum: parseInt(match[2], 10),
    content: match[3],
  };
}

// Extract TODO content from a line
export function extractTodoContent(
  line: string,
): { type: string; content: string } | null {
  // First check for checklist patterns in comments
  const checklistPatterns = [
    /\/\/\s*-\s*\[([ x])\]\s*(.+)/i,
    /#\s*-\s*\[([ x])\]\s*(.+)/i,
    /\/\*\s*-\s*\[([ x])\]\s*(.+)/i,
    /\*\s*-\s*\[([ x])\]\s*(.+)/i, // For multi-line comments
  ];

  for (const pattern of checklistPatterns) {
    const match = line.match(pattern);
    if (match) {
      const checked = match[1] === 'x';
      const prefix = checked ? '[✓]' : '[ ]';
      return {
        type: "CHECKLIST",
        content: `${prefix} ${match[2].trim()}`,
      };
    }
  }

  // Then check for traditional TODO patterns
  const patterns = [
    /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i,
    /\/\/\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i,
    /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)/i,
    /#\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)/i,
    /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING):\s*(.+)\*\//i,
    /\/\*\s*(TODO|FIXME|HACK|NOTE|XXX|WARNING)\([^)]+\):\s*(.+)\*\//i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return {
        type: match[1].toUpperCase(),
        content: match[2].trim(),
      };
    }
  }

  return null;
}

// Common TODO item creation
export function createTodoItem(
  file: string,
  lineNum: number,
  type: string,
  content: string,
): LegacyTodoItem {
  return {
    type: "code",
    path: file,
    line: lineNum,
    content,
    commentType: type as LegacyTodoItem["commentType"],
  };
}
