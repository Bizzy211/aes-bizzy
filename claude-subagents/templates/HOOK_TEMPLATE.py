#!/usr/bin/env python3
"""
Hook Template

Replace this with a description of what your hook does.

Events this hook responds to:
- PreToolUse: Before a tool is executed
- PostToolUse: After a tool completes
- Stop: When Claude stops processing
- SubAgentToolUse: Sub-agent tool execution
"""

import json
import sys
from datetime import datetime
from pathlib import Path


def log(message: str) -> None:
    """Log a message to stderr (visible in Claude Code)."""
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] {message}", file=sys.stderr)


def main() -> None:
    """Main hook entry point."""
    # Read hook input from stdin
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        log("Error: Invalid JSON input")
        sys.exit(1)

    # Extract hook data
    session_id = hook_input.get("session_id", "unknown")
    tool_name = hook_input.get("tool_name", "unknown")
    tool_input = hook_input.get("tool_input", {})

    # Log what we received (for debugging)
    log(f"Hook triggered for tool: {tool_name}")

    # Implement your hook logic here
    # Example: Track command statistics
    # Example: Validate tool inputs
    # Example: Modify tool behavior

    # Output hook response
    response = {
        # To continue normally:
        "continue": True,

        # To block the tool (PreToolUse only):
        # "continue": False,
        # "message": "Reason for blocking"

        # To modify tool input (PreToolUse only):
        # "tool_input": modified_input
    }

    print(json.dumps(response))


if __name__ == "__main__":
    main()
