#!/usr/bin/env python3
"""
Session End Hook - Heimdall Session Summary Storage

Event: Stop (triggered when the session ends)
Purpose: Store session summary in Heimdall for future reference

This hook captures:
- Session duration
- Key activities performed
- Lessons learned during session
- Files modified
"""

import sys
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

from .utils import (
    store_memory,
    generate_standard_tags,
    extract_tech_from_content,
    parse_hook_input,
    safe_hook_execution,
    log_hook_error,
    is_heimdall_ready,
    get_project_name,
)


# Track session data file location
SESSION_DATA_FILE = ".heimdall/current-session.json"


def load_session_data() -> Optional[Dict[str, Any]]:
    """Load session data from tracking file."""
    try:
        if os.path.exists(SESSION_DATA_FILE):
            with open(SESSION_DATA_FILE) as f:
                return json.load(f)
    except (IOError, json.JSONDecodeError):
        pass
    return None


def clear_session_data():
    """Clear session data file."""
    try:
        if os.path.exists(SESSION_DATA_FILE):
            os.remove(SESSION_DATA_FILE)
    except IOError:
        pass


def extract_session_summary(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract session summary from event data."""
    summary = {
        "start_time": data.get("session_start", datetime.now().isoformat()),
        "end_time": datetime.now().isoformat(),
        "conversation_turns": data.get("conversation_turns", 0),
        "tools_used": data.get("tools_used", []),
        "files_modified": data.get("files_modified", []),
        "tasks_completed": data.get("tasks_completed", []),
    }

    # Try to load from session data file
    session_data = load_session_data()
    if session_data:
        summary.update(session_data)

    return summary


def calculate_duration(start_time: str, end_time: str) -> str:
    """Calculate human-readable duration."""
    try:
        start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        delta = end - start

        hours, remainder = divmod(int(delta.total_seconds()), 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    except (ValueError, TypeError):
        return "unknown"


def create_session_memory_content(summary: Dict[str, Any]) -> str:
    """Create memory content from session summary."""
    project_name = get_project_name()
    duration = calculate_duration(
        summary.get("start_time", ""),
        summary.get("end_time", "")
    )

    content_parts = [
        f"# Session Summary: {project_name}",
        "",
        "## Session Info",
        f"- Duration: {duration}",
        f"- Started: {summary.get('start_time', 'unknown')}",
        f"- Ended: {summary.get('end_time', 'unknown')}",
    ]

    if summary.get("conversation_turns"):
        content_parts.append(f"- Turns: {summary['conversation_turns']}")

    # Tools used
    tools = summary.get("tools_used", [])
    if tools:
        content_parts.extend([
            "",
            "## Tools Used",
        ])
        tool_counts = {}
        for tool in tools:
            tool_counts[tool] = tool_counts.get(tool, 0) + 1
        for tool, count in sorted(tool_counts.items(), key=lambda x: -x[1])[:10]:
            content_parts.append(f"- {tool}: {count}x")

    # Files modified
    files = summary.get("files_modified", [])
    if files:
        content_parts.extend([
            "",
            f"## Files Modified ({len(files)})",
        ])
        for f in files[:15]:
            content_parts.append(f"- {f}")
        if len(files) > 15:
            content_parts.append(f"- ... and {len(files) - 15} more")

    # Tasks completed
    tasks = summary.get("tasks_completed", [])
    if tasks:
        content_parts.extend([
            "",
            "## Tasks Completed",
        ])
        for task in tasks[:10]:
            task_id = task.get("id", "?")
            title = task.get("title", "Untitled")
            content_parts.append(f"- [{task_id}] {title}")

    # Key activities
    activities = summary.get("key_activities", [])
    if activities:
        content_parts.extend([
            "",
            "## Key Activities",
        ])
        for activity in activities[:10]:
            content_parts.append(f"- {activity}")

    return "\n".join(content_parts)


@safe_hook_execution
def main():
    """Main hook execution."""
    # Check if Heimdall is ready
    if not is_heimdall_ready():
        sys.exit(0)

    # Parse input
    data = parse_hook_input()

    # Extract session summary
    summary = extract_session_summary(data)

    # Only store if we have meaningful data
    if not summary.get("files_modified") and not summary.get("tasks_completed"):
        # Check if session was meaningful
        tools = summary.get("tools_used", [])
        if len(tools) < 5:  # Very short session, skip
            clear_session_data()
            sys.exit(0)

    # Create memory content
    content = create_session_memory_content(summary)

    # Detect technologies from files
    all_files = " ".join(summary.get("files_modified", []))
    tech_stack = extract_tech_from_content(content + " " + all_files)

    # Generate tags
    tags = generate_standard_tags(
        memory_type="context",
        tech_stack=tech_stack,
        additional_tags=["session-summary", "work-log"],
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="context",
        ttl_days=30,  # Session summaries expire after 30 days
    )

    if not result.get("success"):
        log_hook_error("session_end", result.get("error", "Unknown error"))

    # Clean up session data
    clear_session_data()

    sys.exit(0)


if __name__ == "__main__":
    main()
