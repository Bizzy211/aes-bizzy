#!/usr/bin/env python3
"""
Post Task Complete Hook - Heimdall Memory Storage

Event: PostToolUse (triggered when TaskMaster set_task_status is called with status=done)
Purpose: Store task completion details as lessons learned in Heimdall

This hook captures:
- Task title and description
- Implementation details
- What was learned during implementation
- Technologies used
"""

import sys
import json
from datetime import datetime
from typing import Optional, Dict, Any

from .utils import (
    store_memory,
    generate_standard_tags,
    extract_tech_from_content,
    parse_hook_input,
    safe_hook_execution,
    log_hook_error,
    is_heimdall_ready,
)


def is_task_completion_event(data: Dict[str, Any]) -> bool:
    """Check if this is a TaskMaster task completion event."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # Check for mcp__task-master-ai__set_task_status
    if "set_task_status" in tool_name or "task-master" in tool_name:
        status = tool_input.get("status", "")
        return status == "done"

    return False


def extract_task_info(data: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Extract task information from the event data."""
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    task_id = tool_input.get("id", "")
    if not task_id:
        return None

    # Try to get task details from result
    result_data = tool_result.get("data", {})
    tasks = result_data.get("tasks", [])

    task_info = {
        "task_id": task_id,
        "title": "",
        "description": "",
        "details": "",
    }

    # If we have task info in the result, use it
    if tasks and len(tasks) > 0:
        task = tasks[0]
        task_info["title"] = task.get("title", f"Task {task_id}")
        task_info["description"] = task.get("description", "")
        task_info["details"] = task.get("details", "")

    return task_info


def create_task_memory_content(task_info: Dict[str, str]) -> str:
    """Create memory content from task information."""
    content_parts = [
        f"# Task Completed: {task_info.get('title', 'Unknown Task')}",
        "",
    ]

    if task_info.get("description"):
        content_parts.extend([
            "## Description",
            task_info["description"],
            "",
        ])

    if task_info.get("details"):
        content_parts.extend([
            "## Implementation Details",
            task_info["details"],
            "",
        ])

    content_parts.extend([
        f"## Completion",
        f"Completed at: {datetime.now().isoformat()}",
        f"Task ID: {task_info.get('task_id', 'unknown')}",
    ])

    return "\n".join(content_parts)


@safe_hook_execution
def main():
    """Main hook execution."""
    # Check if Heimdall is ready
    if not is_heimdall_ready():
        sys.exit(0)

    # Parse input
    data = parse_hook_input()
    if not data:
        sys.exit(0)

    # Check if this is a task completion event
    if not is_task_completion_event(data):
        sys.exit(0)

    # Extract task info
    task_info = extract_task_info(data)
    if not task_info:
        sys.exit(0)

    # Create memory content
    content = create_task_memory_content(task_info)

    # Detect technologies from content
    tech_stack = extract_tech_from_content(content)

    # Generate tags
    tags = generate_standard_tags(
        task_id=task_info.get("task_id"),
        memory_type="lesson",
        tech_stack=tech_stack,
        additional_tags=["task-complete", "implementation"],
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="lesson",
        task_id=task_info.get("task_id"),
    )

    if not result.get("success"):
        log_hook_error("post_task_complete", result.get("error", "Unknown error"))

    sys.exit(0)


if __name__ == "__main__":
    main()
