#!/usr/bin/env python3
"""
Gitignore Enforcer Hook - Prevent Sensitive File Commits

Event: PreToolUse (for git add/commit)
Purpose: Ensure sensitive files are gitignored before staging

Protected Patterns:
- .env files
- credentials and secrets
- IDE settings
- OS files
- Build outputs
"""

import json
import sys
import re
import os


# Patterns that should be gitignored
SHOULD_IGNORE = [
    r"\.env$",
    r"\.env\..+$",
    r"credentials\.json$",
    r"secrets\.json$",
    r"\.aws/",
    r"\.ssh/",
    r"\.vscode/settings\.json$",
    r"\.idea/",
    r"node_modules/",
    r"__pycache__/",
    r"\.pyc$",
    r"dist/",
    r"build/",
    r"\.DS_Store$",
    r"Thumbs\.db$",
]


def check_gitignore_exists() -> bool:
    """Check if .gitignore exists."""
    return os.path.exists(".gitignore")


def is_file_gitignored(file_path: str) -> bool:
    """Check if a file is properly gitignored."""
    import subprocess
    try:
        result = subprocess.run(
            ["git", "check-ignore", "-q", file_path],
            capture_output=True,
            timeout=5
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def should_be_ignored(file_path: str) -> bool:
    """Check if file matches patterns that should be ignored."""
    for pattern in SHOULD_IGNORE:
        if re.search(pattern, file_path, re.IGNORECASE):
            return True
    return False


def extract_files_from_command(command: str) -> list[str]:
    """Extract file paths from git add command."""
    files = []

    # git add <files>
    if "git add" in command:
        # Remove the git add part
        parts = command.replace("git add", "").strip().split()
        for part in parts:
            if not part.startswith("-"):
                files.append(part)

    return files


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

    # Only check git commands
    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")
    if "git add" not in command:
        sys.exit(0)

    # Skip if adding all with proper ignore
    if command.strip() in ["git add .", "git add -A", "git add --all"]:
        if check_gitignore_exists():
            sys.exit(0)  # Trust .gitignore

    # Extract files being added
    files = extract_files_from_command(command)

    # Check each file
    violations = []
    for file_path in files:
        if should_be_ignored(file_path):
            if not is_file_gitignored(file_path):
                violations.append(file_path)

    if violations:
        result = {
            "decision": "block",
            "reason": "Files should be gitignored before staging",
            "files": violations,
            "suggestion": "Add these patterns to .gitignore first"
        }
        print(json.dumps(result))
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
