import { bold, green } from "@std/fmt/colors";
// import { loadConfig } from "./config.ts";

// Valid priority values
const VALID_PRIORITIES = ["HIGH", "MID", "LOW"];
const BUG_PRIORITIES = ["P0", "P1", "P2", "P3"];
const NUMERIC_PRIORITY_REGEX = /^\d+$/;

function validatePriority(priority: string): {
  valid: boolean;
  normalized: string;
  warning?: string;
} {
  const upper = priority.toUpperCase();

  // Check for valid string priorities
  if (VALID_PRIORITIES.includes(upper)) {
    return { valid: true, normalized: upper };
  }

  // Check for bug priorities (P0-P3)
  if (BUG_PRIORITIES.includes(upper)) {
    return { valid: true, normalized: upper };
  }

  // Check for numeric priority
  if (NUMERIC_PRIORITY_REGEX.test(priority)) {
    const num = parseInt(priority);
    if (num >= 0 && num <= 999) {
      return { valid: true, normalized: priority };
    }
    return {
      valid: false,
      normalized: priority,
      warning: "Numeric priority should be between 0-999",
    };
  }

  // Check for mixed format (e.g., "5high", "high5")
  const hasNumber = /\d/.test(priority);
  const hasText = /[a-zA-Z]/.test(priority);
  if (hasNumber && hasText) {
    return {
      valid: false,
      normalized: priority,
      warning:
        `Invalid priority format: "${priority}". Use either HIGH/MID/LOW, P0-P3, or a number (0-999).`,
    };
  }

  return {
    valid: false,
    normalized: priority,
    warning:
      `Invalid priority: "${priority}". Use HIGH/MID/LOW, P0-P3, or a number (0-999).`,
  };
}

export async function runAddCommand(
  filePath: string,
  sectionType: string,
  message: string,
  priority?: string,
  _indentSize?: number,
): Promise<void> {
  // Load config for default indent size
  // const config = await loadConfig();
  // const actualIndentSize = indentSize ?? config.indentSize ?? 2;

  // Normalize section type to uppercase
  const section = sectionType.toUpperCase();

  // Validate and format priority
  let taskText = message;
  let validation: ReturnType<typeof validatePriority> | null = null;
  if (priority) {
    validation = validatePriority(priority);
    if (!validation.valid) {
      console.error(`Error: ${validation.warning}`);
      Deno.exit(1);
    }
    taskText = `[${validation.normalized}] ${message}`;
  }

  // Check if file exists
  let content: string;
  try {
    content = await Deno.readTextFile(filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Create new file with the section
      content = `# TODO

## ${section}

- [ ] ${taskText}
`;
      await Deno.writeTextFile(filePath, content);
      console.log(bold(green("✨ Created new TODO.md file")));
      console.log(`  Added task to ${section} section: ${message}`);
      if (priority && validation) {
        console.log(`  Priority: ${validation.normalized}`);
      }
      return;
    }
    throw error;
  }

  // Parse the file to find sections
  const lines = content.split("\n");
  let sectionIndex = -1;
  let nextSectionIndex = lines.length;
  let sectionLevel = 0;

  // Find the target section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headerMatch = line.match(/^(#+)\s+(.+)$/);

    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim().toUpperCase();

      if (title === section) {
        sectionIndex = i;
        sectionLevel = level;
      } else if (sectionIndex >= 0 && level <= sectionLevel) {
        // Found next section at same or higher level
        nextSectionIndex = i;
        break;
      }
    }
  }

  // If section not found, create it
  if (sectionIndex === -1) {
    // Find a good place to insert the new section
    let insertIndex = lines.length;

    // Look for existing sections to determine where to add
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].match(/^##\s+/)) {
        insertIndex = i + 1;
        // Skip empty lines after the section
        while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
          insertIndex++;
        }
        // Find the end of the current section's items
        while (
          insertIndex < lines.length &&
          (lines[insertIndex].startsWith("- ") ||
            lines[insertIndex].trim() === "" ||
            lines[insertIndex].match(/^\s+/))
        ) {
          insertIndex++;
        }
        break;
      }
    }

    // Insert new section
    const newSection = [``, `## ${section}`, ``, `- [ ] ${taskText}`];
    lines.splice(insertIndex, 0, ...newSection);
  } else {
    // Add to existing section
    let insertIndex = sectionIndex + 1;

    // Skip empty lines after section header
    while (insertIndex < nextSectionIndex && lines[insertIndex].trim() === "") {
      insertIndex++;
    }

    // Find the end of the current list items
    let lastItemIndex = insertIndex - 1;
    for (let i = insertIndex; i < nextSectionIndex; i++) {
      if (
        lines[i].startsWith("- ") ||
        (lines[i].match(/^\s+/) && lines[i].trim() !== "")
      ) {
        lastItemIndex = i;
      } else if (lines[i].trim() !== "") {
        // Found non-list content
        break;
      }
    }

    // Insert after the last item
    lines.splice(lastItemIndex + 1, 0, `- [ ] ${taskText}`);
  }

  // Write back to file
  await Deno.writeTextFile(filePath, lines.join("\n"));

  console.log(bold(green("✨ Added new task")));
  console.log(`  Section: ${section}`);
  console.log(`  Task: ${message}`);
  if (priority && validation) {
    console.log(`  Priority: ${validation.normalized}`);
  }
  console.log(`  File: ${filePath}`);
}
