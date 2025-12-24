#!/usr/bin/env python3
"""
Duplicate Detector Hook - Code Duplication Detection

Event: PostToolUse (for Write/Edit)
Purpose: Detect potential code duplication

Detection Patterns:
- Similar function signatures
- Repeated code blocks
- Duplicate imports
"""

import json
import sys
import re
import os
from collections import Counter


def extract_functions(content: str) -> list[str]:
    """Extract function names from content."""
    patterns = [
        r"function\s+(\w+)\s*\(",
        r"const\s+(\w+)\s*=\s*(?:async\s*)?\(",
        r"def\s+(\w+)\s*\(",
        r"(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>",
    ]

    functions = []
    for pattern in patterns:
        for match in re.finditer(pattern, content):
            functions.append(match.group(1))

    return functions


def extract_imports(content: str) -> list[str]:
    """Extract import statements from content."""
    patterns = [
        r"import\s+.+\s+from\s+['\"]([^'\"]+)['\"]",
        r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)",
        r"from\s+([^\s]+)\s+import",
    ]

    imports = []
    for pattern in patterns:
        for match in re.finditer(pattern, content):
            imports.append(match.group(1))

    return imports


def find_duplicates(items: list[str]) -> list[str]:
    """Find duplicate items in a list."""
    counts = Counter(items)
    return [item for item, count in counts.items() if count > 1]


def check_for_duplicates(content: str) -> list[str]:
    """Check content for various duplications."""
    warnings = []

    # Check duplicate function names
    functions = extract_functions(content)
    dup_funcs = find_duplicates(functions)
    if dup_funcs:
        warnings.append(f"Duplicate function names: {', '.join(dup_funcs)}")

    # Check duplicate imports
    imports = extract_imports(content)
    dup_imports = find_duplicates(imports)
    if dup_imports:
        warnings.append(f"Duplicate imports: {', '.join(dup_imports)}")

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

    # Only check source code files
    if not file_path.endswith((".ts", ".js", ".tsx", ".jsx", ".py")):
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, "r") as f:
            content = f.read()
    except IOError:
        sys.exit(0)

    warnings = check_for_duplicates(content)

    if warnings:
        result = {
            "warning": "Potential code duplication detected",
            "issues": warnings,
            "suggestion": "Consider extracting common code to shared utilities"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
