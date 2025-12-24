#!/usr/bin/env python3
"""
Task Handoff Hook - Beads-Based Agent Handoff

Event: SubAgentStop / custom trigger
Purpose: Manage task handoffs between agents using Beads

Handoff Features:
- Log handoff context
- Update task assignments
- Track handoff chain
"""

import json
import sys
import subprocess
import os
from datetime import datetime


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
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"success": True}
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def log_handoff(from_agent: str, to_agent: str, task_id: str, context: str):
    """Log a handoff in Beads."""
    timestamp = datetime.now().isoformat()

    handoff_data = {
        "timestamp": timestamp,
        "from": from_agent,
        "to": to_agent,
        "task_id": task_id,
        "context": context[:500],  # Limit context size
    }

    # Store handoff in Beads
    key = f"handoff-{timestamp.replace(':', '-')}"
    run_beads_command(["set", key, json.dumps(handoff_data)])

    # Add note to task if provided
    if task_id:
        note = f"Handoff: {from_agent} -> {to_agent}: {context[:100]}"
        run_beads_command(["update", task_id, "--add-note", note, "--json"])

    # Append to handoff log file
    log_path = ".beads/handoff-log.jsonl"
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(handoff_data) + "\n")
    except IOError:
        pass


def get_handoff_chain(task_id: str) -> list[dict]:
    """Get the handoff chain for a task."""
    chain = []

    log_path = ".beads/handoff-log.jsonl"
    if not os.path.exists(log_path):
        return chain

    try:
        with open(log_path, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("task_id") == task_id:
                        chain.append(entry)
                except json.JSONDecodeError:
                    pass
    except IOError:
        pass

    return chain


def update_task_assignment(task_id: str, new_agent: str):
    """Update task assignment in Beads."""
    # This would ideally use bd update with --assign flag
    # For now, add a note
    run_beads_command([
        "update", task_id,
        "--add-note", f"Assigned to: {new_agent}",
        "--json"
    ])


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Read handoff data from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    # Extract handoff information
    from_agent = data.get("from_agent", "unknown")
    to_agent = data.get("to_agent", "")
    task_id = data.get("task_id", "")
    context = data.get("context", "")

    if not to_agent:
        # No handoff target, just log completion
        log_handoff(from_agent, "completed", task_id, context)
        print(json.dumps({"status": "logged", "action": "completed"}))
    else:
        # Log handoff
        log_handoff(from_agent, to_agent, task_id, context)

        # Update assignment
        if task_id:
            update_task_assignment(task_id, to_agent)

        print(json.dumps({
            "status": "handed_off",
            "from": from_agent,
            "to": to_agent,
            "task_id": task_id
        }))

    sys.exit(0)


if __name__ == "__main__":
    main()
