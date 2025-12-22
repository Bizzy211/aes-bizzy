#!/usr/bin/env python3
"""
Log Commands Hook - Command History Tracking

Event: PostToolUse (for Bash)
Purpose: Log command history for debugging and audit

Features:
- Track all executed commands
- Record success/failure status
- Enable command replay for debugging
"""

import json
import sys
import os
from datetime import datetime


def log_command(command: str, status: str, output: str = ""):
    """Log a command execution."""
    log_dir = ".beads/command-history"
    os.makedirs(log_dir, exist_ok=True)

    # Daily log file
    log_file = f"{log_dir}/commands-{datetime.now().strftime('%Y%m%d')}.jsonl"

    entry = {
        "timestamp": datetime.now().isoformat(),
        "command": command[:500],  # Limit size
        "status": status,
        "output_preview": output[:200] if output else "",
    }

    try:
        with open(log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except IOError:
        pass


def get_recent_commands(count: int = 10) -> list[dict]:
    """Get recent command history."""
    commands = []

    log_dir = ".beads/command-history"
    if not os.path.exists(log_dir):
        return commands

    # Get today's log
    log_file = f"{log_dir}/commands-{datetime.now().strftime('%Y%m%d')}.jsonl"
    if not os.path.exists(log_file):
        return commands

    try:
        with open(log_file, "r") as f:
            lines = f.readlines()
            for line in lines[-count:]:
                try:
                    commands.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    except IOError:
        pass

    return commands


def main():
    """Main hook execution."""
    # Check if Beads is initialized (for log location)
    if not os.path.exists(".beads"):
        os.makedirs(".beads", exist_ok=True)

    # Read tool result from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    # Only log Bash commands
    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")
    if not command:
        sys.exit(0)

    # Determine status
    if isinstance(tool_result, dict):
        status = "error" if tool_result.get("error") else "success"
        output = tool_result.get("output", "")
    else:
        status = "success"
        output = str(tool_result) if tool_result else ""

    # Log the command
    log_command(command, status, output)

    sys.exit(0)


if __name__ == "__main__":
    main()
