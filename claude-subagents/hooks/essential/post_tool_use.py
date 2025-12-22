#!/usr/bin/env python3
"""
Post-Tool Use Hook - Optional Beads Logging

Event: PostToolUse
Purpose: Log significant tool usage to Beads for context tracking

Beads Integration:
- Logs major operations (file writes, bash commands)
- Creates audit trail for task work
- Enables session replay if needed
"""

import json
import sys
import subprocess
import os
from datetime import datetime


# Tool types worth logging
LOGGABLE_TOOLS = [
    "Write",
    "Edit",
    "MultiEdit",
    "Bash",
    "Task",
]

# Skip logging for these read-only tools
SKIP_TOOLS = [
    "Read",
    "Glob",
    "Grep",
]


def run_beads_command(args: list[str]) -> bool:
    """Execute a Beads CLI command."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def log_to_beads(tool_name: str, summary: str):
    """Log tool usage to Beads context."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    note = f"[{timestamp}] {tool_name}: {summary[:100]}"

    # Get current task if any
    try:
        result = subprocess.run(
            ["bd", "current", "--json"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            current = json.loads(result.stdout)
            task_id = current.get("id")
            if task_id:
                run_beads_command(["update", task_id, "--add-note", note, "--json"])
                return
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass

    # No current task, log to session context
    run_beads_command(["set", f"tool-usage-{timestamp}", note])


def get_tool_summary(tool_name: str, tool_input: dict, tool_result: dict) -> str:
    """Generate a summary of the tool operation."""
    if tool_name == "Write":
        path = tool_input.get("file_path", "unknown")
        return f"Created/wrote {path}"

    elif tool_name == "Edit":
        path = tool_input.get("file_path", "unknown")
        return f"Edited {path}"

    elif tool_name == "MultiEdit":
        edits = tool_input.get("edits", [])
        return f"Multi-edited {len(edits)} files"

    elif tool_name == "Bash":
        command = tool_input.get("command", "")[:50]
        return f"Ran: {command}"

    elif tool_name == "Task":
        agent = tool_input.get("subagent_type", "unknown")
        return f"Spawned {agent} agent"

    return f"Used {tool_name}"


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Read tool result from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    # Skip non-loggable tools
    if tool_name not in LOGGABLE_TOOLS:
        sys.exit(0)

    # Generate summary and log
    summary = get_tool_summary(tool_name, tool_input, tool_result)
    log_to_beads(tool_name, summary)

    sys.exit(0)


if __name__ == "__main__":
    main()
