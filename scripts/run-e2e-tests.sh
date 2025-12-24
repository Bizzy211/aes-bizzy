#!/usr/bin/env bash
# =============================================================================
# A.E.S Bizzy - E2E Test Runner
# =============================================================================
# Convenience script for running Docker-based E2E tests locally.
#
# Usage:
#   ./scripts/run-e2e-tests.sh [mode] [options]
#
# Modes:
#   structural  - No API keys, validates structure only (default)
#   smoke       - Minimal API calls, validates connectivity
#   integration - Full integration tests with all services
#   full        - Complete test suite
#
# Options:
#   --build     - Force rebuild of test container
#   --cleanup   - Clean up containers after tests
#   --verbose   - Show verbose output
#   --help      - Show this help message
#
# Examples:
#   ./scripts/run-e2e-tests.sh                    # Run structural tests
#   ./scripts/run-e2e-tests.sh smoke              # Run smoke tests
#   ./scripts/run-e2e-tests.sh integration --build # Rebuild and run integration
#   ./scripts/run-e2e-tests.sh full --cleanup     # Run full suite and cleanup
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
TEST_MODE="structural"
FORCE_BUILD=false
CLEANUP=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        structural|smoke|integration|full)
            TEST_MODE="$1"
            shift
            ;;
        --build)
            FORCE_BUILD=true
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [mode] [options]"
            echo ""
            echo "Modes:"
            echo "  structural  - No API keys, validates structure only (default)"
            echo "  smoke       - Minimal API calls, validates connectivity"
            echo "  integration - Full integration tests with all services"
            echo "  full        - Complete test suite"
            echo ""
            echo "Options:"
            echo "  --build     - Force rebuild of test container"
            echo "  --cleanup   - Clean up containers after tests"
            echo "  --verbose   - Show verbose output"
            echo "  --help      - Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    log_success "Docker is available"
}

check_env_file() {
    local env_file="$PROJECT_ROOT/.env.test"

    if [[ "$TEST_MODE" != "structural" ]]; then
        if [[ ! -f "$env_file" ]]; then
            log_warning ".env.test not found"
            log_info "Copy .env.test.example to .env.test and fill in your credentials:"
            log_info "  cp .env.test.example .env.test"

            if [[ "$TEST_MODE" == "smoke" ]]; then
                log_warning "Smoke tests require at least ANTHROPIC_API_KEY"
            elif [[ "$TEST_MODE" == "integration" || "$TEST_MODE" == "full" ]]; then
                log_warning "Integration tests require multiple API keys"
            fi

            read -p "Continue without .env.test? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        else
            log_success ".env.test found"
        fi
    fi
}

build_image() {
    log_info "Building test container..."

    local build_args=""
    if [[ "$VERBOSE" == true ]]; then
        build_args="--progress=plain"
    fi

    if ! docker build $build_args -f "$PROJECT_ROOT/Dockerfile.test" -t aes-bizzy-test:latest "$PROJECT_ROOT"; then
        log_error "Failed to build test container"
        exit 1
    fi

    log_success "Test container built successfully"
}

run_tests() {
    log_info "Running $TEST_MODE tests..."

    local compose_args="-f $PROJECT_ROOT/docker-compose.test.yml"
    local env_args=""

    # Add env file if it exists and not structural tests
    if [[ "$TEST_MODE" != "structural" && -f "$PROJECT_ROOT/.env.test" ]]; then
        env_args="--env-file $PROJECT_ROOT/.env.test"
    fi

    # Start Qdrant for integration/full tests
    if [[ "$TEST_MODE" == "integration" || "$TEST_MODE" == "full" ]]; then
        log_info "Starting Qdrant service..."
        docker-compose $compose_args up -d qdrant

        # Wait for Qdrant to be healthy
        log_info "Waiting for Qdrant to be ready..."
        local max_attempts=30
        local attempt=0
        while ! docker-compose $compose_args exec -T qdrant curl -s http://localhost:6333/health &> /dev/null; do
            attempt=$((attempt + 1))
            if [[ $attempt -ge $max_attempts ]]; then
                log_error "Qdrant failed to start"
                exit 1
            fi
            sleep 2
        done
        log_success "Qdrant is ready"
    fi

    # Run tests
    local test_result=0
    docker-compose $compose_args $env_args run --rm test-runner --$TEST_MODE || test_result=$?

    return $test_result
}

cleanup() {
    log_info "Cleaning up containers..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.test.yml" down -v
    log_success "Cleanup complete"
}

# Main execution
main() {
    echo ""
    echo "================================================"
    echo "  A.E.S Bizzy - E2E Test Runner"
    echo "  Mode: $TEST_MODE"
    echo "================================================"
    echo ""

    cd "$PROJECT_ROOT"

    # Pre-flight checks
    check_docker
    check_env_file

    # Build if needed
    if [[ "$FORCE_BUILD" == true ]] || ! docker image inspect aes-bizzy-test:latest &> /dev/null; then
        build_image
    else
        log_info "Using existing test container (use --build to rebuild)"
    fi

    # Run tests
    local test_result=0
    run_tests || test_result=$?

    # Cleanup if requested
    if [[ "$CLEANUP" == true ]]; then
        cleanup
    fi

    # Report result
    echo ""
    echo "================================================"
    if [[ $test_result -eq 0 ]]; then
        log_success "All $TEST_MODE tests passed!"
    else
        log_error "$TEST_MODE tests failed with exit code $test_result"
    fi
    echo "================================================"

    exit $test_result
}

# Handle cleanup on exit if requested
if [[ "$CLEANUP" == true ]]; then
    trap cleanup EXIT
fi

main
