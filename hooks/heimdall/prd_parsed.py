#!/usr/bin/env python3
"""
PRD Parsed Hook - Heimdall Memory Storage

Event: PostToolUse (triggered when TaskMaster parse_prd is called)
Purpose: Store PRD parsing context in Heimdall for project understanding

This hook captures:
- PRD file content summary
- Generated tasks overview
- Project requirements
- Technology decisions
"""

import sys
import json
import os
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
    get_project_name,
)


def is_prd_parsed_event(data: Dict[str, Any]) -> bool:
    """Check if this is a PRD parsing event."""
    tool_name = data.get("tool_name", "")
    return "parse_prd" in tool_name.lower() or "parse-prd" in tool_name.lower()


def extract_prd_info(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract PRD information from the event data."""
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    prd_info = {
        "input_file": tool_input.get("input", ""),
        "tasks_generated": 0,
        "task_titles": [],
        "project_name": get_project_name(),
    }

    # Try to extract task info from result
    result_data = tool_result.get("data", {})

    if isinstance(result_data, dict):
        tasks = result_data.get("tasks", [])
        prd_info["tasks_generated"] = len(tasks)
        prd_info["task_titles"] = [t.get("title", "") for t in tasks[:20]]

    return prd_info


def load_prd_content(prd_path: str) -> str:
    """Load and summarize PRD content."""
    if not prd_path or not os.path.exists(prd_path):
        return ""

    try:
        with open(prd_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Return first 2000 chars as summary
        if len(content) > 2000:
            return content[:2000] + "...\n[Content truncated]"
        return content

    except (IOError, UnicodeDecodeError):
        return ""


def extract_requirements(prd_content: str) -> List[str]:
    """Extract key requirements from PRD content."""
    requirements = []

    # Common requirement patterns
    patterns = [
        "must ",
        "should ",
        "will ",
        "need to ",
        "required to ",
        "requirement:",
        "- [ ]",  # Checkbox items often are requirements
    ]

    lines = prd_content.split("\n")
    for line in lines:
        line_lower = line.lower().strip()
        if any(p in line_lower for p in patterns):
            clean_line = line.strip()
            if clean_line and len(clean_line) > 10 and len(clean_line) < 200:
                requirements.append(clean_line)

    return requirements[:20]  # Return top 20 requirements


def create_prd_memory_content(prd_info: Dict[str, Any], prd_content: str) -> str:
    """Create memory content from PRD parsing."""
    content_parts = [
        f"# PRD Parsed: {prd_info.get('project_name', 'Unknown Project')}",
        "",
    ]

    if prd_info.get("input_file"):
        content_parts.extend([
            f"## Source: {prd_info['input_file']}",
            "",
        ])

    # Add task summary
    if prd_info.get("tasks_generated"):
        content_parts.extend([
            f"## Tasks Generated: {prd_info['tasks_generated']}",
            "",
        ])

        titles = prd_info.get("task_titles", [])
        if titles:
            content_parts.append("### Task Overview")
            for i, title in enumerate(titles[:15], 1):
                content_parts.append(f"{i}. {title}")
            if len(titles) > 15:
                content_parts.append(f"... and {len(titles) - 15} more tasks")
            content_parts.append("")

    # Add extracted requirements
    requirements = extract_requirements(prd_content)
    if requirements:
        content_parts.extend([
            "## Key Requirements",
        ])
        for req in requirements[:10]:
            content_parts.append(f"- {req}")
        content_parts.append("")

    # Add PRD content summary
    if prd_content:
        content_parts.extend([
            "## PRD Summary",
            "```",
            prd_content[:1500] if len(prd_content) > 1500 else prd_content,
            "```",
            "",
        ])

    content_parts.extend([
        "## Metadata",
        f"Parsed at: {datetime.now().isoformat()}",
        f"Project: {prd_info.get('project_name', 'unknown')}",
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

    # Check if this is a PRD parsed event
    if not is_prd_parsed_event(data):
        sys.exit(0)

    # Extract PRD info
    prd_info = extract_prd_info(data)
    if not prd_info:
        sys.exit(0)

    # Load PRD content if available
    prd_content = load_prd_content(prd_info.get("input_file", ""))

    # Create memory content
    content = create_prd_memory_content(prd_info, prd_content)

    # Detect technologies
    tech_stack = extract_tech_from_content(content + " " + prd_content)

    # Generate tags
    tags = generate_standard_tags(
        memory_type="context",
        tech_stack=tech_stack,
        additional_tags=[
            "prd",
            "project-requirements",
            "planning",
            f"tasks:{prd_info.get('tasks_generated', 0)}",
        ],
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="context",
    )

    if not result.get("success"):
        log_hook_error("prd_parsed", result.get("error", "Unknown error"))

    sys.exit(0)


if __name__ == "__main__":
    main()
