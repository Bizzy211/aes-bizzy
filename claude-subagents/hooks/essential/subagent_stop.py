#!/usr/bin/env python3
"""
Sub-Agent Stop Hook - Beads Handoff Logging

Event: SubAgentStop
Purpose: Log handoff information when a sub-agent completes

Beads Integration:
- Records which agent completed work
- Logs handoff context for continuity
- Updates task status if work completed
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
                return {"success": True, "output": result.stdout}
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def log_handoff(agent_type: str, result_summary: str, task_id: str = None):
    """Log agent handoff to Beads context."""
    timestamp = datetime.now().isoformat()

    handoff_entry = {
        "timestamp": timestamp,
        "agent": agent_type,
        "summary": result_summary[:200],
        "task_id": task_id
    }

    # Save handoff log
    key = f"handoff-{agent_type}-{datetime.now().strftime('%H%M%S')}"
    run_beads_command(["set", key, json.dumps(handoff_entry)])

    # If task_id provided, update the task
    if task_id:
        note = f"[{agent_type}] Completed: {result_summary[:100]}"
        run_beads_command(["update", task_id, "--add-note", note, "--json"])


def extract_summary(result_data: dict) -> str:
    """Extract a summary from agent result."""
    # Try common result fields
    if "summary" in result_data:
        return result_data["summary"]
    if "message" in result_data:
        return result_data["message"]
    if "result" in result_data:
        result = result_data["result"]
        if isinstance(result, str):
            return result[:200]

    # Default summary
    return "Agent completed work"


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Read agent result from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    agent_type = data.get("subagent_type", "unknown")
    result_data = data.get("result", {})
    task_id = data.get("task_id")  # If passed from agent context

    # Extract summary
    summary = extract_summary(result_data)

    # Log the handoff
    log_handoff(agent_type, summary, task_id)

    print(f"Logged handoff from {agent_type}")
    sys.exit(0)


if __name__ == "__main__":
    main()
