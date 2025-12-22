# Hook Creator Skill

> Create automation hooks for Claude Code tool execution

---

## When to Use This Skill

Use this skill when:
- Automating actions before/after Claude Code tool execution
- Adding validation or security checks to tool usage
- Logging or auditing tool calls
- Integrating external systems with Claude workflows
- Creating custom pre/post processing logic

---

## What is a Hook?

A hook is a **script that runs automatically** when Claude Code executes certain tools. Hooks can:

- Run **before** a tool executes (pre-hook)
- Run **after** a tool executes (post-hook)
- Block tool execution if conditions aren't met
- Modify tool inputs or process outputs
- Log activity for auditing

---

## Hook Location

```
~/.claude/hooks/
├── pre-tool/           # Run before tool execution
│   ├── secret-scanner.py
│   └── validation.py
├── post-tool/          # Run after tool execution
│   ├── beads-sync.py
│   └── quality-check.py
├── session/            # Session lifecycle
│   ├── session-start.py
│   └── session-end.py
└── git/                # Git operation hooks
    ├── pre-commit.py
    └── post-commit.py
```

---

## Hook Types

### Pre-Tool Hooks
Run **before** Claude executes a tool. Can:
- Validate inputs
- Block dangerous operations
- Add required parameters
- Log intended actions

### Post-Tool Hooks
Run **after** Claude executes a tool. Can:
- Process outputs
- Trigger follow-up actions
- Log results
- Sync state (e.g., Beads)

### Session Hooks
Run at session start/end:
- `session-start`: Initialize state, load context
- `session-end`: Save state, sync, summarize

### Git Hooks
Integrate with git operations:
- `pre-commit`: Validate before commit
- `post-commit`: Update tracking after commit

---

## Hook Template (Python)

```python
#!/usr/bin/env python3
"""
Hook: [Name]
Type: [pre-tool | post-tool | session | git]
Trigger: [When this hook runs]
Purpose: [What it does]
"""

import json
import sys
import os
from datetime import datetime

# =============================================================================
# CONFIGURATION
# =============================================================================

HOOK_NAME = "[hook-name]"
LOG_FILE = os.path.expanduser("~/.claude/logs/hooks.log")

# Tools this hook applies to (empty = all tools)
TARGET_TOOLS = [
    # "bash_tool",
    # "create_file",
    # "str_replace",
]

# =============================================================================
# LOGGING
# =============================================================================

def log(message: str, level: str = "INFO"):
    """Log message to file and stderr."""
    timestamp = datetime.now().isoformat()
    log_entry = f"[{timestamp}] [{level}] [{HOOK_NAME}] {message}"
    
    # Log to file
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(log_entry + "\n")
    
    # Log to stderr (visible in Claude Code)
    if level in ["ERROR", "WARN"]:
        print(log_entry, file=sys.stderr)

# =============================================================================
# HOOK LOGIC
# =============================================================================

def should_run(context: dict) -> bool:
    """Determine if this hook should run for the given context."""
    if not TARGET_TOOLS:
        return True
    
    tool_name = context.get("tool_name", "")
    return tool_name in TARGET_TOOLS

def pre_hook(context: dict) -> dict:
    """
    Pre-tool hook logic.
    
    Args:
        context: {
            "tool_name": str,
            "tool_input": dict,
            "session_id": str,
            "timestamp": str
        }
    
    Returns:
        {
            "allow": bool,        # Whether to allow tool execution
            "modified_input": dict,  # Optional modified input
            "message": str        # Optional message to display
        }
    """
    log(f"Pre-hook triggered for {context.get('tool_name')}")
    
    # Your logic here
    # Example: Block if certain condition
    # if dangerous_condition:
    #     return {"allow": False, "message": "Blocked: reason"}
    
    return {"allow": True}

def post_hook(context: dict) -> dict:
    """
    Post-tool hook logic.
    
    Args:
        context: {
            "tool_name": str,
            "tool_input": dict,
            "tool_output": any,
            "success": bool,
            "session_id": str,
            "timestamp": str
        }
    
    Returns:
        {
            "modified_output": any,  # Optional modified output
            "follow_up": list,       # Optional follow-up actions
            "message": str           # Optional message to display
        }
    """
    log(f"Post-hook triggered for {context.get('tool_name')}")
    
    # Your logic here
    
    return {}

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    """Main entry point for hook."""
    try:
        # Read context from stdin (JSON)
        input_data = sys.stdin.read()
        context = json.loads(input_data) if input_data else {}
        
        # Check if hook should run
        if not should_run(context):
            # Pass through
            print(json.dumps({"allow": True}))
            return
        
        # Determine hook type from context
        hook_type = context.get("hook_type", "pre")
        
        if hook_type == "pre":
            result = pre_hook(context)
        elif hook_type == "post":
            result = post_hook(context)
        else:
            result = {"allow": True}
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        log(f"Hook error: {e}", "ERROR")
        # On error, allow execution (fail open)
        print(json.dumps({"allow": True, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

## Common Hook Patterns

### 1. Secret Scanner (Pre-Tool)

Prevents committing secrets:

```python
#!/usr/bin/env python3
"""
Hook: secret-scanner
Type: pre-tool
Trigger: Before bash_tool, create_file, str_replace
Purpose: Block operations that would expose secrets
"""

