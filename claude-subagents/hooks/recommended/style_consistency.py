#!/usr/bin/env python3
"""
Style Consistency Hook - Code Style Validation

Event: PostToolUse (for Write/Edit)
Purpose: Ensure code follows project style conventions

Validation Rules:
- Consistent indentation
- Naming conventions
- Import ordering
"""

import json
import sys
import re
import os


def detect_indentation(content: str) -> str:
    """Detect the indentation style used in file."""
    lines = content.split("\n")

    tabs = 0
    spaces = 0

    for line in lines:
        if line.startswith("\t"):
            tabs += 1
        elif line.startswith("  "):
            spaces += 1

    if tabs > spaces:
        return "tabs"
    return "spaces"


def check_mixed_indentation(content: str) -> bool:
    """Check for mixed indentation."""
    lines = content.split("\n")

    has_tabs = any(line.startswith("\t") for line in lines if line.strip())
    has_spaces = any(line.startswith("  ") for line in lines if line.strip())

    return has_tabs and has_spaces


def check_naming_conventions(content: str, file_ext: str) -> list[str]:
    """Check for naming convention violations."""
    warnings = []

    if file_ext in [".ts", ".js", ".tsx", ".jsx"]:
        # Check for snake_case variables (should be camelCase)
        snake_vars = re.findall(r"(?:const|let|var)\s+([a-z]+_[a-z_]+)\s*=", content)
        if snake_vars:
            warnings.append(f"Use camelCase: {', '.join(snake_vars[:3])}")

        # Check for PascalCase non-components
        non_component_pascal = re.findall(
            r"const\s+([A-Z][a-z]+[A-Z]\w*)\s*=\s*(?![\(\<])",
            content
        )
        # Filter out likely component names
        non_components = [n for n in non_component_pascal if not n.endswith("Component")]
        if non_components:
            warnings.append(f"PascalCase typically for components: {', '.join(non_components[:3])}")

    return warnings


def check_import_order(content: str) -> list[str]:
    """Check if imports are properly ordered."""
    warnings = []

    # Extract import blocks
    import_lines = []
    for line in content.split("\n"):
        if re.match(r"^\s*import\s+", line):
            import_lines.append(line)
        elif import_lines and not line.strip():
            break  # End of import block

    if len(import_lines) > 3:
        # Check if external imports come before local
        seen_local = False
        for line in import_lines:
            is_local = re.search(r"from\s+['\"]\.\.?/", line)
            is_external = not is_local

            if seen_local and is_external:
                warnings.append("External imports should come before local imports")
                break

            if is_local:
                seen_local = True

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

    _, ext = os.path.splitext(file_path)
    all_warnings = []

    # Check mixed indentation
    if check_mixed_indentation(content):
        all_warnings.append("Mixed tabs and spaces indentation")

    # Check naming
    all_warnings.extend(check_naming_conventions(content, ext))

    # Check import order
    all_warnings.extend(check_import_order(content))

    if all_warnings:
        result = {
            "warning": "Style consistency issues",
            "issues": all_warnings[:5],
            "suggestion": "Consider running code formatter (prettier/eslint)"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
