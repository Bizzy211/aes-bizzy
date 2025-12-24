#!/usr/bin/env python3
"""
No Mock Code Hook - Production Code Validation

Event: PreToolUse (for Write/Edit)
Purpose: Prevent mock/placeholder code from entering production

Detection Patterns:
- TODO/FIXME without tracking
- console.log debugging
- Hardcoded test values
- Placeholder functions
"""

import json
import sys
import re


# Patterns indicating mock/placeholder code
MOCK_PATTERNS = [
    # Debug logging
    (r"console\.(log|debug|info)\s*\(", "Debug console.log statement"),

    # TODO/FIXME without issue reference
    (r"//\s*TODO(?![:\s]+#\d|[:\s]+\[)", "TODO without issue reference"),
    (r"//\s*FIXME(?![:\s]+#\d|[:\s]+\[)", "FIXME without issue reference"),

    # Placeholder values
    (r"['\"]TODO['\"]", "Placeholder 'TODO' string"),
    (r"['\"]PLACEHOLDER['\"]", "Placeholder string"),
    (r"['\"]xxx+['\"]", "Placeholder xxx string"),
    (r"['\"]test['\"]", "Hardcoded 'test' value"),

    # Mock implementations
    (r"throw\s+new\s+Error\s*\(\s*['\"]Not implemented", "Not implemented placeholder"),
    (r"return\s+null\s*//\s*TODO", "Null return with TODO"),

    # Test-only patterns in non-test files
    (r"@ts-ignore", "@ts-ignore suppression"),
    (r"@ts-nocheck", "@ts-nocheck suppression"),

    # Hardcoded credentials patterns
    (r"password\s*[:=]\s*['\"](?!.*\$\{)(?!.*process\.env)", "Hardcoded password"),
]


def is_test_file(path: str) -> bool:
    """Check if file is a test file."""
    test_patterns = [
        r"\.test\.",
        r"\.spec\.",
        r"/__tests__/",
        r"/test/",
        r"/tests/",
        r"_test\.",
        r"\.mock\.",
    ]

    for pattern in test_patterns:
        if re.search(pattern, path, re.IGNORECASE):
            return True

    return False


def check_mock_patterns(content: str) -> list[str]:
    """Check content for mock/placeholder patterns."""
    warnings = []

    for pattern, description in MOCK_PATTERNS:
        matches = list(re.finditer(pattern, content, re.IGNORECASE))
        if matches:
            line = content[:matches[0].start()].count("\n") + 1
            warnings.append(f"{description} (line ~{line})")

    return warnings


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

    # Skip test files
    if is_test_file(file_path):
        sys.exit(0)

    # Get content to check
    content = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not content:
        sys.exit(0)

    warnings = check_mock_patterns(content)

    if warnings:
        result = {
            "warning": "Mock/placeholder code detected",
            "issues": warnings[:5],  # Show first 5
            "suggestion": "Replace with production-ready implementation"
        }
        print(json.dumps(result))
        # Don't block, just warn

    sys.exit(0)


if __name__ == "__main__":
    main()
