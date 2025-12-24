#!/usr/bin/env python3
"""
Heimdall Hook Utilities

Shared utilities for Heimdall memory hooks including:
- Memory storage via CLI
- Tag generation
- Error handling
- Configuration loading
"""

import subprocess
import json
import os
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path


# ============================================================================
# Configuration
# ============================================================================

HEIMDALL_CLI = "aes-bizzy"
MEMORY_SUBCOMMAND = "memory"
DEFAULT_TIMEOUT = 30


def get_project_root() -> Path:
    """Get the project root directory."""
    # Start from current directory and walk up
    current = Path.cwd()

    # Look for common project markers
    markers = [".git", "package.json", ".beads", ".taskmaster"]

    while current != current.parent:
        for marker in markers:
            if (current / marker).exists():
                return current
        current = current.parent

    return Path.cwd()


def get_project_name() -> str:
    """Get the current project name."""
    root = get_project_root()

    # Try package.json first
    pkg_path = root / "package.json"
    if pkg_path.exists():
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
                return pkg.get("name", root.name)
        except (json.JSONDecodeError, IOError):
            pass

    return root.name


# ============================================================================
# Memory Storage
# ============================================================================

def store_memory(
    content: str,
    tags: List[str],
    memory_type: str = "context",
    agent_name: Optional[str] = None,
    task_id: Optional[str] = None,
    ttl_days: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Store a memory using the Heimdall CLI.

    Args:
        content: The memory content to store
        tags: List of tags for the memory
        memory_type: Type of memory (lesson, pattern, decision, context, error)
        agent_name: Optional agent name
        task_id: Optional task ID
        ttl_days: Optional time-to-live in days

    Returns:
        Dict with success status and optional memory_id or error
    """
    try:
        args = [
            HEIMDALL_CLI, MEMORY_SUBCOMMAND, "store",
            content,
            "--tags", ",".join(tags),
            "--type", memory_type,
            "--json"
        ]

        if agent_name:
            args.extend(["--agent", agent_name])
        if task_id:
            args.extend(["--task", task_id])
        if ttl_days:
            args.extend(["--ttl", str(ttl_days)])

        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=DEFAULT_TIMEOUT
        )

        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                return {"success": True, "memory_id": data.get("memoryId")}
            except json.JSONDecodeError:
                return {"success": True, "memory_id": None}
        else:
            return {"success": False, "error": result.stderr or "Unknown error"}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout storing memory"}
    except FileNotFoundError:
        return {"success": False, "error": f"{HEIMDALL_CLI} CLI not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def query_memories(
    query: str,
    limit: int = 5,
    tags: Optional[List[str]] = None,
    memory_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Query memories using semantic search.

    Args:
        query: Search query
        limit: Maximum results
        tags: Optional tag filter
        memory_type: Optional type filter

    Returns:
        Dict with success status and memories or error
    """
    try:
        args = [
            HEIMDALL_CLI, MEMORY_SUBCOMMAND, "search",
            query,
            "--limit", str(limit),
            "--json"
        ]

        if tags:
            args.extend(["--tags", ",".join(tags)])
        if memory_type:
            args.extend(["--type", memory_type])

        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=DEFAULT_TIMEOUT
        )

        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                return {"success": True, "memories": data.get("memories", [])}
            except json.JSONDecodeError:
                return {"success": True, "memories": []}
        else:
            return {"success": False, "error": result.stderr, "memories": []}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout querying memories", "memories": []}
    except FileNotFoundError:
        return {"success": False, "error": f"{HEIMDALL_CLI} CLI not found", "memories": []}
    except Exception as e:
        return {"success": False, "error": str(e), "memories": []}


