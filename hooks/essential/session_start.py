#!/usr/bin/env python3
"""
Session Start Hook - Beads Context Loading

Event: SessionStart (custom event triggered at session initialization)
Purpose: Load Beads context at session start to restore task state

Beads Integration:
- Runs `bd ready --json` to load current task queue
- Restores session context from previous work
- Sets up task tracking for the session
"""

import subprocess
import json
import sys
import os


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


def load_beads_context() -> dict:
    """Load current Beads context including ready tasks and stale items."""
    context = {
        "ready_tasks": [],
        "stale_tasks": [],
        "session_restored": False
    }

    # Get ready tasks
    ready = run_beads_command(["ready", "--json"])
    if ready and "tasks" in ready:
        context["ready_tasks"] = ready["tasks"]

    # Get stale tasks (forgotten items)
    stale = run_beads_command(["stale", "--days", "3", "--json"])
    if stale and "tasks" in stale:
        context["stale_tasks"] = stale["tasks"]

    context["session_restored"] = bool(context["ready_tasks"] or context["stale_tasks"])

    return context


def format_task_summary(tasks: list) -> str:
    """Format tasks into a readable summary."""
    if not tasks:
        return "  None"

    lines = []
    for task in tasks[:5]:  # Show first 5
        status = task.get("status", "unknown")
        title = task.get("title", "Untitled")
        task_id = task.get("id", "?")
        assigned = task.get("assigned", "unassigned")
        lines.append(f"  [{task_id}] {title} ({status}) -> {assigned}")

    if len(tasks) > 5:
        lines.append(f"  ... and {len(tasks) - 5} more tasks")

    return "\n".join(lines)


def main():
    """Main hook execution."""
    # Only run if Beads is initialized
    if not os.path.exists(".beads"):
        # No Beads directory, skip
        sys.exit(0)

    context = load_beads_context()

    if context["session_restored"]:
        print("=" * 60)
        print("BEADS SESSION CONTEXT RESTORED")
        print("=" * 60)

        if context["ready_tasks"]:
            print(f"\nReady Tasks ({len(context['ready_tasks'])}):")
            print(format_task_summary(context["ready_tasks"]))

        if context["stale_tasks"]:
            print(f"\nStale Tasks (needs attention):")
            print(format_task_summary(context["stale_tasks"]))

        print("\nUse `bd ready --json` for full task list")
        print("=" * 60)

    sys.exit(0)


if __name__ == "__main__":
    main()
