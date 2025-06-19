# Auto Response Testing Feature

## Overview

The auto-response feature allows interactive CLI commands to be tested programmatically by providing pre-determined responses to prompts. This is essential for automated testing of interactive features.

## Implementation

### Core Module

The auto-response functionality is implemented in `src/cli/auto-response.ts`:

```typescript
export interface AutoResponse {
  // For $.confirm() - boolean responses
  confirmResponses?: boolean[];
  
  // For $.multiSelect() - array of selected indices
  multiSelectResponses?: number[][];
  
  // For prompt() - string responses  
  promptResponses?: string[];
  
  // Track current response index for each type
  _confirmIndex?: number;
  _multiSelectIndex?: number;
  _promptIndex?: number;
}
```

### Helper Functions

- `getNextConfirmResponse(autoResponse)` - Returns the next boolean response for confirm prompts
- `getNextMultiSelectResponse(autoResponse)` - Returns the next array of indices for multi-select prompts
- `getNextPromptResponse(autoResponse)` - Returns the next string response for text prompts

## Supported Commands

### 1. Merge Command (`merge`)

The merge command supports auto-response for:
- File selection (multi-select)
- Source file removal confirmation

Example usage:
```typescript
await runMergeCommand(directory, {
  interactive: true,
  autoResponse: {
    multiSelectResponses: [[0, 1]], // Select files at indices 0 and 1
    confirmResponses: [true],       // Confirm source file removal
  }
});
```

### 2. Update Command (`update`)

The update command supports auto-response for:
- Priority sorting confirmation
- Moving completed tasks confirmation
- Creating new TODO.md file

Example usage:
```typescript
await runUpdateCommand(filePath, {
  autoResponse: {
    confirmResponses: [true, true], // Yes to sort, yes to move completed
    promptResponses: ["y"],         // Yes to create TODO.md
  }
});
```

### 3. Init Command (`init`)

The init command supports auto-response for:
- Importing tasks from README.md
- Removing imported tasks from README.md
- Configuration template selection
- Code scanning enablement

Example usage:
```typescript
await runInitCommand(directory, {
  autoResponse: {
    promptResponses: [
      "y",  // Import tasks
      "y",  // Remove from README
      "3",  // Standard config
    ],
  }
});
```

## Testing

Each command has corresponding test files demonstrating auto-response usage:

- `test/merge-command-auto.test.ts` - Tests merge command with various auto-response scenarios
- `test/update-command-auto.test.ts` - Tests update command task management automation
- `test/init-command-auto.test.ts` - Tests init command project setup automation

### Running Tests

```bash
# Run all auto-response tests
deno test test/*-auto.test.ts --allow-read --allow-write --allow-env --allow-run

# Run individual command tests
deno test test/merge-command-auto.test.ts --allow-read --allow-write --allow-env
deno test test/update-command-auto.test.ts --allow-read --allow-write --allow-env --allow-run
deno test test/init-command-auto.test.ts --allow-read --allow-write --allow-env
```

## Design Principles

1. **Fallback to Interactive**: If auto-responses are exhausted, commands fall back to interactive mode
2. **Visual Feedback**: Auto-responses are displayed in the console output for transparency
3. **Type Safety**: Each response type has its own array and getter function
4. **Stateful**: Response indices are tracked internally to ensure correct sequencing

## Future Enhancements

- Add support for more interactive prompts as they are added
- Consider adding response validation
- Add timing controls for simulating user think time
- Support for conditional responses based on previous outputs