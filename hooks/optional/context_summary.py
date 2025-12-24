#!/usr/bin/env python3
"""
Context Summary Hook - Session Summary Generation

Event: Stop / PreCompact
Purpose: Generate a summary of the session's context

Summary Includes:
- Tasks worked on
- Files modified
- Key decisions made
- Pending items
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
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return None


def get_session_tasks() -> list[dict]:
    """Get tasks that were worked on in this session."""
    tasks = []

    # Get in-progress tasks
    in_progress = run_beads_command(["list", "--status", "in_progress", "--json"])
    if in_progress and "tasks" in in_progress:
        tasks.extend(in_progress["tasks"])

    # Get recently done tasks
    done = run_beads_command(["list", "--status", "done", "--json"])
    if done and "tasks" in done:
        # Filter to recent ones (would need timestamp)
        tasks.extend(done["tasks"][:3])

    return tasks


def get_modified_files() -> list[str]:
    """Get files modified in this session (via git)."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD~5"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return result.stdout.strip().split("\n")[:10]
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return []


def generate_summary() -> dict:
    """Generate a comprehensive session summary."""
    summary = {
        "timestamp": datetime.now().isoformat(),
        "tasks_worked_on": [],
        "files_modified": [],
        "pending_items": []
    }

    # Tasks
    tasks = get_session_tasks()
    for task in tasks:
        summary["tasks_worked_on"].append({
            "id": task.get("id"),
            "title": task.get("title"),
            "status": task.get("status")
        })

    # Files
    summary["files_modified"] = get_modified_files()

    # Pending
    ready = run_beads_command(["ready", "--json"])
    if ready and "tasks" in ready:
        for task in ready["tasks"][:5]:
            summary["pending_items"].append({
                "id": task.get("id"),
                "title": task.get("title")
            })

    return summary


def save_summary(summary: dict):
    """Save summary to file."""
    os.makedirs(".beads/summaries", exist_ok=True)

    filename = f"session-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    path = f".beads/summaries/{filename}"

    try:
        with open(path, "w") as f:
            json.dump(summary, f, indent=2)
    except IOError:
        pass


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    summary = generate_summary()
    save_summary(summary)

    # Print summary for user
    print("=" * 60)
    print("SESSION SUMMARY")
    print("=" * 60)

    if summary["tasks_worked_on"]:
        print("\nTasks Worked On:")
        for task in summary["tasks_worked_on"]:
            print(f"  [{task['id']}] {task['title']} ({task['status']})")

    if summary["files_modified"]:
        print(f"\nFiles Modified ({len(summary['files_modified'])}):")
        for f in summary["files_modified"][:5]:
            print(f"  {f}")

    if summary["pending_items"]:
        print("\nPending Items:")
        for item in summary["pending_items"]:
            print(f"  [{item['id']}] {item['title']}")

    print("=" * 60)

    sys.exit(0)


if __name__ == "__main__":
    main()
