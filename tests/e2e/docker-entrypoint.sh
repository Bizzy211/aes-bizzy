#!/bin/bash
# =============================================================================
# A.E.S Bizzy - E2E Test Entrypoint
# =============================================================================
# Orchestrates E2E test execution with configurable test modes
#
# Usage:
#   ./docker-entrypoint.sh --structural   # No API calls
#   ./docker-entrypoint.sh --smoke        # Minimal API calls
#   ./docker-entrypoint.sh --integration  # Full API integration
#   ./docker-entrypoint.sh --full         # Everything
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_header() { echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}\n"; }

# Parse arguments
TEST_MODE="${1:---structural}"
EXTRA_ARGS="${@:2}"

# Remove leading dashes for mode name
MODE_NAME="${TEST_MODE#--}"

log_header "A.E.S Bizzy E2E Test Suite"
echo "Test Mode: $MODE_NAME"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# =============================================================================
# Pre-flight Credential Validation (Option A: Fail Fast)
# =============================================================================
# Validates ALL required credentials BEFORE running any tests.
# Missing credentials cause immediate exit with clear error messaging.
#
# Required credentials verified from code analysis (Task 73):
# - GITHUB_TOKEN: GitHub CLI, repo sync (src/installers/api-keys.ts)
# - EXA_API_KEY: exa MCP server, skills (mcp__exa__*)
# - REF_API_KEY: ref MCP server, skills (mcp__ref__*)
# - SUPABASE_URL: projectmgr-context MCP
# - SUPABASE_KEY: projectmgr-context MCP (JWT format)
# - ANTHROPIC_API_KEY: TaskMaster MCP, hook LLM utilities
# =============================================================================

log_header "Pre-flight Credential Validation"

# Arrays to track validation results
declare -a MISSING_REQUIRED=()
declare -a MISSING_OPTIONAL=()
declare -a VALIDATED=()

validate_credential() {
    local var_name="$1"
    local required="$2"
    local description="$3"
    local value="${!var_name}"

    if [[ -n "$value" ]]; then
        local masked="${value:0:4}****${value: -4}"
        VALIDATED+=("$var_name|$masked|$description")
        return 0
    elif [[ "$required" == "required" ]]; then
        MISSING_REQUIRED+=("$var_name|$description")
        return 1
    else
        MISSING_OPTIONAL+=("$var_name|$description")
        return 0
    fi
}

# Define required credentials per test mode
case "$MODE_NAME" in
    "structural")
        log_info "Structural mode - no credentials required (no API calls)"
        ;;

    "smoke")
        log_info "Smoke mode - validating core credentials..."
        echo ""

        # Core required credentials
        validate_credential "ANTHROPIC_API_KEY" "required" "TaskMaster MCP, hook LLM"
        validate_credential "GITHUB_TOKEN" "required" "GitHub CLI, repo sync"
        validate_credential "EXA_API_KEY" "required" "exa MCP (mcp__exa__*)"
        validate_credential "REF_API_KEY" "required" "ref MCP (mcp__ref__*)"
        validate_credential "SUPABASE_URL" "required" "projectmgr-context MCP"
        validate_credential "SUPABASE_KEY" "required" "projectmgr-context MCP"

        # Optional for smoke
        validate_credential "OPENAI_API_KEY" "optional" "Hook LLM/TTS utilities"
        ;;

    "integration"|"full")
        log_info "Integration/Full mode - validating all credentials..."
        echo ""

        # === REQUIRED CREDENTIALS ===
        validate_credential "ANTHROPIC_API_KEY" "required" "TaskMaster MCP, hook LLM"
        validate_credential "GITHUB_TOKEN" "required" "GitHub CLI, repo sync"
        validate_credential "EXA_API_KEY" "required" "exa MCP (mcp__exa__*)"
        validate_credential "REF_API_KEY" "required" "ref MCP (mcp__ref__*)"
        validate_credential "SUPABASE_URL" "required" "projectmgr-context MCP"
        validate_credential "SUPABASE_KEY" "required" "projectmgr-context MCP"

        # === OPTIONAL CREDENTIALS ===
        validate_credential "OPENAI_API_KEY" "optional" "Hook LLM/TTS utilities"
        validate_credential "PERPLEXITY_API_KEY" "optional" "TaskMaster research"
        validate_credential "TAVILY_API_KEY" "optional" "tavily-search-server MCP"
        validate_credential "FIRECRAWL_API_KEY" "optional" "firecrawl MCP"
        validate_credential "API_KEY" "optional" "Magic UX/UI MCP (21st.dev)"
        validate_credential "SUPABASE_ACCESS_TOKEN" "optional" "Official Supabase MCP"
        validate_credential "ELEVENLABS_API_KEY" "optional" "ElevenLabs TTS"
        ;;
esac

