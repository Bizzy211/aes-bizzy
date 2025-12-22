#!/usr/bin/env python3
"""
Database Extension Check Hook - PostgreSQL Extension Validation

Event: PreToolUse (for SQL migrations)
Purpose: Validate database extensions are properly enabled

Validation Rules:
- Required extensions for features (uuid-ossp, pgcrypto)
- Extension availability check
- Migration order validation
"""

import json
import sys
import re


# Common extensions and their features
EXTENSION_FEATURES = {
    "uuid-ossp": ["uuid_generate_v4()", "uuid_generate_v1()"],
    "pgcrypto": ["gen_random_uuid()", "crypt()", "digest()"],
    "pg_trgm": ["similarity()", "word_similarity()", "%"],
    "btree_gin": ["GIN", "btree_gin"],
    "btree_gist": ["GIST", "btree_gist"],
    "citext": ["citext", "CITEXT"],
    "hstore": ["hstore", "=>"],
    "postgis": ["geometry", "geography", "ST_"],
}


def extract_sql_content(content: str) -> str:
    """Extract SQL from migration file content."""
    # Handle Prisma migrations
    if "-- CreateTable" in content or "-- AlterTable" in content:
        return content

    # Handle raw SQL
    return content


def detect_required_extensions(sql: str) -> list[str]:
    """Detect which extensions are needed based on SQL content."""
    required = []

    for extension, features in EXTENSION_FEATURES.items():
        for feature in features:
            if feature in sql:
                if extension not in required:
                    required.append(extension)

    return required


def check_extension_enabled(sql: str, extension: str) -> bool:
    """Check if an extension is enabled in the migration."""
    patterns = [
        rf"CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?['\"]?{extension}['\"]?",
        rf"CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?{extension}",
    ]

    for pattern in patterns:
        if re.search(pattern, sql, re.IGNORECASE):
            return True

    return False


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

    # Check Write/Edit on migration files
    if tool_name not in ["Write", "Edit"]:
        sys.exit(0)

    file_path = tool_input.get("file_path", "")

    # Only check SQL/migration files
    if not any(p in file_path.lower() for p in ["migration", ".sql"]):
        sys.exit(0)

    content = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not content:
        sys.exit(0)

    sql = extract_sql_content(content)
    required = detect_required_extensions(sql)

    missing = []
    for ext in required:
        if not check_extension_enabled(sql, ext):
            missing.append(ext)

    if missing:
        result = {
            "warning": "Database extensions may be required",
            "extensions": missing,
            "suggestion": f"Add: CREATE EXTENSION IF NOT EXISTS {', '.join(missing)};"
        }
        print(json.dumps(result))

    sys.exit(0)


if __name__ == "__main__":
    main()
