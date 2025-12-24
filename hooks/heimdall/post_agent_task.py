#!/usr/bin/env python3
"""
Post Agent Task Hook - Heimdall Memory Storage

Event: SubagentStop (triggered when a sub-agent completes its work)
Purpose: Store agent session lessons and patterns in Heimdall

This hook captures:
- Agent type and work summary
- Patterns discovered during work
- Decisions made
- Lessons learned
"""

import sys
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

from .utils import (
    store_memory,
    generate_standard_tags,
    extract_tech_from_content,
    parse_hook_input,
    safe_hook_execution,
    log_hook_error,
    is_heimdall_ready,
)


def extract_agent_info(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract agent information from the event data."""
    # SubagentStop event format
    agent_type = data.get("subagent_type", data.get("agent_type", ""))
    result = data.get("result", data.get("output", ""))
    task_description = data.get("task", data.get("prompt", ""))

    if not agent_type:
        return None

    return {
        "agent_type": agent_type,
        "result": result if isinstance(result, str) else json.dumps(result, indent=2),
        "task": task_description,
        "duration": data.get("duration", ""),
    }


def extract_lessons_from_result(result: str) -> List[str]:
    """Extract potential lessons from agent result."""
    lessons = []

    # Look for common patterns indicating lessons
    lesson_indicators = [
        "learned",
        "discovered",
        "found that",
        "realized",
        "important to",
        "should always",
        "should never",
        "best practice",
        "pattern",
        "solution was",
        "fixed by",
        "resolved by",
    ]

    lines = result.split("\n")
    for line in lines:
        line_lower = line.lower()
        if any(indicator in line_lower for indicator in lesson_indicators):
            # Clean up the line
            clean_line = line.strip()
            if clean_line and len(clean_line) > 20:
                lessons.append(clean_line)

    return lessons[:5]  # Return top 5 lessons


def create_agent_memory_content(agent_info: Dict[str, Any]) -> str:
    """Create memory content from agent information."""
    content_parts = [
        f"# Agent Session: {agent_info.get('agent_type', 'Unknown Agent')}",
        "",
    ]

    if agent_info.get("task"):
        content_parts.extend([
            "## Task",
            agent_info["task"][:500],  # Limit task length
            "",
        ])

    if agent_info.get("result"):
        # Extract key lessons
        lessons = extract_lessons_from_result(agent_info["result"])
        if lessons:
            content_parts.extend([
                "## Key Insights",
            ])
            for lesson in lessons:
                content_parts.append(f"- {lesson[:200]}")
            content_parts.append("")

        # Add summary of result (truncated)
        result_summary = agent_info["result"][:1000]
        if len(agent_info["result"]) > 1000:
            result_summary += "..."

        content_parts.extend([
            "## Result Summary",
            result_summary,
            "",
        ])

    content_parts.extend([
        "## Session Info",
        f"Agent: {agent_info.get('agent_type', 'unknown')}",
        f"Completed: {datetime.now().isoformat()}",
    ])

    if agent_info.get("duration"):
        content_parts.append(f"Duration: {agent_info['duration']}")

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

    # Extract agent info
    agent_info = extract_agent_info(data)
    if not agent_info:
        sys.exit(0)

    # Create memory content
    content = create_agent_memory_content(agent_info)

    # Detect technologies from content
    tech_stack = extract_tech_from_content(content)

    # Generate tags
    tags = generate_standard_tags(
        agent_name=agent_info.get("agent_type"),
        memory_type="lesson",
        tech_stack=tech_stack,
        additional_tags=["agent-session", "subagent-work"],
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="lesson",
        agent_name=agent_info.get("agent_type"),
    )

    if not result.get("success"):
        log_hook_error("post_agent_task", result.get("error", "Unknown error"))

    sys.exit(0)


if __name__ == "__main__":
    main()
