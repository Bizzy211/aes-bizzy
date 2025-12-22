#!/usr/bin/env python3
"""
Secret Scanner Hook - Credential Detection

Event: PreToolUse (for Write/Edit), PostToolUse (for logging)
Purpose: Detect and block accidental exposure of credentials

Security Patterns Detected:
- API keys (various formats)
- Access tokens
- Private keys
- Passwords in configuration
- Database connection strings
"""

import json
import sys
import re
from typing import Any


# Regex patterns for secret detection
SECRET_PATTERNS = {
    "api_key": [
        r"(?i)(api[_-]?key|apikey)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})['\"]?",
        r"(?i)sk-[a-zA-Z0-9]{20,}",  # OpenAI format
        r"(?i)AKIA[0-9A-Z]{16}",  # AWS Access Key
        r"xox[baprs]-[0-9a-zA-Z\-]{10,}",  # Slack tokens
    ],
    "access_token": [
        r"(?i)(access[_-]?token|bearer)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{20,})['\"]?",
        r"ghp_[a-zA-Z0-9]{36}",  # GitHub personal access token
        r"github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}",  # GitHub PAT (fine-grained)
    ],
    "private_key": [
        r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
        r"-----BEGIN PGP PRIVATE KEY BLOCK-----",
    ],
    "password": [
        r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"]?([^\s'\"]{8,})['\"]?",
        r"(?i)(secret|token)\s*[:=]\s*['\"]?([^\s'\"]{16,})['\"]?",
    ],
    "database_url": [
        r"(?i)(postgres|mysql|mongodb)://[^\s]+:[^\s]+@[^\s]+",
        r"(?i)DATABASE_URL\s*=\s*['\"]?[^\s]+['\"]?",
    ],
    "jwt": [
        r"eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*",  # JWT token
    ],
}

# Paths that are allowed to contain secrets (env templates)
ALLOWED_PATTERNS = [
    r"\.env\.example$",
    r"\.env\.template$",
    r"\.env\.sample$",
]


def is_allowed_file(file_path: str) -> bool:
    """Check if file is allowed to contain secret-like patterns."""
    for pattern in ALLOWED_PATTERNS:
        if re.search(pattern, file_path):
            return True
    return False


def scan_for_secrets(content: str) -> list[dict]:
    """Scan content for secrets and return findings."""
    findings = []

    for secret_type, patterns in SECRET_PATTERNS.items():
        for pattern in patterns:
            matches = re.finditer(pattern, content)
            for match in matches:
                # Get context around the match
                start = max(0, match.start() - 20)
                end = min(len(content), match.end() + 20)
                context = content[start:end].replace("\n", " ")

                findings.append({
                    "type": secret_type,
                    "pattern": pattern[:30] + "...",
                    "context": f"...{context}...",
                    "position": match.start(),
                })

    return findings


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

    # Only scan Write and Edit operations
    if tool_name not in ["Write", "Edit", "MultiEdit"]:
        sys.exit(0)

    # Check if it's an allowed file
    file_path = tool_input.get("file_path", "")
    if is_allowed_file(file_path):
        sys.exit(0)

    # Get content to scan
    content = ""
    if tool_name == "Write":
        content = tool_input.get("content", "")
    elif tool_name == "Edit":
        content = tool_input.get("new_string", "")
    elif tool_name == "MultiEdit":
        edits = tool_input.get("edits", [])
        content = " ".join(e.get("new_string", "") for e in edits)

    # Scan for secrets
    findings = scan_for_secrets(content)

    if findings:
        # Block the operation
        result = {
            "decision": "block",
            "reason": f"Potential secrets detected: {len(findings)} finding(s)",
            "findings": [
                f"{f['type']}: {f['context']}"
                for f in findings[:3]  # Show first 3
            ]
        }
        print(json.dumps(result))
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
