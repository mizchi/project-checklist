# Scripting

`pcheck` is designed to be scriptable and integrate well with your development
workflow.

## Shell Scripting

### Basic Examples

```bash
#!/bin/bash

# Daily standup report
echo "## Completed Yesterday"
pcheck update --vacuum

echo "## Today's Tasks"
pcheck -u
```

### Git Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Validate TODO.md before commit
pcheck validate || exit 1

# Remove completed tasks
pcheck update --vacuum > /dev/null
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Check TODOs
  run: |
    pcheck --json > todos.json
    if [ $(jq '.summary.unchecked' todos.json) -gt 50 ]; then
      echo "Too many open TODOs!"
      exit 1
    fi
```

## JSON Processing

### With jq

```bash
# Count tasks by priority
pcheck --json | jq '.todos[].items[] | select(.priority=="HIGH")' | wc -l

# List all bug tasks
pcheck --json | jq '.todos[] | select(.section=="Bugs") | .items[].text'

# Export unchecked tasks
pcheck --json | jq '.todos[].items[] | select(.checked==false) | .text' > open-tasks.txt
```

### With Python

```python
#!/usr/bin/env python3
import subprocess
import json

# Get all tasks
result = subprocess.run(['pcheck', '--json'], capture_output=True, text=True)
data = json.loads(result.stdout)

# Generate report
for todo in data['todos']:
    print(f"\n{todo['file']}:")
    for item in todo['items']:
        status = "✓" if item['checked'] else "○"
        print(f"  {status} {item['text']}")
```

## Automation Ideas

### Weekly Report

```bash
#!/bin/bash
# weekly-report.sh

echo "# Weekly Progress Report"
echo "Generated: $(date)"
echo

echo "## Completed This Week"
git log --since="1 week ago" --pretty=format:"%s" | grep -E "^(feat|fix):"
echo

echo "## Open Tasks"
pcheck -u --max-items 10
echo

echo "## Statistics"
total=$(pcheck --json | jq '.summary.total')
completed=$(pcheck --json | jq '.summary.checked')
echo "Progress: $completed/$total tasks completed"
```

### Task Assignment

```bash
#!/bin/bash
# assign-task.sh

TASK="$1"
ASSIGNEE="$2"

# Add task with assignee in description
pcheck add -m "[$ASSIGNEE] $TASK" -p high
```

### Sync with External Tools

```bash
#!/bin/bash
# sync-to-github.sh

# Export tasks as GitHub issues
pcheck --json | jq -r '.todos[].items[] | select(.checked==false) | .text' | while read task; do
  gh issue create --title "$task" --label "from-pcheck"
done
```

## Best Practices

1. **Use JSON output** for reliable parsing
2. **Check exit codes** for error handling
3. **Validate before destructive operations**
4. **Keep scripts simple and focused**
5. **Document your automation**

## Environment Variables

Future versions may support:

- `PCHECK_CONFIG` - Custom config path
- `PCHECK_ENGINE` - Default search engine
- `PCHECK_FORMAT` - Default output format
