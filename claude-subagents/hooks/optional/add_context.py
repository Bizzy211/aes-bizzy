#!/usr/bin/env python3
"""
Add Context Hook - Dynamic Context Injection

Event: PreToolUse / UserPromptSubmit
Purpose: Add relevant context from Beads to tool calls

Context Types:
- Current task information
- Recent conversation context
- Project-specific context
"""

import json
import sys
import subprocess
import os


def run_beads_command(args: list[str]) -> dict | None:
    """Execute a Beads CLI command and return parsed JSON output."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout:
            return json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return None


def get_current_context() -> dict:
    """Gather current context from Beads."""
    context = {
        "current_task": None,
        "project_meta": None,
        "recent_notes": []
    }

    # Get current/in-progress task
    tasks = run_beads_command(["list", "--status", "in_progress", "--json"])
    if tasks and "tasks" in tasks and tasks["tasks"]:
        context["current_task"] = {
            "id": tasks["tasks"][0].get("id"),
            "title": tasks["tasks"][0].get("title"),
            "status": tasks["tasks"][0].get("status")
        }

    # Get project metadata if available
    meta_path = ".beads/project-meta.json"
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r") as f:
                context["project_meta"] = json.load(f)
        except (json.JSONDecodeError, IOError):
            pass

    return context


def format_context_string(context: dict) -> str:
    """Format context into a readable string."""
    lines = []

    if context.get("current_task"):
        task = context["current_task"]
        lines.append(f"Current Task: [{task['id']}] {task['title']}")

    if context.get("project_meta"):
        meta = context["project_meta"]
        if "name" in meta:
            lines.append(f"Project: {meta['name']}")

    return "\n".join(lines) if lines else ""


def main():
    """Main hook execution."""
    # Check if Beads is initialized
    if not os.path.exists(".beads"):
        sys.exit(0)

    # Read input
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        print(input_data)
        sys.exit(0)

    # Get context
    context = get_current_context()
    context_str = format_context_string(context)

    if context_str:
        # Add context to data
        if "context" not in data:
            data["context"] = {}
        data["context"]["beads"] = context
        data["context"]["beads_formatted"] = context_str

        print(json.dumps(data))
    else:
        print(json.dumps(data))

    sys.exit(0)


if __name__ == "__main__":
    main()
