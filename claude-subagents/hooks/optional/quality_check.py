#!/usr/bin/env python3
"""
Quality Check Hook - Code Quality Assessment

Event: PostToolUse (for Write/Edit)
Purpose: Quick quality assessment of code changes

Checks:
- Function complexity
- File size
- Test coverage suggestions
"""

import json
import sys
import re
import os


def calculate_complexity(content: str) -> int:
    """Calculate rough cyclomatic complexity."""
    # Count decision points
    decision_patterns = [
        r"\bif\b",
        r"\belse\b",
        r"\belif\b",
        r"\bfor\b",
        r"\bwhile\b",
        r"\bcase\b",
        r"\bcatch\b",
        r"\b\?\s*:",  # ternary
        r"\b&&\b",
        r"\b\|\|\b",
    ]

    complexity = 1  # Base complexity
    for pattern in decision_patterns:
        complexity += len(re.findall(pattern, content))

    return complexity


def check_function_size(content: str) -> list[str]:
    """Check for overly large functions."""
    warnings = []

    # Find function definitions and their content
    # This is a simplified check
    func_pattern = r"(function\s+\w+|=>\s*\{|\)\s*\{)"

    lines = content.split("\n")
    in_function = False
    function_start = 0
    brace_count = 0

    for i, line in enumerate(lines):
        if re.search(func_pattern, line):
            in_function = True
            function_start = i
            brace_count = line.count("{") - line.count("}")
        elif in_function:
            brace_count += line.count("{") - line.count("}")
            if brace_count <= 0:
                func_length = i - function_start
                if func_length > 50:
                    warnings.append(
                        f"Function at line {function_start + 1} is {func_length} lines - consider splitting"
                    )
                in_function = False

    return warnings


def check_file_size(content: str, file_path: str) -> list[str]:
    """Check if file is too large."""
    warnings = []

    lines = len(content.split("\n"))
    if lines > 500:
        warnings.append(f"File has {lines} lines - consider splitting into modules")

    return warnings


def suggest_tests(content: str, file_path: str) -> list[str]:
    """Suggest test coverage if missing."""
    suggestions = []

    # Check if it's a test file
    if any(p in file_path for p in [".test.", ".spec.", "__tests__"]):
        return suggestions

    # Count exported functions
    exports = len(re.findall(r"export\s+(function|const|class)", content))

    if exports > 0:
        # Check for corresponding test file
        base = os.path.splitext(file_path)[0]
        test_candidates = [
            f"{base}.test.ts",
            f"{base}.spec.ts",
            f"{base}.test.js",
            f"{base}.spec.js",
        ]

        has_tests = any(os.path.exists(t) for t in test_candidates)
        if not has_tests:
            suggestions.append(
                f"Consider adding tests for {exports} exported function(s)"
            )

    return suggestions


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

    # Only check source files
    if not any(file_path.endswith(ext) for ext in [".ts", ".js", ".tsx", ".jsx", ".py"]):
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, "r") as f:
            content = f.read()
    except IOError:
        sys.exit(0)

    all_issues = []

    # Check complexity
    complexity = calculate_complexity(content)
    if complexity > 20:
        all_issues.append(f"High complexity score ({complexity}) - consider refactoring")

    # Check function sizes
    all_issues.extend(check_function_size(content))

    # Check file size
    all_issues.extend(check_file_size(content, file_path))

    # Test suggestions
    all_issues.extend(suggest_tests(content, file_path))

    if all_issues:
        result = {
            "info": "Quality check findings",
            "issues": all_issues[:5],
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
