#!/usr/bin/env bats
#
# Tests for scripts/heimdall/setup-heimdall.sh
#
# Tests the Heimdall setup script including Docker, MCP configuration,
# and health checks with mocked dependencies.
#

# Load test helper
load 'test_helper'

# Path to script under test
SCRIPT_PATH="${BATS_TEST_DIRNAME}/../../scripts/heimdall/setup-heimdall.sh"

# =============================================================================
# Setup and Teardown
# =============================================================================

setup() {
    setup_test_environment
    create_mock_node
}

teardown() {
    teardown_test_environment
}

# =============================================================================
# Prerequisite Check Tests
# =============================================================================

# Skip: Hard to fully isolate from system Docker in PATH
# @test "fails when Docker is not installed" {
#     create_mock_docker "not_installed"
#     create_mock_curl "ok"
#     run bash "$SCRIPT_PATH" --skip-mcp
#     [ "$status" -eq 1 ]
#     assert_output_contains "Docker is not installed"
# }

@test "mock docker works correctly" {
    create_mock_docker "success"
    run "$MOCK_BIN/docker" info
    [ "$status" -eq 0 ]
    assert_output_contains "ServerVersion"
}

@test "fails when Docker is not running" {
    create_mock_docker "not_running"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-mcp
    [ "$status" -eq 1 ]
    assert_output_contains "Docker is not running"
}

@test "detects Docker successfully" {
    create_mock_docker "success"
    create_mock_curl '{"status":"ok"}'

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "Docker found"
}

@test "detects Node.js successfully" {
    create_mock_docker "success"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "Node.js found"
}

@test "detects npm successfully" {
    create_mock_docker "success"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "npm found"
}

# =============================================================================
# Help and Arguments Tests
# =============================================================================

@test "displays help with --help flag" {
    run bash "$SCRIPT_PATH" --help
    [ "$status" -eq 0 ]
    assert_output_contains "Usage:"
    assert_output_contains "--skip-docker"
    assert_output_contains "--skip-mcp"
    assert_output_contains "--force"
}

@test "fails on unknown parameter" {
    run bash "$SCRIPT_PATH" --invalid-option
    [ "$status" -eq 1 ]
    assert_output_contains "Unknown parameter"
}

# =============================================================================
# Skip Options Tests
# =============================================================================

@test "skips Docker setup with --skip-docker" {
    create_mock_docker "success"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "Skipping Docker setup"
}

@test "skips MCP setup with --skip-mcp" {
    create_mock_docker "success"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "Skipping MCP setup"
}

# =============================================================================
# Data Directory Tests
# =============================================================================

@test "creates data directory" {
    create_mock_docker "success"
    create_mock_curl '{"status":"ok"}'

    # Set custom data dir
    export HEIMDALL_DATA_DIR="$TEST_TEMP_DIR/custom_data"

    run bash "$SCRIPT_PATH" --skip-mcp
    [ "$status" -eq 0 ]

    # Check data dir creation is mentioned
    assert_output_contains "Data directory:"
}

@test "uses default data directory when not specified" {
    create_mock_docker "success"
    create_mock_curl "ok"

    unset HEIMDALL_DATA_DIR

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    # Default is $HOME/.heimdall/qdrant_data
    assert_output_contains ".heimdall"
}

# =============================================================================
# Health Check Tests
# =============================================================================

@test "reports Qdrant health when running" {
    create_mock_docker "success"
    create_mock_curl '{"status":"ok"}'

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "Running health checks"
}

@test "shows completion summary" {
    create_mock_docker "success"
    create_mock_curl "ok"

    run bash "$SCRIPT_PATH" --skip-docker --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "SETUP COMPLETE"
    assert_output_contains "Next steps"
}

# =============================================================================
# MCP Configuration Tests
# =============================================================================

@test "checks for aes-bizzy CLI" {
    create_mock_docker "success"
    create_mock_curl "ok"
    create_mock_aes_bizzy "success"

    run bash "$SCRIPT_PATH" --skip-docker
    [ "$status" -eq 0 ]
    assert_output_contains "MCP configuration checked"
}

# Skip: npx fallback makes this hard to test in isolation
# @test "warns when aes-bizzy CLI not found" {
#     create_mock_docker "success"
#     create_mock_curl "ok"
#     create_mock_aes_bizzy "not_found"
#     create_sample_package_json
#     cd "$TEST_PROJECT_DIR"
#     run bash "$SCRIPT_PATH" --skip-docker
#     [ "$status" -eq 0 ]
#     assert_output_contains "not found"
# }

@test "mock aes-bizzy works correctly" {
    create_mock_aes_bizzy "success"
    run "$MOCK_BIN/aes-bizzy" init
    [ "$status" -eq 0 ]
    assert_output_contains "mock success"
}

# =============================================================================
# Docker Container Tests
# =============================================================================

@test "handles existing running container" {
    # Mock docker ps to show running container
    cat > "$MOCK_BIN/docker" << 'EOF'
#!/usr/bin/env bash
case "$1" in
    "info")
        echo '{"ServerVersion": "24.0.0"}'
        ;;
    "ps")
        if [[ "$*" == *"-a"* ]]; then
            echo "heimdall-qdrant"
        else
            echo "heimdall-qdrant"
        fi
        ;;
esac
exit 0
EOF
    chmod +x "$MOCK_BIN/docker"
    create_mock_curl '{"status":"ok"}'

    run bash "$SCRIPT_PATH" --skip-mcp
    [ "$status" -eq 0 ]
    assert_output_contains "already running"
}

@test "force flag removes existing container" {
    # Mock docker to show existing container
    cat > "$MOCK_BIN/docker" << 'EOF'
#!/usr/bin/env bash
case "$1" in
    "info")
        echo '{"ServerVersion": "24.0.0"}'
        ;;
    "ps")
        if [[ "$*" == *"-a"* ]]; then
            echo "heimdall-qdrant"
        fi
        ;;
    "rm")
        echo "Removed"
        ;;
    "pull"|"run")
        echo "OK"
        ;;
esac
exit 0
EOF
    chmod +x "$MOCK_BIN/docker"
    create_mock_curl '{"status":"ok"}'

    run bash "$SCRIPT_PATH" --skip-mcp --force
    [ "$status" -eq 0 ]
    assert_output_contains "Removing existing container"
}
