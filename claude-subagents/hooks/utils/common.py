"""
Common Utilities for Hooks

Shared helper functions used across multiple hooks.
"""

import json
import os
import subprocess
from typing import Any


def load_env(key: str, default: str = "") -> str:
    """Load environment variable with optional default."""
    return os.environ.get(key, default)


def run_command(
    command: list[str],
    timeout: int = 30,
    capture: bool = True
) -> tuple[int, str, str]:
    """
    Run a shell command and return (returncode, stdout, stderr).

    Args:
        command: Command and arguments as list
        timeout: Timeout in seconds
        capture: Whether to capture output

    Returns:
        Tuple of (return_code, stdout, stderr)
    """
    try:
        result = subprocess.run(
            command,
            capture_output=capture,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except FileNotFoundError:
        return -1, "", f"Command not found: {command[0]}"


def read_json(path: str) -> dict | None:
    """Read and parse a JSON file."""
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError):
        return None


def write_json(path: str, data: dict, indent: int = 2) -> bool:
    """Write data to a JSON file."""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=indent)
        return True
    except IOError:
        return False


def append_jsonl(path: str, data: dict) -> bool:
    """Append a JSON object to a JSONL file."""
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "a") as f:
            f.write(json.dumps(data) + "\n")
        return True
    except IOError:
        return False


def read_jsonl(path: str, limit: int = 100) -> list[dict]:
    """Read entries from a JSONL file."""
    entries = []
    try:
        with open(path, "r") as f:
            for i, line in enumerate(f):
                if i >= limit:
                    break
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    except IOError:
        pass
    return entries


def get_project_root() -> str | None:
    """Find the project root (containing .git or .beads)."""
    current = os.getcwd()

    while current != os.path.dirname(current):
        if os.path.exists(os.path.join(current, ".git")):
            return current
        if os.path.exists(os.path.join(current, ".beads")):
            return current
        current = os.path.dirname(current)

    return None
