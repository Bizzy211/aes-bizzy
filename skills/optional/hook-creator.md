# Hook Creator - Generate New Hooks

Hook Creator for generating new event-driven hooks with proper structure and Beads integration.

## Overview

Create custom hooks that respond to Claude Code events, with proper validation, error handling, and Beads integration.

## Core Workflow

### Create New Hook

```bash
# Create hook from template
/hook-creator "Create a hook that validates SQL queries"

# Create with specific event
/hook-creator "Create pre-commit linter hook" --event PreToolUse

# Create with research
/hook-creator "Create security scanner hook" --research
```

### Hook Events

| Event | Trigger | Common Uses |
|-------|---------|-------------|
| PreToolUse | Before tool execution | Validation, blocking |
| PostToolUse | After tool completion | Logging, quality checks |
| Stop | Session end | Cleanup, sync |
| SubAgentStop | Agent completion | Handoff logging |
| UserPromptSubmit | User message | Shortcuts, interception |
| PreCompact | Before compaction | Context saving |

## Beads Integration

### Track Hook Creation

```bash
# Create task for hook development
bd create "Create SQL validation hook" --assign meta-agent

# Log progress
bd update TASK_ID --add-note "Created PreToolUse hook skeleton"
bd update TASK_ID --add-note "Added SQL injection pattern detection"
bd update TASK_ID --add-note "Tested with sample queries"

# Complete
bd set-status TASK_ID done
```

## Cross-References

### Related Agents
- **meta-agent**: Uses hook templates
- **security-expert**: Reviews security hooks
- **devops-engineer**: Deploys hooks

### Related Skills
- **skill-creator**: Creates skills that hooks validate
- **agent-creator**: Creates agents that trigger hooks

### Related Hooks
- **pre_tool_use.py**: Example blocking hook
- **post_tool_use.py**: Example logging hook

## Hook Template

```python
#!/usr/bin/env python3
"""
Hook Name - Brief Description

Event: PreToolUse | PostToolUse | Stop | etc.
Matcher: Tool pattern or "*"
"""

import json
import sys
import subprocess
from typing import Any


def run_beads_command(args: list[str]) -> dict | None:
    """Execute Beads CLI command."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        pass
    return None


def validate_input(data: dict) -> bool:
    """Validate the input data."""
    # Add validation logic
    return True


def should_block(data: dict) -> tuple[bool, str]:
    """Determine if operation should be blocked."""
    # Add blocking logic
    # Return (True, "reason") to block
    # Return (False, "") to allow
    return False, ""


def log_to_beads(message: str) -> None:
    """Log event to Beads context."""
    # Get current task if available
    ready = run_beads_command(["ready", "--json"])
    if ready and ready.get("tasks"):
        task_id = ready["tasks"][0].get("id")
        if task_id:
            run_beads_command([
                "update", task_id,
                "--add-note", message
            ])


def main():
    # Read input from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)  # Pass through on parse error

    # Get tool info
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # Validate
    if not validate_input(data):
        sys.exit(0)

    # Check if should block
    block, reason = should_block(data)
    if block:
        # Log to Beads
        log_to_beads(f"Blocked {tool_name}: {reason}")

        # Output block decision
        print(json.dumps({
            "decision": "block",
            "reason": reason
        }))
        sys.exit(1)

    # Allow operation
    sys.exit(0)


if __name__ == "__main__":
    main()
```

## Hook Categories

### Essential Hooks
Location: `hooks/essential/`
- Always enabled
- Security and context management
- Examples: pre_tool_use.py, stop.py

### Recommended Hooks
Location: `hooks/recommended/`
- Project-based activation
- Quality and validation
- Examples: no_mock_code.py, style_consistency.py

### Optional Hooks
Location: `hooks/optional/`
- Specific workflows
- Enhancement and logging
- Examples: quality_check.py, log_commands.py

## Creation Workflow

### Step 1: Identify Event

```bash
# Determine which event to hook
# PreToolUse - validate/block before execution
# PostToolUse - log/check after execution
# Stop - cleanup/sync at session end
```

### Step 2: Create Template

```bash
# Copy template
cp claude-subagents/templates/HOOK_TEMPLATE.py \
   claude-subagents/hooks/optional/my_hook.py
```

### Step 3: Implement Logic

```python
def should_block(data: dict) -> tuple[bool, str]:
    """Custom blocking logic."""
    tool_input = data.get("tool_input", {})

    # Example: Block SQL with DROP
    if "DROP" in str(tool_input).upper():
        return True, "Dangerous SQL operation blocked"

    return False, ""
```

### Step 4: Add Beads Logging

```python
def log_to_beads(message: str) -> None:
    """Log to current Beads task."""
    run_beads_command(["update", "$CURRENT", "--add-note", message])
```

### Step 5: Configure in Settings

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": ["./hooks/optional/sql_validator.py"]
    }]
  }
}
```

## Validation Checklist

- [ ] Correct shebang and imports
- [ ] Proper event handling
- [ ] Beads integration
- [ ] Error handling
- [ ] Exit codes (0=allow, 1=block)
- [ ] JSON output for blocks

## Best Practices

1. **Handle errors gracefully** - Exit 0 on errors to not block
2. **Add Beads logging** - Track hook activity
3. **Use specific matchers** - Only run on relevant tools
4. **Test thoroughly** - Verify blocking and allowing
5. **Keep focused** - One hook = one concern
6. **Document patterns** - Explain what is blocked/logged

---

*A.E.S - Bizzy Skill - Hook Creator v1.0.0*
