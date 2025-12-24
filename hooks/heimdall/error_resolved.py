#!/usr/bin/env python3
"""
Error Resolved Hook - Heimdall Memory Storage

Event: PostToolUse (triggered when debugging/fixing activity is detected)
Purpose: Store error resolutions in Heimdall for future reference

This hook captures:
- Error message/type
- Resolution steps taken
- Root cause if identified
- Prevention strategies
"""

import sys
import json
import re
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


# Patterns that indicate error resolution activity
ERROR_INDICATORS = [
    "error",
    "exception",
    "failed",
    "failure",
    "bug",
    "fix",
    "fixed",
    "resolved",
    "debugging",
    "traceback",
    "stack trace",
]

# Tools commonly used in debugging
DEBUG_TOOLS = [
    "Edit",
    "Bash",
]


def is_error_resolution_event(data: Dict[str, Any]) -> bool:
    """Check if this event indicates error resolution."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    # Must be a debug-related tool
    if tool_name not in DEBUG_TOOLS:
        return False

    # Check for error indicators in various places
    content_to_check = [
        json.dumps(tool_input),
        json.dumps(tool_result),
    ]

    combined = " ".join(content_to_check).lower()

    # Count how many error indicators are present
    indicator_count = sum(1 for ind in ERROR_INDICATORS if ind in combined)

    # Also look for fix patterns
    fix_patterns = [
        r"fix(?:ed|ing)?",
        r"resolv(?:ed|ing)?",
        r"debug(?:ged|ging)?",
        r"patch(?:ed|ing)?",
    ]

    for pattern in fix_patterns:
        if re.search(pattern, combined, re.IGNORECASE):
            indicator_count += 1

    # If we have enough indicators, consider it an error resolution
    return indicator_count >= 2


def extract_error_info(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Extract error resolution information from event data."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    tool_result = data.get("tool_result", {})

    error_info = {
        "tool": tool_name,
        "error_type": "",
        "error_message": "",
        "resolution": "",
        "file_path": "",
    }

    # Extract file path if available
    if tool_name == "Edit":
        error_info["file_path"] = tool_input.get("file_path", "")
        error_info["resolution"] = f"Edited {error_info['file_path']}"

        # Check old_string and new_string for error patterns
        old_string = tool_input.get("old_string", "")
        new_string = tool_input.get("new_string", "")

        if old_string and new_string:
            error_info["resolution"] = f"Changed code in {error_info['file_path']}"

    elif tool_name == "Bash":
        command = tool_input.get("command", "")
        result_text = str(tool_result)

        # Look for error messages in command output
        error_patterns = [
            r"(Error:.*?)(?:\n|$)",
            r"(error\[.*?\]:.*?)(?:\n|$)",
            r"(TypeError:.*?)(?:\n|$)",
            r"(SyntaxError:.*?)(?:\n|$)",
            r"(Exception:.*?)(?:\n|$)",
        ]

        for pattern in error_patterns:
            match = re.search(pattern, result_text, re.IGNORECASE)
            if match:
                error_info["error_message"] = match.group(1)[:200]
                break

        error_info["resolution"] = f"Ran command: {command[:100]}"

    # Try to identify error type
    combined = json.dumps(data).lower()
    error_types = ["typeerror", "syntaxerror", "referenceerror", "valueerror", "keyerror"]
    for et in error_types:
        if et in combined:
            error_info["error_type"] = et.replace("error", "Error")
            break

    return error_info


def create_error_memory_content(error_info: Dict[str, Any], data: Dict[str, Any]) -> str:
    """Create memory content from error resolution information."""
    content_parts = [
        "# Error Resolution",
        "",
    ]

    if error_info.get("error_type"):
        content_parts.extend([
            f"## Error Type: {error_info['error_type']}",
            "",
        ])

    if error_info.get("error_message"):
        content_parts.extend([
            "## Error Message",
            f"```",
            error_info["error_message"],
            "```",
            "",
        ])

    if error_info.get("resolution"):
        content_parts.extend([
            "## Resolution",
            error_info["resolution"],
            "",
        ])

    if error_info.get("file_path"):
        content_parts.extend([
            f"## File",
            error_info["file_path"],
            "",
        ])

    content_parts.extend([
        "## Resolution Context",
        f"Tool used: {error_info.get('tool', 'unknown')}",
        f"Resolved at: {datetime.now().isoformat()}",
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

    # Check if this is an error resolution event
    if not is_error_resolution_event(data):
        sys.exit(0)

    # Extract error info
    error_info = extract_error_info(data)
    if not error_info:
        sys.exit(0)

    # Create memory content
    content = create_error_memory_content(error_info, data)

    # Detect technologies
    tech_stack = extract_tech_from_content(content)

    # Add file extension as tech hint
    if error_info.get("file_path"):
        ext = error_info["file_path"].split(".")[-1] if "." in error_info["file_path"] else ""
        ext_tech_map = {
            "ts": "typescript",
            "tsx": "typescript",
            "js": "javascript",
            "jsx": "javascript",
            "py": "python",
        }
        if ext in ext_tech_map and ext_tech_map[ext] not in tech_stack:
            tech_stack.append(ext_tech_map[ext])

    # Generate tags
    additional_tags = ["error-resolution", "debugging"]
    if error_info.get("error_type"):
        additional_tags.append(f"error:{error_info['error_type'].lower()}")

    tags = generate_standard_tags(
        memory_type="error",
        tech_stack=tech_stack,
        additional_tags=additional_tags,
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="error",
    )

    if not result.get("success"):
        log_hook_error("error_resolved", result.get("error", "Unknown error"))

    sys.exit(0)


if __name__ == "__main__":
    main()
