#!/usr/bin/env python3
"""
Session Start Hook - Heimdall Context Loading

Event: SessionStart (triggered at session initialization)
Purpose: Load relevant context from Heimdall memory at session start

This hook:
- Queries Heimdall for project-related memories
- Loads recent lessons and patterns
- Displays relevant context to the agent
"""

import sys
import os
from datetime import datetime
from typing import Dict, Any, List

from .utils import (
    query_memories,
    get_project_name,
    safe_hook_execution,
    log_hook_error,
    is_heimdall_ready,
    construct_tag,
)


def load_project_context(project_name: str) -> List[Dict[str, Any]]:
    """Load memories related to the current project."""
    result = query_memories(
        query=f"project context for {project_name}",
        limit=5,
        tags=[construct_tag("PROJECT", project_name)],
    )

    return result.get("memories", [])


def load_recent_lessons() -> List[Dict[str, Any]]:
    """Load recent lessons learned."""
    result = query_memories(
        query="recent lessons and patterns",
        limit=5,
        memory_type="lesson",
    )

    return result.get("memories", [])


def load_error_resolutions() -> List[Dict[str, Any]]:
    """Load recent error resolutions."""
    result = query_memories(
        query="error resolutions and fixes",
        limit=3,
        memory_type="error",
    )

    return result.get("memories", [])


def format_memory_summary(memories: List[Dict[str, Any]], title: str) -> str:
    """Format memories into a readable summary."""
    if not memories:
        return ""

    lines = [
        f"\n{title}",
        "-" * len(title),
    ]

    for mem in memories[:5]:
        content = mem.get("content", "")
        # Get first line or first 100 chars
        preview = content.split("\n")[0][:100]
        if len(preview) < len(content.split("\n")[0]):
            preview += "..."

        mem_type = mem.get("memoryType", "memory")
        relevance = mem.get("relevanceScore", 0)
        relevance_pct = int(relevance * 100) if relevance else 0

        lines.append(f"  [{mem_type}] {preview}")
        if relevance_pct > 0:
            lines.append(f"    Relevance: {relevance_pct}%")

    return "\n".join(lines)


@safe_hook_execution
def main():
    """Main hook execution."""
    # Check if Heimdall is ready
    if not is_heimdall_ready():
        # Silently exit - don't print anything if Heimdall isn't set up
        sys.exit(0)

    project_name = get_project_name()

    # Load various memory types
    project_context = load_project_context(project_name)
    recent_lessons = load_recent_lessons()
    error_resolutions = load_error_resolutions()

    # Only print if we have context to show
    has_context = any([project_context, recent_lessons, error_resolutions])

    if not has_context:
        sys.exit(0)

    # Print context summary
    print("=" * 60)
    print("HEIMDALL CONTEXT LOADED")
    print("=" * 60)
    print(f"\nProject: {project_name}")
    print(f"Session started: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    if project_context:
        print(format_memory_summary(project_context, "Project Memories"))

    if recent_lessons:
        print(format_memory_summary(recent_lessons, "Recent Lessons"))

    if error_resolutions:
        print(format_memory_summary(error_resolutions, "Error Resolutions"))

    print("\n" + "=" * 60)
    print("Use `aes-bizzy memory search <query>` for more context")
    print("=" * 60)

    sys.exit(0)


if __name__ == "__main__":
    main()
