#!/usr/bin/env python3
"""
Environment Sync Validator Hook - .env/.env.example Consistency

Event: PostToolUse (for Write/Edit on .env files)
Purpose: Ensure .env and .env.example stay in sync

Validation Rules:
- New .env keys should be added to .env.example
- .env.example should have placeholder values
- Alert on missing documentation for env vars
"""

import json
import sys
import os
import re


def parse_env_file(path: str) -> dict[str, str]:
    """Parse an env file and return key-value pairs."""
    if not os.path.exists(path):
        return {}

    env_vars = {}
    try:
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith("#"):
                    continue

                # Parse KEY=value
                match = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)$", line, re.IGNORECASE)
                if match:
                    key, value = match.groups()
                    env_vars[key] = value

    except IOError:
        pass

    return env_vars


def find_env_example() -> str | None:
    """Find the .env.example file."""
    candidates = [".env.example", ".env.template", ".env.sample"]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None


def check_sync(env_path: str, example_path: str) -> list[str]:
    """Check if .env and .env.example are in sync."""
    warnings = []

    env_vars = parse_env_file(env_path)
    example_vars = parse_env_file(example_path)

    # Find keys in .env but not in example
    missing_in_example = set(env_vars.keys()) - set(example_vars.keys())
    if missing_in_example:
        for key in missing_in_example:
            warnings.append(f"'{key}' is in .env but not in {example_path}")

    # Find keys in example but not in .env
    missing_in_env = set(example_vars.keys()) - set(env_vars.keys())
    if missing_in_env:
        for key in missing_in_env:
            warnings.append(f"'{key}' is in {example_path} but not in .env")

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

    # Only check after Write/Edit on .env files
    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path.endswith(".env"):
        sys.exit(0)

    # Find example file
    example_path = find_env_example()
    if not example_path:
        print(json.dumps({
            "warning": "No .env.example found - consider creating one"
        }))
        sys.exit(0)

    # Check sync
    warnings = check_sync(file_path, example_path)

    if warnings:
        result = {
            "warning": "Environment files out of sync",
            "issues": warnings,
            "suggestion": f"Update {example_path} to match .env structure"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