def is_heimdall_ready() -> bool:
    """Check if Heimdall is initialized and ready."""
    try:
        result = subprocess.run(
            [HEIMDALL_CLI, MEMORY_SUBCOMMAND, "health", "--json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return data.get("operational", False)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        pass
    return False


# ============================================================================
# Tag Generation
# ============================================================================

# Standard tag prefixes matching TypeScript implementation
TAG_PREFIXES = {
    "AGENT": "agent:",
    "PROJECT": "project:",
    "TASK": "task:",
    "TYPE": "type:",
    "TECH": "tech:",
    "COMPONENT": "component:",
    "FEATURE": "feature:",
    "ERROR": "error:",
    "PATTERN": "pattern:",
    "DEPENDENCY": "dep:",
}


def normalize_tag(tag: str) -> str:
    """Normalize a tag (lowercase, replace spaces, remove special chars)."""
    return (
        tag.lower()
        .strip()
        .replace(" ", "-")
        .replace("_", "-")
    )


def construct_tag(prefix_key: str, value: str) -> str:
    """Construct a prefixed tag."""
    prefix = TAG_PREFIXES.get(prefix_key, "")
    return f"{prefix}{normalize_tag(value)}"


def generate_standard_tags(
    agent_name: Optional[str] = None,
    task_id: Optional[str] = None,
    memory_type: Optional[str] = None,
    project_name: Optional[str] = None,
    tech_stack: Optional[List[str]] = None,
    additional_tags: Optional[List[str]] = None,
) -> List[str]:
    """
    Generate standard tags for a memory.

    Args:
        agent_name: Name of the agent
        task_id: Task identifier
        memory_type: Type of memory
        project_name: Project name
        tech_stack: List of technologies
        additional_tags: Additional custom tags

    Returns:
        List of normalized tags
    """
    tags = []

    if agent_name:
        tags.append(construct_tag("AGENT", agent_name))

    if task_id:
        tags.append(construct_tag("TASK", task_id))

    if memory_type:
        tags.append(construct_tag("TYPE", memory_type))

    if project_name:
        tags.append(construct_tag("PROJECT", project_name))
    else:
        # Auto-detect project name
        detected = get_project_name()
        if detected:
            tags.append(construct_tag("PROJECT", detected))

    if tech_stack:
        for tech in tech_stack:
            tags.append(construct_tag("TECH", tech))

    if additional_tags:
        for tag in additional_tags:
            normalized = normalize_tag(tag)
            if normalized and normalized not in tags:
                tags.append(normalized)

    return tags


def extract_tech_from_content(content: str) -> List[str]:
    """Extract technology tags from content."""
    tech_patterns = {
        "typescript": ["typescript", ".ts", "tsc"],
        "javascript": ["javascript", ".js", "node"],
        "python": ["python", ".py", "pip"],
        "react": ["react", "jsx", "tsx", "usestate", "useeffect"],
        "docker": ["docker", "dockerfile", "container"],
        "postgres": ["postgres", "postgresql", "psql"],
        "supabase": ["supabase", "@supabase"],
        "qdrant": ["qdrant", "vector", "embedding"],
    }

    detected = []
    content_lower = content.lower()

    for tech, patterns in tech_patterns.items():
        if any(p in content_lower for p in patterns):
            detected.append(tech)

    return detected


# ============================================================================
# Error Handling
# ============================================================================

def log_hook_error(hook_name: str, error: str, context: Optional[Dict] = None):
    """Log a hook error without breaking the main workflow."""
    timestamp = datetime.now().isoformat()
    log_entry = {
        "timestamp": timestamp,
        "hook": hook_name,
        "error": error,
        "context": context or {}
    }

    # Write to stderr (doesn't break workflow)
    print(f"[Heimdall Hook Error] {hook_name}: {error}", file=sys.stderr)

    # Optionally write to log file
    log_dir = get_project_root() / ".heimdall" / "logs"
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "hook-errors.jsonl"
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception:
        pass  # Don't break on logging failures


def safe_hook_execution(func):
    """Decorator for safe hook execution that never breaks the main workflow."""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            hook_name = func.__name__
            log_hook_error(hook_name, str(e))
            sys.exit(0)  # Exit cleanly even on error
    return wrapper


# ============================================================================
# Input Parsing
# ============================================================================

def parse_hook_input() -> Dict[str, Any]:
    """Parse JSON input from stdin (common hook pattern)."""
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            return {}
        return json.loads(input_data)
    except json.JSONDecodeError:
        return {}
    except Exception:
        return {}


def get_env_or_default(key: str, default: str = "") -> str:
    """Get environment variable with default."""
    return os.environ.get(key, default)