import re
import json
import sys

SECRET_PATTERNS = [
    r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\']?[\w-]{20,}',
    r'(?i)(secret|password|passwd|pwd)\s*[:=]\s*["\']?[\w-]{8,}',
    r'ghp_[a-zA-Z0-9]{36}',  # GitHub PAT
    r'sk-[a-zA-Z0-9]{48}',   # OpenAI key
    r'-----BEGIN (RSA |EC )?PRIVATE KEY-----',
]

def scan_for_secrets(text: str) -> list:
    """Scan text for potential secrets."""
    found = []
    for pattern in SECRET_PATTERNS:
        matches = re.findall(pattern, text)
        if matches:
            found.append(pattern)
    return found

def main():
    context = json.loads(sys.stdin.read())
    tool_input = context.get("tool_input", {})
    
    # Get content to scan
    content = ""
    if "command" in tool_input:
        content = tool_input["command"]
    elif "file_text" in tool_input:
        content = tool_input["file_text"]
    elif "new_str" in tool_input:
        content = tool_input["new_str"]
    
    # Scan for secrets
    secrets = scan_for_secrets(content)
    
    if secrets:
        print(json.dumps({
            "allow": False,
            "message": f"🚨 BLOCKED: Potential secret detected. Patterns matched: {len(secrets)}"
        }))
    else:
        print(json.dumps({"allow": True}))

if __name__ == "__main__":
    main()
```

### 2. Beads Sync (Post-Tool)

Auto-sync Beads after task-related tools:

```python
#!/usr/bin/env python3
"""
Hook: beads-sync
Type: post-tool
Trigger: After create_file, str_replace (in .beads/)
Purpose: Auto-sync Beads changes to git
"""

import json
import sys
import subprocess
import os

