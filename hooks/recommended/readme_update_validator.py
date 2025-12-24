#!/usr/bin/env python3
"""
README Update Validator Hook - Documentation Consistency

Event: PostToolUse (for Write/Edit on code files)
Purpose: Remind to update README when significant changes are made

Detection Patterns:
- New CLI commands added
- Environment variables added
- API endpoints created
- Major features implemented
"""

import json
import sys
import re
import os


# Patterns that suggest README should be updated
SIGNIFICANT_PATTERNS = [
    # CLI commands
    (r"\.command\s*\(\s*['\"]", "New CLI command added"),
    (r"program\.(option|command)", "CLI configuration changed"),

    # Environment variables
    (r"process\.env\.(\w+)", "New environment variable used"),
    (r"getenv\s*\(\s*['\"](\w+)['\"]", "New environment variable used"),

    # API endpoints
    (r"(router|app)\.(get|post|put|delete)\s*\(\s*['\"]", "New API endpoint"),

    # Package.json scripts
    (r'"scripts"\s*:', "Package scripts modified"),
]


def check_for_significant_changes(content: str, file_path: str) -> list[str]:
    """Check if changes suggest README should be updated."""
    suggestions = []

    # Only check certain file types
    if not any(file_path.endswith(ext) for ext in [".ts", ".js", ".py", ".json"]):
        return suggestions

    for pattern, description in SIGNIFICANT_PATTERNS:
        if re.search(pattern, content):
            suggestions.append(description)

    return list(set(suggestions))  # Deduplicate


def readme_exists() -> bool:
    """Check if README exists in project."""
    candidates = ["README.md", "readme.md", "README.txt", "README"]
    return any(os.path.exists(c) for c in candidates)


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

    # Skip README itself
    if "readme" in file_path.lower():
        sys.exit(0)

    content = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not content:
        sys.exit(0)

    suggestions = check_for_significant_changes(content, file_path)

    if suggestions and readme_exists():
        result = {
            "info": "Consider updating README.md",
            "reasons": suggestions,
            "suggestion": "Document the changes for users"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
