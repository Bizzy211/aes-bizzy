#!/usr/bin/env python3
"""
Pre-Compact Hook - Context Save Before Compaction

Event: PreCompact (called before context window is compacted)
Purpose: Save important context before it's compressed or discarded

Context Preservation:
- Saves current working state to .beads/
- Extracts key decisions and findings
- Preserves task progress notes
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


def save_context_snapshot():
    """Save a snapshot of current context before compaction."""
    snapshot = {
        "timestamp": datetime.now().isoformat(),
        "event": "pre_compact",
        "tasks": [],
        "notes": []
    }

    # Get current tasks
    tasks = run_beads_command(["list", "--json"])
    if tasks and "tasks" in tasks:
        snapshot["tasks"] = [
            {
                "id": t.get("id"),
                "title": t.get("title"),
                "status": t.get("status"),
                "assigned": t.get("assigned")
            }
            for t in tasks["tasks"][:10]  # Keep top 10
        ]

    # Save snapshot to file
    snapshot_path = f".beads/snapshots/pre-compact-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    os.makedirs(os.path.dirname(snapshot_path), exist_ok=True)

    try:
        with open(snapshot_path, "w") as f:
            json.dump(snapshot, f, indent=2)
    except (IOError, OSError):
        pass


def log_compaction():
    """Log that compaction occurred."""
    run_beads_command([
        "set",
        f"compaction-{datetime.now().strftime('%H%M%S')}",
        "Context compaction occurred - snapshot saved"
    ])


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Save context snapshot
    save_context_snapshot()

    # Log the compaction event
    log_compaction()

    # Sync to ensure everything is saved
    run_beads_command(["sync"])

    sys.exit(0)


if __name__ == "__main__":
    main()
