#!/usr/bin/env python3
"""
Timestamp Validator Hook - Date/Time Handling Validation

Event: PostToolUse (for Write/Edit)
Purpose: Validate proper timestamp handling in code

Validation Rules:
- Use ISO 8601 format for timestamps
- Include timezone information
- Avoid Date.now() without proper handling
"""

import json
import sys
import re
import os


# Timestamp patterns to check
TIMESTAMP_ISSUES = [
    # Raw Date.now() without proper handling
    (
        r"Date\.now\(\)(?!\s*[.,])",
        "Date.now() may lose precision - consider storing as Date object"
    ),

    # Hardcoded date strings
    (
        r"['\"](\d{1,2}[-/]\d{1,2}[-/]\d{2,4})['\"]",
        "Ambiguous date format - use ISO 8601 (YYYY-MM-DD)"
    ),

    # Date without timezone
    (
        r"new\s+Date\(\s*['\"][^'\"]+['\"]\s*\)(?!.*[Zz]|.*[+-]\d{2})",
        "Date string may lack timezone - include 'Z' or offset"
    ),

    # toLocaleString for storage
    (
        r"toLocaleString\(\).*(?:store|save|insert|db)",
        "toLocaleString() varies by locale - use toISOString() for storage"
    ),
]

# Good patterns (for documentation)
GOOD_PATTERNS = [
    r"new\s+Date\(\)\.toISOString\(\)",
    r"ISO\s*8601",
    r"toISOString\(\)",
]


def check_timestamp_issues(content: str) -> list[str]:
    """Check for timestamp handling issues."""
    warnings = []

    for pattern, message in TIMESTAMP_ISSUES:
        matches = list(re.finditer(pattern, content, re.IGNORECASE))
        if matches:
            line = content[:matches[0].start()].count("\n") + 1
            warnings.append(f"{message} (line ~{line})")

    return warnings


def is_time_related_file(path: str) -> bool:
    """Check if file likely deals with timestamps."""
    time_patterns = ["date", "time", "timestamp", "calendar", "schedule"]
    path_lower = path.lower()
    return any(p in path_lower for p in time_patterns)


def main():
    """Main hook execution."""
    # Read tool input from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")

    # Only check JS/TS files
    if not file_path.endswith((".ts", ".js", ".tsx", ".jsx")):
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, "r") as f:
            content = f.read()
    except IOError:
        sys.exit(0)

    warnings = check_timestamp_issues(content)

    if warnings:
        result = {
            "warning": "Timestamp handling suggestions",
            "issues": warnings[:3],
            "suggestion": "Use ISO 8601 format with timezone for consistency"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
