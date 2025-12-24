#!/usr/bin/env python3
"""
User Prompt Submit Hook - Message Interception

Event: UserPromptSubmit
Purpose: Intercept and process user messages before submission

Features:
- Detect special commands/shortcuts
- Log user requests for context
- Enable prompt transformations
"""

import json
import sys
import re
import subprocess
import os


# Command patterns to detect
COMMAND_PATTERNS = {
    r"^/status\s*$": "Check project status",
    r"^/next\s*$": "Get next task",
    r"^/ready\s*$": "Show ready tasks",
    r"^/sync\s*$": "Sync Beads context",
}


def run_beads_command(args: list[str]) -> dict | None:
    """Execute a Beads CLI command and return parsed JSON output."""
    try:
        result = subprocess.run(
            ["bd"] + args,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {"success": True, "output": result.stdout}
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def detect_command(prompt: str) -> tuple[bool, str]:
    """Detect if prompt is a special command."""
    prompt_clean = prompt.strip().lower()

    for pattern, description in COMMAND_PATTERNS.items():
        if re.match(pattern, prompt_clean):
            return True, description

    return False, ""


def transform_prompt(prompt: str) -> str:
    """Transform prompt if needed (e.g., expand shortcuts)."""
    prompt_clean = prompt.strip()

    # Expand /status to full command
    if re.match(r"^/status\s*$", prompt_clean, re.IGNORECASE):
        return "Show me the current project status using `bd ready --json` and `bd stale --json`"

    # Expand /next to full command
    if re.match(r"^/next\s*$", prompt_clean, re.IGNORECASE):
        return "Find and show me the next task to work on using `bd ready --json`"

    # Expand /ready to full command
    if re.match(r"^/ready\s*$", prompt_clean, re.IGNORECASE):
        return "List all ready tasks using `bd ready --json`"

    # Expand /sync
    if re.match(r"^/sync\s*$", prompt_clean, re.IGNORECASE):
        return "Sync the Beads context using `bd sync`"

    return prompt


def log_user_request(prompt: str):
    """Log user request for context tracking."""
    if not os.path.exists(".beads"):
        return

    # Only log substantive requests
    if len(prompt.strip()) < 10:
        return

    # Truncate for logging
    summary = prompt[:100].replace("\n", " ")
    run_beads_command(["set", "last-user-request", summary])


def main():
    """Main hook execution."""
    # Read prompt from stdin
    input_data = sys.stdin.read()

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        # Pass through unchanged
        print(input_data)
        sys.exit(0)

    prompt = data.get("prompt", "")

    # Log the request
    log_user_request(prompt)

    # Transform if needed
    transformed = transform_prompt(prompt)

    if transformed != prompt:
        # Output transformed prompt
        data["prompt"] = transformed
        data["original_prompt"] = prompt
        print(json.dumps(data))
    else:
        # Pass through unchanged
        print(json.dumps(data))

    sys.exit(0)


if __name__ == "__main__":
    main()
