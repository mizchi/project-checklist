# Dax Interactive Methods Usage Guide

## Overview

Dax provides several interactive methods for user input through the `$` object.
These methods are useful for creating interactive CLI applications.

## $.select()

The `$.select()` method presents a list of options to the user and returns the
selected option.

### Basic Usage

```typescript
const result = await $.select({
  message: "Select an option:",
  options: ["Option 1", "Option 2", "Option 3"],
});
```

### Parameters

- `message` (string): The prompt message to display to the user
- `options` (string[]): An array of string options to present to the user

### Return Value

- Returns the selected string option
- If the user cancels (Ctrl+C), it may throw an error or return undefined

### Example

```typescript
const color = await $.select({
  message: "Choose your favorite color:",
  options: ["Red", "Green", "Blue", "Yellow"],
});

console.log(`You selected: ${color}`);
```

## $.maybeSelect()

Similar to `$.select()` but returns `undefined` if the user cancels instead of
throwing an error.

### Example

```typescript
const result = await $.maybeSelect({
  message: "Select an option (or cancel):",
  options: ["Continue", "Skip", "Abort"],
});

if (result === undefined) {
  console.log("User cancelled");
} else {
  console.log(`User selected: ${result}`);
}
```

## $.multiSelect()

Allows selecting multiple options from a list.

### Basic Usage

```typescript
const selected = await $.multiSelect({
  message: "Select multiple options:",
  options: ["Option 1", "Option 2", "Option 3", "Option 4"],
});
```

### Return Value

- Returns an array of selected strings
- Empty array if nothing selected

### Example

```typescript
const features = await $.multiSelect({
  message: "Select features to install:",
  options: ["TypeScript", "ESLint", "Prettier", "Testing", "CI/CD"],
});

console.log(`Selected features: ${features.join(", ")}`);
```

## $.maybeMultiSelect()

Like `$.multiSelect()` but returns `undefined` on cancellation.

### Example

```typescript
const selected = await $.maybeMultiSelect({
  message: "Select options (or cancel):",
  options: ["A", "B", "C"],
});

if (selected === undefined) {
  console.log("Cancelled");
} else {
  console.log(`Selected: ${selected.join(", ")}`);
}
```

## $.prompt()

Gets text input from the user.

### Basic Usage

```typescript
const name = await $.prompt("What is your name?");
```

### Parameters

- First parameter: The prompt message (string)
- Optional second parameter: Default value

### Example

```typescript
const username = await $.prompt("Enter username:", "guest");
console.log(`Hello, ${username}!`);
```

## $.confirm()

Asks the user a yes/no question.

### Basic Usage

```typescript
const proceed = await $.confirm("Do you want to continue?");
```

### Return Value

- Returns `true` for yes
- Returns `false` for no

### Example

```typescript
if (await $.confirm("Delete file?")) {
  await Deno.remove("file.txt");
} else {
  console.log("Cancelled");
}
```

## Best Practices

1. **Error Handling**: Always handle cancellation cases, especially with
   `$.select()`
2. **Clear Messages**: Provide clear, concise prompt messages
3. **Default Values**: Use default values for `$.prompt()` when appropriate
4. **User Experience**: Consider using `$.maybeSelect()` when cancellation is a
   valid option

## Common Patterns

### Menu Selection with Actions

```typescript
const actions = {
  "Create new file": () => createFile(),
  "Delete file": () => deleteFile(),
  "Exit": () => process.exit(0),
};

const choice = await $.select({
  message: "What would you like to do?",
  options: Object.keys(actions),
});

await actions[choice]();
```

### Multi-step Wizard

```typescript
const config = {};

config.name = await $.prompt("Project name:");
config.type = await $.select({
  message: "Project type:",
  options: ["Web", "CLI", "Library"],
});
config.typescript = await $.confirm("Use TypeScript?");

console.log("Configuration:", config);
```

## Notes

- These methods require a TTY environment
- They will fail in CI/CD environments or when input is piped
- Always provide fallback behavior for non-interactive environments
