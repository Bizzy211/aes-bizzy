#!/usr/bin/env python3
"""
API Documentation Enforcer Hook - JSDoc/TSDoc Validation

Event: PostToolUse (for Write/Edit on API files)
Purpose: Ensure API functions have proper documentation

Validation Rules:
- Public functions need JSDoc/TSDoc comments
- Required tags: @param, @returns, @throws
- Description should explain purpose
"""

import json
import sys
import re
import os


# Patterns for API files
API_FILE_PATTERNS = [
    r"/api/",
    r"/routes/",
    r"/controllers/",
    r"/services/",
    r"\.controller\.",
    r"\.service\.",
    r"\.api\.",
]


def is_api_file(path: str) -> bool:
    """Check if file is an API-related file."""
    for pattern in API_FILE_PATTERNS:
        if re.search(pattern, path, re.IGNORECASE):
            return True
    return False


def extract_functions(content: str) -> list[dict]:
    """Extract function definitions from code."""
    functions = []

    # Match function declarations
    patterns = [
        # export function name(...)
        r"export\s+(async\s+)?function\s+(\w+)\s*\(",
        # export const name = (...) =>
        r"export\s+const\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>",
        # public method
        r"(public\s+)?(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, content):
            # Get function name
            groups = match.groups()
            name = next((g for g in groups if g and not g.strip() in ["async", "public"]), None)
            if name:
                functions.append({
                    "name": name.strip(),
                    "position": match.start(),
                    "line": content[:match.start()].count("\n") + 1
                })

    return functions


def has_jsdoc_before(content: str, position: int) -> bool:
    """Check if there's a JSDoc comment before the position."""
    # Look back from position for /** ... */
    before = content[:position]
    lines = before.split("\n")

    # Check last few lines for JSDoc
    recent = "\n".join(lines[-10:])
    return bool(re.search(r"/\*\*[\s\S]*?\*/\s*$", recent))


def check_documentation(content: str) -> list[str]:
    """Check for missing documentation."""
    warnings = []

    functions = extract_functions(content)

    for func in functions:
        if not has_jsdoc_before(content, func["position"]):
            warnings.append(
                f"Function '{func['name']}' (line {func['line']}) lacks JSDoc documentation"
            )

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

    # Only check after Write/Edit
    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")

    # Only check API files
    if not is_api_file(file_path):
        sys.exit(0)

    # Skip non-JS/TS files
    if not file_path.endswith((".ts", ".js", ".tsx", ".jsx")):
        sys.exit(0)

    # Read file content
    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, "r") as f:
            content = f.read()
    except IOError:
        sys.exit(0)

    # Check documentation
    warnings = check_documentation(content)

    if warnings:
        result = {
            "warning": f"Missing API documentation in {os.path.basename(file_path)}",
            "issues": warnings[:5],  # Show first 5
            "suggestion": "Add JSDoc comments with @param, @returns, @throws tags"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
