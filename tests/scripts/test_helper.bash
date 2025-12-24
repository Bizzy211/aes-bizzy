#!/usr/bin/env bash
#
# Bats Test Helper - Shared utilities for script testing
#
# Provides fixtures, mocks, and utility functions for testing
# shell scripts in an isolated environment.
#

# =============================================================================
# Test Environment Setup
# =============================================================================

# Create isolated test directories
setup_test_environment() {
    # Create unique temp directory for this test
    TEST_TEMP_DIR=$(mktemp -d)
    export TEST_TEMP_DIR

    # Create isolated HOME
    export ORIGINAL_HOME="$HOME"
    export HOME="$TEST_TEMP_DIR/home"
    mkdir -p "$HOME"

    # Create mock directories
    mkdir -p "$HOME/.heimdall"
    mkdir -p "$HOME/.claude"
    mkdir -p "$TEST_TEMP_DIR/project/.git"
    mkdir -p "$TEST_TEMP_DIR/project/.beads"

    # Set project directory
    export TEST_PROJECT_DIR="$TEST_TEMP_DIR/project"

    # Create mock PATH for isolated commands
    export ORIGINAL_PATH="$PATH"
    export MOCK_BIN="$TEST_TEMP_DIR/mock_bin"
    mkdir -p "$MOCK_BIN"
    export PATH="$MOCK_BIN:$PATH"
}

# Clean up test environment
teardown_test_environment() {
    # Restore original environment
    export HOME="$ORIGINAL_HOME"
    export PATH="$ORIGINAL_PATH"

    # Remove temp directory
    if [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# =============================================================================
# Mock Command Creation
# =============================================================================

# Create a mock command that succeeds with optional output
create_mock_command() {
    local cmd_name="$1"
    local exit_code="${2:-0}"
    local stdout="${3:-}"
    local stderr="${4:-}"

    cat > "$MOCK_BIN/$cmd_name" << EOF
#!/usr/bin/env bash
if [[ -n "$stdout" ]]; then
    echo "$stdout"
fi
if [[ -n "$stderr" ]]; then
    echo "$stderr" >&2
fi
exit $exit_code
EOF
    chmod +x "$MOCK_BIN/$cmd_name"
}

# Create a mock docker command
create_mock_docker() {
    local behavior="${1:-success}"

    case "$behavior" in
        "success")
            cat > "$MOCK_BIN/docker" << 'EOF'
#!/usr/bin/env bash
case "$1" in
    "info")
        echo '{"ServerVersion": "24.0.0"}'
        ;;
    "ps")
        if [[ "$*" == *"-a"* ]]; then
            echo ""
        else
            echo ""
        fi
        ;;
    "run")
        echo "container-id-12345"
        ;;
    "pull")
        echo "Pulling image..."
        ;;
    "start"|"stop"|"rm")
        echo "OK"
        ;;
    *)
        echo "docker: mock command"
        ;;
esac
exit 0
EOF
            chmod +x "$MOCK_BIN/docker"
            ;;
        "not_running")
            cat > "$MOCK_BIN/docker" << 'EOF'
#!/usr/bin/env bash
if [[ "$1" == "info" ]]; then
    echo "Cannot connect to Docker daemon" >&2
    exit 1
fi
exit 0
EOF
            chmod +x "$MOCK_BIN/docker"
            ;;
        "not_installed")
            # Remove docker from mock bin, ensuring command not found
            rm -f "$MOCK_BIN/docker" 2>/dev/null || true
            ;;
    esac
}

# Create a mock curl command
create_mock_curl() {
    local response="${1:-ok}"
    local exit_code="${2:-0}"

    cat > "$MOCK_BIN/curl" << EOF
#!/usr/bin/env bash
echo "$response"
exit $exit_code
EOF
    chmod +x "$MOCK_BIN/curl"
}

# Create mock node/npm commands
create_mock_node() {
    cat > "$MOCK_BIN/node" << 'EOF'
#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then
    echo "v20.0.0"
else
    echo "node: mock"
fi
exit 0
EOF
    chmod +x "$MOCK_BIN/node"

    cat > "$MOCK_BIN/npm" << 'EOF'
#!/usr/bin/env bash
if [[ "$1" == "--version" ]]; then
    echo "10.0.0"
else
    echo "npm: mock"
fi
exit 0
EOF
    chmod +x "$MOCK_BIN/npm"
}

# Create mock aes-bizzy CLI
create_mock_aes_bizzy() {
    local behavior="${1:-success}"

    if [[ "$behavior" == "success" ]]; then
        cat > "$MOCK_BIN/aes-bizzy" << 'EOF'
#!/usr/bin/env bash
echo "aes-bizzy: mock success"
exit 0
EOF
        chmod +x "$MOCK_BIN/aes-bizzy"
    else
        # Remove to simulate not installed
        rm -f "$MOCK_BIN/aes-bizzy" 2>/dev/null || true
    fi
}

# =============================================================================
# Assertion Helpers
# =============================================================================

# Assert file exists
assert_file_exists() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "Expected file to exist: $file" >&2
        return 1
    fi
}

# Assert directory exists
assert_dir_exists() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        echo "Expected directory to exist: $dir" >&2
        return 1
    fi
}

# Assert file contains pattern
assert_file_contains() {
    local file="$1"
    local pattern="$2"
    if ! grep -q "$pattern" "$file" 2>/dev/null; then
        echo "Expected file '$file' to contain: $pattern" >&2
        return 1
    fi
}

# Assert output contains
assert_output_contains() {
    local expected="$1"
    if [[ "$output" != *"$expected"* ]]; then
        echo "Expected output to contain: $expected" >&2
        echo "Actual output: $output" >&2
        return 1
    fi
}

# Assert output does not contain
assert_output_not_contains() {
    local unexpected="$1"
    if [[ "$output" == *"$unexpected"* ]]; then
        echo "Expected output NOT to contain: $unexpected" >&2
        return 1
    fi
}

# =============================================================================
# Fixture Helpers
# =============================================================================

# Create a sample .mcp.json file
create_sample_mcp_config() {
    local dir="${1:-$HOME/.claude}"
    mkdir -p "$dir"
    cat > "$dir/.mcp.json" << 'EOF'
{
  "mcpServers": {
    "heimdall": {
      "command": "npx",
      "args": ["@anthropic/mcp-heimdall"]
    }
  }
}
EOF
}

# Create a sample package.json
create_sample_package_json() {
    local dir="${1:-$TEST_PROJECT_DIR}"
    mkdir -p "$dir"
    cat > "$dir/package.json" << 'EOF'
{
  "name": "test-project",
  "version": "1.0.0"
}
EOF
}
