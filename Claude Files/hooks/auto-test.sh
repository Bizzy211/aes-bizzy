#!/bin/bash

# Read JSON input
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')

# Only run for code files
if [[ "$tool_name" != "Write" && "$tool_name" != "Edit" && "$tool_name" != "MultiEdit" ]]; then
    exit 0
fi

# Skip if no file path
if [[ -z "$file_path" ]]; then
    exit 0
fi

# Determine file type and run appropriate tests
case "$file_path" in
    *.js|*.jsx|*.ts|*.tsx)
        # Run JavaScript/TypeScript tests
        if [ -f "package.json" ] && grep -q "jest" package.json; then
            echo "Running Jest tests for $file_path..."
            npm test -- --findRelatedTests "$file_path" --passWithNoTests
        elif [ -f "package.json" ] && grep -q "vitest" package.json; then
            echo "Running Vitest tests for $file_path..."
            npm test -- --run --reporter=verbose "$file_path"
        elif [ -f "package.json" ] && grep -q "mocha" package.json; then
            echo "Running Mocha tests..."
            npm test
        fi
        ;;
    *.py)