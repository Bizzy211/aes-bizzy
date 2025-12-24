#!/usr/bin/env python3
"""
Post Commit Hook - Heimdall Memory Storage

Event: Git post-commit (triggered after a successful git commit)
Purpose: Store commit context and changes in Heimdall for future reference

This hook captures:
- Commit message and rationale
- Files changed
- Technologies touched
- Related task IDs from commit message
"""

import sys
import subprocess
import re
from datetime import datetime
from typing import Optional, Dict, Any, List

from .utils import (
    store_memory,
    generate_standard_tags,
    extract_tech_from_content,
    safe_hook_execution,
    log_hook_error,
    is_heimdall_ready,
    get_project_name,
)


def get_last_commit_info() -> Optional[Dict[str, Any]]:
    """Get information about the last commit."""
    try:
        # Get commit hash
        hash_result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if hash_result.returncode != 0:
            return None

        commit_hash = hash_result.stdout.strip()

        # Get commit message
        msg_result = subprocess.run(
            ["git", "log", "-1", "--format=%B"],
            capture_output=True,
            text=True,
            timeout=10
        )
        message = msg_result.stdout.strip() if msg_result.returncode == 0 else ""

        # Get commit author
        author_result = subprocess.run(
            ["git", "log", "-1", "--format=%an <%ae>"],
            capture_output=True,
            text=True,
            timeout=10
        )
        author = author_result.stdout.strip() if author_result.returncode == 0 else ""

        # Get files changed
        files_result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10
        )
        files = files_result.stdout.strip().split("\n") if files_result.returncode == 0 else []

        # Get diff stats
        stats_result = subprocess.run(
            ["git", "diff", "--stat", "HEAD~1..HEAD"],
            capture_output=True,
            text=True,
            timeout=10
        )
        stats = stats_result.stdout.strip() if stats_result.returncode == 0 else ""

        return {
            "hash": commit_hash[:8],
            "full_hash": commit_hash,
            "message": message,
            "author": author,
            "files": [f for f in files if f],
            "stats": stats,
        }

    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def extract_task_ids(message: str) -> List[str]:
    """Extract task IDs from commit message."""
    # Common patterns: "task 1.2", "#123", "TM-456", "(task 7)"
    patterns = [
        r"task\s+(\d+(?:\.\d+)?)",
        r"#(\d+)",
        r"TM-(\d+)",
        r"\(task\s+(\d+(?:\.\d+)?)\)",
    ]

    task_ids = []
    message_lower = message.lower()

    for pattern in patterns:
        matches = re.findall(pattern, message_lower, re.IGNORECASE)
        task_ids.extend(matches)

    return list(set(task_ids))


def categorize_files(files: List[str]) -> Dict[str, List[str]]:
    """Categorize files by type."""
    categories = {
        "source": [],
        "test": [],
        "config": [],
        "docs": [],
        "other": [],
    }

    for file in files:
        file_lower = file.lower()
        if "test" in file_lower or ".test." in file_lower or ".spec." in file_lower:
            categories["test"].append(file)
        elif file_lower.endswith((".md", ".txt", ".rst")):
            categories["docs"].append(file)
        elif file_lower.endswith((".json", ".yaml", ".yml", ".toml", ".ini", ".env")):
            categories["config"].append(file)
        elif file_lower.endswith((".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs")):
            categories["source"].append(file)
        else:
            categories["other"].append(file)

    return categories


def create_commit_memory_content(commit_info: Dict[str, Any]) -> str:
    """Create memory content from commit information."""
    content_parts = [
        f"# Git Commit: {commit_info.get('hash', 'unknown')}",
        "",
        "## Commit Message",
        commit_info.get("message", "No message"),
        "",
    ]

    files = commit_info.get("files", [])
    if files:
        categories = categorize_files(files)

        content_parts.extend([
            f"## Files Changed ({len(files)} files)",
        ])

        for category, cat_files in categories.items():
            if cat_files:
                content_parts.append(f"\n### {category.title()} ({len(cat_files)})")
                for f in cat_files[:10]:  # Limit to 10 per category
                    content_parts.append(f"- {f}")
                if len(cat_files) > 10:
                    content_parts.append(f"- ... and {len(cat_files) - 10} more")

        content_parts.append("")

    if commit_info.get("stats"):
        content_parts.extend([
            "## Stats",
            "```",
            commit_info["stats"],
            "```",
            "",
        ])

    content_parts.extend([
        "## Commit Info",
        f"Hash: {commit_info.get('full_hash', 'unknown')[:12]}",
        f"Author: {commit_info.get('author', 'unknown')}",
        f"Date: {datetime.now().isoformat()}",
    ])

    return "\n".join(content_parts)


@safe_hook_execution
def main():
    """Main hook execution."""
    # Check if Heimdall is ready
    if not is_heimdall_ready():
        sys.exit(0)

    # Get commit info
    commit_info = get_last_commit_info()
    if not commit_info:
        sys.exit(0)

    # Create memory content
    content = create_commit_memory_content(commit_info)

    # Detect technologies from files and content
    all_files = " ".join(commit_info.get("files", []))
    tech_stack = extract_tech_from_content(content + " " + all_files)

    # Extract task IDs from commit message
    task_ids = extract_task_ids(commit_info.get("message", ""))
    task_id = task_ids[0] if task_ids else None

    # Generate tags
    additional_tags = ["git-commit", f"commit:{commit_info.get('hash', 'unknown')}"]
    for tid in task_ids[:3]:  # Add first 3 task IDs as tags
        additional_tags.append(f"task:{tid}")

    tags = generate_standard_tags(
        task_id=task_id,
        memory_type="context",
        tech_stack=tech_stack,
        additional_tags=additional_tags,
    )

    # Store the memory
    result = store_memory(
        content=content,
        tags=tags,
        memory_type="context",
        task_id=task_id,
    )

    if not result.get("success"):
        log_hook_error("post_commit", result.get("error", "Unknown error"))

    sys.exit(0)


if __name__ == "__main__":
    main()
