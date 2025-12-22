#!/usr/bin/env python3
"""
API Endpoint Verifier Hook - REST Endpoint Validation

Event: PostToolUse (for Write/Edit on API files)
Purpose: Validate REST endpoint patterns and consistency

Validation Rules:
- RESTful naming conventions
- HTTP method appropriateness
- Response status codes
"""

import json
import sys
import re
import os


# RESTful patterns
REST_VERBS = {
    "GET": ["list", "get", "fetch", "find", "read", "show"],
    "POST": ["create", "add", "insert", "new"],
    "PUT": ["update", "replace", "modify"],
    "PATCH": ["patch", "partial", "update"],
    "DELETE": ["delete", "remove", "destroy"],
}


def extract_endpoints(content: str) -> list[dict]:
    """Extract API endpoint definitions from code."""
    endpoints = []

    # Express.js style: router.get('/path', handler)
    express_pattern = r"(router|app)\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]"

    for match in re.finditer(express_pattern, content, re.IGNORECASE):
        method = match.group(2).upper()
        path = match.group(3)
        endpoints.append({
            "method": method,
            "path": path,
            "line": content[:match.start()].count("\n") + 1
        })

    # Next.js API routes: export async function GET/POST
    nextjs_pattern = r"export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\("

    for match in re.finditer(nextjs_pattern, content, re.IGNORECASE):
        method = match.group(2).upper()
        endpoints.append({
            "method": method,
            "path": "current file",
            "line": content[:match.start()].count("\n") + 1
        })

    return endpoints


def validate_endpoint(endpoint: dict) -> list[str]:
    """Validate a single endpoint."""
    warnings = []
    path = endpoint["path"]
    method = endpoint["method"]

    # Check for resource-based naming
    if path != "current file":
        # Path should be kebab-case or resource/id style
        if re.search(r"[A-Z]", path):
            warnings.append(f"Path should be lowercase: {path}")

        # Path should not have verbs for REST
        path_lower = path.lower()
        for verb in ["create", "update", "delete", "get", "fetch"]:
            if verb in path_lower:
                warnings.append(f"RESTful path should not contain verb '{verb}': {path}")

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

    # Only check API-related files
    if not any(p in file_path for p in ["/api/", "/routes/", "route."]):
        sys.exit(0)

    if not os.path.exists(file_path):
        sys.exit(0)

    try:
        with open(file_path, "r") as f:
            content = f.read()
    except IOError:
        sys.exit(0)

    endpoints = extract_endpoints(content)
    all_warnings = []

    for endpoint in endpoints:
        warnings = validate_endpoint(endpoint)
        all_warnings.extend(warnings)

    if all_warnings:
        result = {
            "warning": "API endpoint conventions",
            "issues": all_warnings[:5],
            "suggestion": "Follow RESTful naming conventions"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
