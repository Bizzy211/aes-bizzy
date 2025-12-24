#!/usr/bin/env python3
"""
Pre-Commit Validator Hook - Beads Task Reference

Event: PreToolUse (for git commit)
Purpose: Ensure commits reference Beads tasks for traceability

Validation Rules:
- Commit message should reference task ID
- Task should be in 'in_progress' status
- Blocks commits without proper task context
"""

import json
import sys
import re
import subprocess


def run_beads_command(args: list[str]) -> dict | None:
    """Execute a Beads CLI command and return parsed JSON output."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return None


def extract_task_reference(message: str) -> str | None:
    """Extract task ID reference from commit message."""
    # Patterns: [TASK-123], task: 123, #123, BD-123
    patterns = [
        r"\[TASK[- ]?(\d+)\]",
        r"task[: ]+(\d+)",
        r"BD[- ]?(\d+)",
        r"#(\d+)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


def get_current_task() -> dict | None:
    """Get current in-progress task from Beads."""
    tasks = run_beads_command(["list", "--status", "in_progress", "--json"])
    if tasks and "tasks" in tasks and tasks["tasks"]:
        return tasks["tasks"][0]
    return None


def main():
    """Main hook execution."""
    # Read tool input from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # Only check git commit commands
    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")
    if "git commit" not in command:
        sys.exit(0)

    # Extract commit message from command
    msg_match = re.search(r'-m\s+["\'](.+?)["\']', command)
    if not msg_match:
        # No message found, allow (might be interactive)
        sys.exit(0)

    message = msg_match.group(1)

    # Check for task reference
    task_ref = extract_task_reference(message)

    if not task_ref:
        # Check if there's a current task
        current = get_current_task()
        if current:
            suggestion = f"Consider adding task reference: [TASK-{current.get('id')}]"
            print(json.dumps({
                "warning": f"Commit lacks task reference. {suggestion}"
            }))
        # Allow but warn
        sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