# Display validation results
if [[ ${#VALIDATED[@]} -gt 0 ]]; then
    echo ""
    echo -e "${GREEN}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│  VALIDATED CREDENTIALS                                          │${NC}"
    echo -e "${GREEN}├─────────────────────────────────────────────────────────────────┤${NC}"
    for item in "${VALIDATED[@]}"; do
        IFS='|' read -r name value desc <<< "$item"
        printf "${GREEN}│${NC}  %-25s ${GREEN}%s${NC}\n" "$name" "$value"
    done
    echo -e "${GREEN}└─────────────────────────────────────────────────────────────────┘${NC}"
fi

if [[ ${#MISSING_OPTIONAL[@]} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│  OPTIONAL CREDENTIALS (not set - some tests may skip)           │${NC}"
    echo -e "${YELLOW}├─────────────────────────────────────────────────────────────────┤${NC}"
    for item in "${MISSING_OPTIONAL[@]}"; do
        IFS='|' read -r name desc <<< "$item"
        printf "${YELLOW}│${NC}  %-25s %s\n" "$name" "$desc"
    done
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────────────┘${NC}"
fi

# FAIL FAST if any required credentials are missing
if [[ ${#MISSING_REQUIRED[@]} -gt 0 ]]; then
    echo ""
    echo -e "${RED}┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${RED}│  MISSING REQUIRED CREDENTIALS - CANNOT PROCEED                  │${NC}"
    echo -e "${RED}├─────────────────────────────────────────────────────────────────┤${NC}"
    for item in "${MISSING_REQUIRED[@]}"; do
        IFS='|' read -r name desc <<< "$item"
        printf "${RED}│${NC}  %-25s %s\n" "$name" "$desc"
    done
    echo -e "${RED}├─────────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${RED}│  ACTION: Set these in .env.test before running tests            │${NC}"
    echo -e "${RED}│  See: docs/AUTHENTICATION-CREDENTIALS-TAXONOMY.md               │${NC}"
    echo -e "${RED}└─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    log_error "Pre-flight validation FAILED. ${#MISSING_REQUIRED[@]} required credential(s) missing."
    exit 1
fi

log_success "Pre-flight validation PASSED. All required credentials present."

# =============================================================================
# Service Health Checks
# =============================================================================
log_header "Service Health Checks"

check_service() {
    local name="$1"
    local url="$2"
    local max_attempts="${3:-30}"

    log_info "Checking $name at $url..."

    for i in $(seq 1 $max_attempts); do
        if curl -sf "$url" > /dev/null 2>&1; then
            log_success "$name is healthy"
            return 0
        fi
        sleep 1
    done

    log_error "$name is not responding after $max_attempts attempts"
    return 1
}

# Check Qdrant if URL is set
if [[ -n "$QDRANT_URL" ]]; then
    check_service "Qdrant" "$QDRANT_URL/health" 30 || {
        log_warning "Qdrant not available - Heimdall tests will be skipped"
    }
fi

# =============================================================================
# Test Execution
# =============================================================================
log_header "Running Tests: $MODE_NAME"

RESULTS_DIR="/app/test-results"
mkdir -p "$RESULTS_DIR"

run_test_suite() {
    local suite_name="$1"
    local command="$2"

    log_info "Running: $suite_name"

    if eval "$command"; then
        log_success "$suite_name passed"
        return 0
    else
        log_error "$suite_name failed"
        return 1
    fi
}

# Track overall results
TESTS_PASSED=0
TESTS_FAILED=0

case "$MODE_NAME" in
    "structural")
        # No API calls - validate structure only
        log_info "Running structural validation tests..."

        run_test_suite "TypeScript Build Check" "npm run typecheck" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Component Validation" "npm run test:components" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Hook Tests (mocked)" "npm run test:hooks" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Unit Tests" "npm run test:run -- --reporter=verbose" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        ;;

    "smoke")
        # Minimal API calls - quick validation
        log_info "Running smoke tests with minimal API calls..."

        run_test_suite "Structural Tests" "$0 --structural" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "API Connectivity" "npm run test:run -- tests/e2e/smoke/" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        ;;

    "integration")
        # Full API integration tests
        log_info "Running integration tests with full API access..."

        run_test_suite "Smoke Tests" "$0 --smoke" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Beads Integration" "npm run test:run -- tests/e2e/integration/beads.test.ts" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Task Master Integration" "npm run test:run -- tests/e2e/integration/taskmaster.test.ts" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Agent Spawning" "npm run test:run -- tests/e2e/integration/agents.test.ts" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))

        if [[ -n "$GITHUB_TOKEN" ]]; then
            run_test_suite "GitHub Integration" "npm run test:run -- tests/e2e/integration/github.test.ts" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        fi

        if [[ -n "$QDRANT_URL" ]]; then
            run_test_suite "Heimdall Integration" "npm run test:run -- tests/e2e/integration/heimdall.test.ts" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        fi
        ;;

    "full")
        # Complete test suite
        log_info "Running complete test suite..."

        run_test_suite "Integration Tests" "$0 --integration" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "E2E Workflows" "npm run test:run -- tests/e2e/workflows/" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        run_test_suite "Performance Tests" "npm run test:run -- tests/e2e/performance/" && ((TESTS_PASSED++)) || ((TESTS_FAILED++))
        ;;

    *)
        log_error "Unknown test mode: $MODE_NAME"
        echo "Available modes: --structural, --smoke, --integration, --full"
        exit 1
        ;;
esac

# =============================================================================
# Results Summary
# =============================================================================
log_header "Test Results Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "Mode:   $MODE_NAME"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo "Total:  $TOTAL_TESTS"
echo ""

# Generate results file
cat > "$RESULTS_DIR/summary.json" << EOF
{
  "mode": "$MODE_NAME",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "total": $TOTAL_TESTS,
  "success": $([ $TESTS_FAILED -eq 0 ] && echo "true" || echo "false")
}
EOF

log_info "Results written to $RESULTS_DIR/summary.json"

if [[ $TESTS_FAILED -eq 0 ]]; then
    log_success "All tests passed!"
    exit 0
else
    log_error "$TESTS_FAILED test suite(s) failed"
    exit 1
fi
