#!/usr/bin/env python3
"""
Session Stop Hook - CRITICAL Beads Sync

Event: Stop
Purpose: Sync Beads context before session ends to preserve task state

CRITICAL: This hook ensures all task progress is saved before Claude stops.
Without this, task context would be lost between sessions.

Beads Integration:
- Runs `bd sync` to save all context to .beads/
- Ensures task assignments and notes are persisted
- Logs session summary before exit
"""

import subprocess
import json
import sys
import os
from datetime import datetime


def run_beads_command(args: list[str], capture_output: bool = True) -> dict | None:
    """Execute a Beads CLI command and return parsed JSON output."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=capture_output,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            if capture_output and result.stdout:
                try:
                    return json.loads(result.stdout)
                except json.JSONDecodeError:
                    return {"success": True, "output": result.stdout}
            return {"success": True}
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def get_session_stats() -> dict:
    """Get statistics about the current session's work."""
    stats = {
        "tasks_completed": 0,
        "tasks_in_progress": 0,
        "notes_added": 0
    }

    # Get task list
    tasks = run_beads_command(["list", "--json"])
    if tasks and "tasks" in tasks:
        for task in tasks["tasks"]:
            status = task.get("status", "")
            if status == "done":
                stats["tasks_completed"] += 1
            elif status == "in_progress":
                stats["tasks_in_progress"] += 1

    return stats


def sync_beads() -> bool:
    """Sync Beads context to disk."""
    result = run_beads_command(["sync"])
    return result is not None and result.get("success", False)


def log_session_end(stats: dict):
    """Log session end summary."""
    timestamp = datetime.now().isoformat()

    log_entry = {
        "event": "session_end",
        "timestamp": timestamp,
        "stats": stats
    }

    # Append to session log
    log_path = ".beads/session-log.jsonl"
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except (IOError, OSError):
        pass  # Non-critical logging


def main():
    """Main hook execution - CRITICAL sync operation."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Get session stats before sync
    stats = get_session_stats()

    # CRITICAL: Sync Beads context
    sync_success = sync_beads()

    if sync_success:
        print("=" * 60)
        print("BEADS CONTEXT SYNCED")
        print("=" * 60)
        print(f"  Tasks completed: {stats['tasks_completed']}")
        print(f"  Tasks in progress: {stats['tasks_in_progress']}")
        print("  Context saved to .beads/")
        print("=" * 60)
    else:
        print("WARNING: Beads sync failed - context may not be preserved")
        sys.exit(1)  # Non-zero to indicate issue

    # Log session end
    log_session_end(stats)

    sys.exit(0)


if __name__ == "__main__":
    main()
