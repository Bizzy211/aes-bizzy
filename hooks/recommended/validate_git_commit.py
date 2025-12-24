#!/usr/bin/env python3
"""
Validate Git Commit Hook - Commit Message Standards

Event: PreToolUse (for git commit)
Purpose: Enforce commit message conventions

Validation Rules:
- Conventional commit format (feat:, fix:, docs:, etc.)
- Message length limits
- No WIP commits to main/master
"""

import json
import sys
import re
import subprocess


# Conventional commit types
COMMIT_TYPES = [
    "feat", "fix", "docs", "style", "refactor",
    "perf", "test", "build", "ci", "chore", "revert"
]


def get_current_branch() -> str:
    """Get current git branch name."""
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return ""


def validate_message(message: str) -> tuple[bool, list[str]]:
    """Validate commit message against standards."""
    errors = []

    # Check for conventional commit format
    type_pattern = rf"^({'|'.join(COMMIT_TYPES)})(\(.+\))?: .+"
    if not re.match(type_pattern, message, re.IGNORECASE):
        errors.append(f"Message should start with: {', '.join(COMMIT_TYPES[:5])}...")

    # Check minimum length
    if len(message) < 10:
        errors.append("Message too short (min 10 characters)")

    # Check maximum line length
    first_line = message.split("\n")[0]
    if len(first_line) > 72:
        errors.append(f"First line too long ({len(first_line)} > 72 chars)")

    # Check for WIP
    if re.search(r"\bWIP\b", message, re.IGNORECASE):
        branch = get_current_branch()
        if branch in ["main", "master"]:
            errors.append("WIP commits not allowed on main/master")

    return len(errors) == 0, errors


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

    # Only check git commit commands
    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")
    if "git commit" not in command:
        sys.exit(0)

    # Extract commit message
    msg_match = re.search(r'-m\s+["\'](.+?)["\']', command, re.DOTALL)
    if not msg_match:
        sys.exit(0)

    message = msg_match.group(1)

    # Validate
    valid, errors = validate_message(message)

    if not valid:
        result = {
            "decision": "block",
            "reason": "Commit message validation failed",
            "errors": errors
        }
        print(json.dumps(result))
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
