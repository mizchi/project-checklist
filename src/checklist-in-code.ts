// Checklist detection in code comments

export interface CodeChecklist {
  path: string;
  line: number;
  content: string;
  checked: boolean;
  context: string; // The full line content for context
  language?: string; // File language/extension
}

export interface ChecklistSearchOptions {
  includeChecked?: boolean; // Include completed items [x]
  includeUnchecked?: boolean; // Include incomplete items [ ]
  filePatterns?: string[]; // File patterns to search
}

export class ChecklistInCodeSearcher {
  async searchWithRipgrep(
    directory: string,
    options: ChecklistSearchOptions = {},
  ): Promise<CodeChecklist[]> {
    const {
      includeChecked = true,
      includeUnchecked = true,
      filePatterns = [
        "*.ts",
        "*.tsx",
        "*.js",
        "*.jsx",
        "*.py",
        "*.go",
        "*.rs",
        "*.java",
        "*.c",
        "*.cpp",
        "*.h",
        "*.hpp",
      ],
    } = options;

    const checklists: CodeChecklist[] = [];

    // Build regex pattern based on options
    const patterns: string[] = [];
    if (includeUnchecked) patterns.push("- \\[ \\]");
    if (includeChecked) patterns.push("- \\[x\\]");

    if (patterns.length === 0) return checklists;

    // Build ripgrep arguments
    const args = [
      "--line-number",
      "--no-heading",
      "--color=never",
      "--with-filename",
    ];

    // Add file type patterns
    for (const pattern of filePatterns) {
      args.push("--glob", pattern);
    }

    // Add search pattern
    args.push("-e", patterns.join("|"));
    args.push(directory);

    try {
      const command = new Deno.Command("rg", {
        args,
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout, success } = await command.output();
      if (!success) {
        return checklists;
      }

      const output = new TextDecoder().decode(stdout);
      const lines = output.trim().split("\n");

      for (const line of lines) {
        if (!line) continue;

        // Parse ripgrep output: filename:linenum:content
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (!match) continue;

        const [, filePath, lineNumStr, lineContent] = match;
        const lineNum = parseInt(lineNumStr, 10);

        // Extract checklist items from the line
        const checklistMatches = lineContent.matchAll(
          /- \[([ x])\]\s*(.+?)(?=(?:- \[|$))/g,
        );

        for (const checklistMatch of checklistMatches) {
          const checked = checklistMatch[1] === "x";
          const content = checklistMatch[2].trim();

          // Determine language from file extension
          const ext = filePath.split(".").pop() || "";

          checklists.push({
            path: filePath,
            line: lineNum,
            content,
            checked,
            context: lineContent.trim(),
            language: ext,
          });
        }
      }
    } catch (error) {
      console.error("Error running ripgrep:", error);
      throw error;
    }

    return checklists;
  }

  async searchWithNative(
    directory: string,
    options: ChecklistSearchOptions = {},
  ): Promise<CodeChecklist[]> {
    const {
      includeChecked = true,
      includeUnchecked = true,
      filePatterns = [
        "*.ts",
        "*.tsx",
        "*.js",
        "*.jsx",
        "*.py",
        "*.go",
        "*.rs",
        "*.java",
        "*.c",
        "*.cpp",
        "*.h",
        "*.hpp",
      ],
    } = options;

    const checklists: CodeChecklist[] = [];

    // Convert glob patterns to regex
    const fileRegexes = filePatterns.map((pattern) =>
      new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$")
    );

    const { walk } = await import("@std/fs/walk");

    for await (const entry of walk(directory, { includeDirs: false })) {
      const fileName = entry.name;

      // Check if file matches any pattern
      if (!fileRegexes.some((regex) => regex.test(fileName))) {
        continue;
      }

      try {
        const content = await Deno.readTextFile(entry.path);
        const lines = content.split("\n");
        const ext = fileName.split(".").pop() || "";

        lines.forEach((line, index) => {
          // Search for checklist patterns
          const checklistMatches = line.matchAll(
            /- \[([ x])\]\s*(.+?)(?=(?:- \[|$))/g,
          );

          for (const match of checklistMatches) {
            const checked = match[1] === "x";
            const itemContent = match[2].trim();

            if ((checked && includeChecked) || (!checked && includeUnchecked)) {
              checklists.push({
                path: entry.path,
                line: index + 1,
                content: itemContent,
                checked,
                context: line.trim(),
                language: ext,
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error reading file ${entry.path}:`, error);
      }
    }

    return checklists;
  }

  // Auto-detect and use the best available method
  async search(
    directory: string,
    options: ChecklistSearchOptions = {},
  ): Promise<CodeChecklist[]> {
    // Check if ripgrep is available
    try {
      const command = new Deno.Command("rg", {
        args: ["--version"],
        stdout: "null",
        stderr: "null",
      });
      const { success } = await command.output();

      if (success) {
        return await this.searchWithRipgrep(directory, options);
      }
    } catch {
      // ripgrep not available
    }

    // Fallback to native implementation
    return await this.searchWithNative(directory, options);
  }
}

// Helper function to group checklists by file
export function groupChecklistsByFile(
  checklists: CodeChecklist[],
): Map<string, CodeChecklist[]> {
  const grouped = new Map<string, CodeChecklist[]>();

  for (const checklist of checklists) {
    if (!grouped.has(checklist.path)) {
      grouped.set(checklist.path, []);
    }
    grouped.get(checklist.path)!.push(checklist);
  }

  // Sort by line number within each file
  for (const [, items] of grouped) {
    items.sort((a, b) => a.line - b.line);
  }

  return grouped;
}

// Helper function to filter by language
export function filterByLanguage(
  checklists: CodeChecklist[],
  languages: string[],
): CodeChecklist[] {
  return checklists.filter((item) =>
    item.language && languages.includes(item.language)
  );
}

// Helper function to get summary statistics
export function getChecklistStats(checklists: CodeChecklist[]) {
  const total = checklists.length;
  const checked = checklists.filter((item) => item.checked).length;
  const unchecked = total - checked;
  const byLanguage = new Map<string, number>();

  for (const item of checklists) {
    if (item.language) {
      byLanguage.set(item.language, (byLanguage.get(item.language) || 0) + 1);
    }
  }

  return {
    total,
    checked,
    unchecked,
    completionRate: total > 0 ? (checked / total) * 100 : 0,
    byLanguage: Object.fromEntries(byLanguage),
  };
}
