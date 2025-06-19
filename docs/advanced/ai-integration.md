# AI Integration

`pcheck` is designed from the ground up to work seamlessly with AI assistants.

## Design Principles

### Structured Output
- Clear, parseable output format
- Consistent task IDs across sessions
- JSON output for machine processing

### Predictable Commands
- Intuitive command structure
- Minimal flags and options
- Consistent behavior

## AI Workflow

### 1. Understanding Current State

```bash
# AI reads current tasks
pcheck --json

# Focus on unchecked items
pcheck -u --json
```

### 2. Managing Tasks

```bash
# AI adds tasks based on conversation
pcheck add -m "Implement feature X" -p high

# Mark tasks complete
pcheck check abc123
```

### 3. Organizing Work

```bash
# Clean up after work session
pcheck update --completed --priority

# Prepare for git commit
pcheck update --vacuum
```

## Best Practices

### For AI Developers

1. **Use JSON output** for reliable parsing
2. **Track task IDs** to maintain context
3. **Batch operations** when possible
4. **Validate changes** with `pcheck validate`

### For Users

1. **Clear task descriptions** help AI understand context
2. **Priority tags** guide AI decision-making
3. **Regular updates** keep AI synchronized
4. **Configuration files** reduce command complexity

## Example Integration

```python
import subprocess
import json

def get_todos():
    """Get current TODO items"""
    result = subprocess.run(
        ["pcheck", "--json"],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

def add_task(message, priority="medium"):
    """Add a new task"""
    subprocess.run([
        "pcheck", "add",
        "-m", message,
        "-p", priority
    ])

def complete_task(task_id):
    """Mark task as complete"""
    subprocess.run([
        "pcheck", "check", task_id
    ])
```

## Future: MCP Integration

The Model Context Protocol (MCP) server is planned, which will allow:

- Direct integration with AI tools
- Real-time task synchronization
- Context-aware suggestions
- Automated task management