#!/usr/bin/env python3
"""
MCP Tool Enforcer Hook - Tool Usage Validation

Event: PreToolUse
Purpose: Validate and log MCP tool usage for agents

Validation Rules:
- Ensure tool is available in agent's toolset
- Log tool usage for debugging
- Enforce tool usage limits if needed
"""

import json
import sys
import os
from datetime import datetime


# Tool categories and their common uses
TOOL_CATEGORIES = {
    "read": ["Read", "Glob", "Grep", "WebFetch"],
    "write": ["Write", "Edit", "MultiEdit"],
    "execute": ["Bash", "Task"],
    "mcp": ["mcp__*"],
}

# Tools that should be used sparingly
RATE_LIMITED_TOOLS = [
    "WebFetch",
    "WebSearch",
]

# Tools requiring explicit approval
APPROVAL_REQUIRED = [
    "Bash",  # When command is destructive
]


def log_tool_usage(tool_name: str, context: dict):
    """Log tool usage for analytics."""
    if not os.path.exists(".beads"):
        return

    log_path = ".beads/tool-usage.jsonl"

    entry = {
        "timestamp": datetime.now().isoformat(),
        "tool": tool_name,
        "agent": context.get("agent", "unknown"),
    }

    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except IOError:
        pass


def check_tool_rate_limit(tool_name: str) -> bool:
    """Check if tool has been overused recently."""
    if tool_name not in RATE_LIMITED_TOOLS:
        return True

    log_path = ".beads/tool-usage.jsonl"
    if not os.path.exists(log_path):
        return True

    # Count recent uses (last hour)
    count = 0
    cutoff = datetime.now().timestamp() - 3600  # 1 hour ago

    try:
        with open(log_path, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("tool") == tool_name:
                        ts = datetime.fromisoformat(entry["timestamp"]).timestamp()
                        if ts > cutoff:
                            count += 1
                except (json.JSONDecodeError, KeyError, ValueError):
                    pass
    except IOError:
        return True

    # Allow up to 50 uses per hour
    return count < 50


def validate_tool_access(tool_name: str, agent: str) -> tuple[bool, str]:
    """Validate if agent can use this tool."""
    # For now, allow all tools
    # This could be extended to check agent-specific permissions
    return True, ""


def main():
    """Main hook execution."""
    # Read tool input from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    context = {
        "agent": data.get("agent", "main"),
    }

    # Log the tool usage
    log_tool_usage(tool_name, context)

    # Check rate limits
    if not check_tool_rate_limit(tool_name):
        result = {
            "decision": "block",
            "reason": f"Rate limit exceeded for {tool_name}"
        }
        print(json.dumps(result))
        sys.exit(1)

    # Validate tool access
    allowed, reason = validate_tool_access(tool_name, context.get("agent", ""))
    if not allowed:
        result = {
            "decision": "block",
            "reason": reason
        }
        print(json.dumps(result))
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