def main():
    context = json.loads(sys.stdin.read())
    tool_name = context.get("tool_name", "")
    tool_input = context.get("tool_input", {})
    
    # Check if operation touched .beads/
    path = tool_input.get("path", "")
    if ".beads" not in path:
        print(json.dumps({}))
        return
    
    # Run bd sync
    try:
        result = subprocess.run(
            ["bd", "sync"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        
        if result.returncode == 0:
            print(json.dumps({
                "message": "✅ Beads synced automatically"
            }))
        else:
            print(json.dumps({
                "message": f"⚠️ Beads sync warning: {result.stderr}"
            }))
    except Exception as e:
        print(json.dumps({
            "message": f"⚠️ Beads sync skipped: {e}"
        }))

if __name__ == "__main__":
    main()
```

### 3. Quality Gate (Post-Tool)

Check code quality after file creation:

```python
#!/usr/bin/env python3
"""
Hook: quality-gate
Type: post-tool
Trigger: After create_file for code files
Purpose: Run linters and report issues
"""

import json
import sys
import subprocess
import os

CODE_EXTENSIONS = ['.py', '.ts', '.tsx', '.js', '.jsx']

def get_linter_command(filepath: str) -> list:
    """Get appropriate linter for file type."""
    ext = os.path.splitext(filepath)[1]
    
    if ext == '.py':
        return ['python', '-m', 'py_compile', filepath]
    elif ext in ['.ts', '.tsx']:
        return ['npx', 'tsc', '--noEmit', filepath]
    elif ext in ['.js', '.jsx']:
        return ['npx', 'eslint', filepath]
    
    return None

def main():
    context = json.loads(sys.stdin.read())
    tool_input = context.get("tool_input", {})
    path = tool_input.get("path", "")
    
    # Check if code file
    ext = os.path.splitext(path)[1]
    if ext not in CODE_EXTENSIONS:
        print(json.dumps({}))
        return
    
    # Get linter command
    cmd = get_linter_command(path)
    if not cmd:
        print(json.dumps({}))
        return
    
    # Run linter
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(json.dumps({
                "message": f"⚠️ Quality issues found:\n{result.stderr or result.stdout}"
            }))
        else:
            print(json.dumps({
                "message": "✅ Code quality check passed"
            }))
    except Exception as e:
        print(json.dumps({}))

if __name__ == "__main__":
    main()
```

### 4. Session End Summary (Session Hook)

Summarize work at session end:

```python
#!/usr/bin/env python3
"""
Hook: session-end-summary
Type: session
Trigger: Session end
Purpose: Summarize work done, sync Beads, check for stale tasks
"""

import json
import sys
import subprocess
import os

def main():
    # Sync Beads
    try:
        subprocess.run(["bd", "sync"], capture_output=True)
    except:
        pass
    
    # Get stale tasks
    try:
        result = subprocess.run(
            ["bd", "stale", "--days", "1", "--json"],
            capture_output=True,
            text=True
        )
        
        stale = json.loads(result.stdout) if result.stdout else []
        
        if stale:
            print(json.dumps({
                "message": f"📋 Session ended. {len(stale)} stale task(s) need attention."
            }))
        else:
            print(json.dumps({
                "message": "✅ Session ended. All tasks up to date."
            }))
    except:
        print(json.dumps({
            "message": "📋 Session ended."
        }))

if __name__ == "__main__":
    main()
```

### 5. Task Handoff Logger (Post-Tool)

Log agent handoffs:

```python
#!/usr/bin/env python3
"""
Hook: task-handoff-logger
Type: post-tool
Trigger: After bd commands that indicate handoff
Purpose: Log handoffs for audit trail
"""

import json
import sys
import os
from datetime import datetime

HANDOFF_LOG = os.path.expanduser("~/.claude/logs/handoffs.jsonl")

def main():
    context = json.loads(sys.stdin.read())
    tool_name = context.get("tool_name", "")
    tool_input = context.get("tool_input", {})
    
    # Check if this looks like a handoff
    command = tool_input.get("command", "")
    if "bd create" not in command or "HANDOFF" not in command:
        print(json.dumps({}))
        return
    
    # Log the handoff
    handoff_record = {
        "timestamp": datetime.now().isoformat(),
        "command": command,
        "session_id": context.get("session_id", "unknown")
    }
    
    os.makedirs(os.path.dirname(HANDOFF_LOG), exist_ok=True)
    with open(HANDOFF_LOG, "a") as f:
        f.write(json.dumps(handoff_record) + "\n")
    
    print(json.dumps({
        "message": "📝 Handoff logged"
    }))

if __name__ == "__main__":
    main()
```

---

## Creating a New Hook

### Step 1: Identify Trigger

What should trigger this hook?
- Specific tool(s)?
- All tools?
- Session lifecycle?
- Git operations?

### Step 2: Create Hook File

```bash
# Create hook file
touch ~/.claude/hooks/pre-tool/my-hook.py
chmod +x ~/.claude/hooks/pre-tool/my-hook.py
```

### Step 3: Implement Logic

Use the template above. Key decisions:
- Pre or post?
- Block or allow?
- What to log?
- What to modify?

### Step 4: Test Hook

```bash
# Test with sample input
echo '{"tool_name": "bash_tool", "tool_input": {"command": "echo test"}}' | \
  python ~/.claude/hooks/pre-tool/my-hook.py
```

### Step 5: Register Hook

Create a hook manifest (optional but recommended):

```json
// ~/.claude/hooks/manifest.json
{
  "hooks": [
    {
      "name": "secret-scanner",
      "type": "pre-tool",
      "path": "pre-tool/secret-scanner.py",
      "tools": ["bash_tool", "create_file", "str_replace"],
      "enabled": true
    },
    {
      "name": "beads-sync",
      "type": "post-tool",
      "path": "post-tool/beads-sync.py",
      "tools": ["*"],
      "enabled": true
    }
  ]
}
```

---

## Hook Input/Output Contract

### Pre-Hook Input
```json
{
  "hook_type": "pre",
  "tool_name": "create_file",
  "tool_input": {
    "path": "/path/to/file.py",
    "file_text": "content..."
  },
  "session_id": "abc123",
  "timestamp": "2025-12-21T10:30:00Z"
}
```

### Pre-Hook Output
```json
{
  "allow": true,
  "modified_input": {},
  "message": "Optional message to display"
}
```

### Post-Hook Input
```json
{
  "hook_type": "post",
  "tool_name": "create_file",
  "tool_input": {...},
  "tool_output": {...},
  "success": true,
  "session_id": "abc123",
  "timestamp": "2025-12-21T10:30:00Z"
}
```

### Post-Hook Output
```json
{
  "modified_output": {},
  "follow_up": [],
  "message": "Optional message to display"
}
```

---

## Best Practices

### ✅ Do
- **Fail open**: On error, allow execution (don't break Claude)
- **Log everything**: Use structured logging for debugging
- **Be fast**: Hooks add latency, keep them quick
- **Be specific**: Target specific tools, not all
- **Handle missing deps**: Check if external tools exist

### ❌ Don't
- **Block without reason**: Always explain why blocked
- **Modify silently**: User should know if input changed
- **Throw unhandled exceptions**: Catch and handle errors
- **Assume environment**: Check for required tools/files

---

## Debugging Hooks

### Enable Verbose Logging
```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    filename=os.path.expanduser("~/.claude/logs/hook-debug.log")
)
```

### Test Manually
```bash
# Create test input
echo '{"tool_name": "bash_tool", "tool_input": {"command": "ls"}}' > /tmp/hook-test.json

# Run hook
cat /tmp/hook-test.json | python ~/.claude/hooks/pre-tool/my-hook.py

# Check output
```

### View Hook Logs
```bash
tail -f ~/.claude/logs/hooks.log
```

---

## Hook Validation Checklist

- [ ] Has shebang (`#!/usr/bin/env python3`)
- [ ] Is executable (`chmod +x`)
- [ ] Reads JSON from stdin
- [ ] Outputs JSON to stdout
- [ ] Handles errors gracefully
- [ ] Logs important actions
- [ ] Has clear documentation
- [ ] Targets specific tools (not all)
- [ ] Tested with sample inputs

---

*Skill Version: 1.0.0*
*Last Updated: December 2025*
