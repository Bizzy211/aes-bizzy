#!/usr/bin/env python3
"""
Pre-Tool Use Hook - Security Blocking

Event: PreToolUse
Purpose: Block dangerous operations before execution

Security Patterns Blocked:
- Destructive file operations (rm -rf, del /s)
- Environment file access (.env, credentials)
- System-level modifications
- Unsafe git operations
"""

import json
import sys
import re
from typing import Any


# Dangerous patterns to block
BLOCKED_PATTERNS = [
    # Destructive file operations
    r"rm\s+-rf\s+/",
    r"rm\s+-rf\s+~",
    r"rm\s+-rf\s+\*",
    r"del\s+/s\s+/q",
    r"rmdir\s+/s\s+/q",

    # System-level destructive
    r"mkfs\.",
    r"dd\s+if=.+of=/dev/",
    r"format\s+[a-zA-Z]:",

    # Unsafe git operations
    r"git\s+push\s+.*--force\s+.*main",
    r"git\s+push\s+.*--force\s+.*master",
    r"git\s+reset\s+--hard\s+HEAD~\d+",
]

# Sensitive file patterns
SENSITIVE_FILES = [
    r"\.env$",
    r"\.env\.[a-zA-Z]+$",
    r"credentials\.json$",
    r"secrets\.json$",
    r"\.aws/credentials$",
    r"\.ssh/id_rsa$",
    r"\.ssh/id_ed25519$",
    r"\.npmrc$",
    r"\.pypirc$",
]


def is_blocked_command(command: str) -> tuple[bool, str]:
    """Check if a command should be blocked."""
    command_lower = command.lower()

    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command_lower):
            return True, f"Blocked: Destructive pattern '{pattern}'"

    return False, ""


def is_sensitive_file_access(path: str) -> tuple[bool, str]:
    """Check if accessing sensitive files."""
    for pattern in SENSITIVE_FILES:
        if re.search(pattern, path, re.IGNORECASE):
            return True, f"Blocked: Sensitive file access '{path}'"

    return False, ""


def check_tool_use(tool_input: dict) -> tuple[bool, str]:
    """Check if the tool use should be blocked."""
    tool_name = tool_input.get("tool_name", "")
    tool_input_data = tool_input.get("tool_input", {})

    # Check Bash commands
    if tool_name == "Bash":
        command = tool_input_data.get("command", "")
        blocked, reason = is_blocked_command(command)
        if blocked:
            return True, reason

    # Check file read/write operations
    if tool_name in ["Read", "Write", "Edit"]:
        file_path = tool_input_data.get("file_path", "")
        blocked, reason = is_sensitive_file_access(file_path)
        if blocked:
            return True, reason

    return False, ""


def main():
    """Main hook execution."""
    # Read tool input from stdin
    input_data = sys.stdin.read()

    try:
        tool_input = json.loads(input_data)
    except json.JSONDecodeError:
        # Can't parse, allow through
        sys.exit(0)

    # Check if should be blocked
    blocked, reason = check_tool_use(tool_input)

    if blocked:
        # Output blocking reason
        result = {
            "decision": "block",
            "reason": reason
        }
        print(json.dumps(result))
        sys.exit(1)

    # Allow through
    sys.exit(0)


if __name__ == "__main__":
    main()
