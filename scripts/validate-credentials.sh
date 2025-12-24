#!/bin/bash
# =============================================================================
# Credential Validation Script
# =============================================================================
# Validates environment variables against expected patterns from:
# - docs/AUTHENTICATION-CREDENTIALS-TAXONOMY.md
# - .claude/mcp.json (ground truth)
#
# Usage:
#   ./scripts/validate-credentials.sh [--verbose] [--strict]
#
# Options:
#   --verbose   Show detailed validation info
#   --strict    Exit with error if any required credential is missing
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VERBOSE=false
STRICT=false
ERRORS=0
WARNINGS=0

# Parse arguments
for arg in "$@"; do
  case $arg in
    --verbose)
      VERBOSE=true
      ;;
    --strict)
      STRICT=true
      ;;
  esac
done

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
  ((WARNINGS++))
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  ((ERRORS++))
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[DEBUG]${NC} $1"
  fi
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_prefix() {
  local name="$1"
  local value="$2"
  local prefix="$3"
  local required="$4"

  if [ -z "$value" ]; then
    if [ "$required" = "true" ]; then
      log_error "$name: Missing (REQUIRED)"
      return 1
    else
      log_warning "$name: Not set (optional)"
      return 0
    fi
  fi

  if [[ "$value" == "$prefix"* ]]; then
    local masked="${value:0:${#prefix}}****${value: -4}"
    log_success "$name: Valid format ($masked)"
    return 0
  else
    log_error "$name: Invalid format - expected prefix '$prefix'"
    return 1
  fi
}

validate_github_token() {
  local value="${GITHUB_TOKEN:-$GH_TOKEN}"

  if [ -z "$value" ]; then
    log_warning "GITHUB_TOKEN: Not set (checking gh CLI...)"
    if command -v gh &> /dev/null; then
      if gh auth status &> /dev/null; then
        log_success "GITHUB_TOKEN: Available via 'gh auth token'"
        return 0
      fi
    fi
    log_error "GITHUB_TOKEN: Not available"
    return 1
  fi

  # Check for valid prefixes
  if [[ "$value" == ghp_* ]] || [[ "$value" == gho_* ]] || [[ "$value" == github_pat_* ]]; then
    local masked="${value:0:4}****${value: -4}"
    log_success "GITHUB_TOKEN: Valid PAT format ($masked)"
    return 0
  else
    log_error "GITHUB_TOKEN: Invalid format - expected ghp_*, gho_*, or github_pat_*"
    return 1
  fi
}

validate_jwt() {
  local name="$1"
  local value="$2"
  local required="$3"

  if [ -z "$value" ]; then
    if [ "$required" = "true" ]; then
      log_error "$name: Missing (REQUIRED)"
      return 1
    else
      log_warning "$name: Not set (optional)"
      return 0
    fi
  fi

  if [[ "$value" == eyJ* ]]; then
    log_success "$name: Valid JWT format (eyJ****)"
    return 0
  else
    log_error "$name: Invalid format - expected JWT (eyJ*)"
    return 1
  fi
}

validate_length() {
  local name="$1"
  local value="$2"
  local min_length="$3"
  local required="$4"

  if [ -z "$value" ]; then
    if [ "$required" = "true" ]; then
      log_error "$name: Missing (REQUIRED)"
      return 1
    else
      log_warning "$name: Not set (optional)"
      return 0
    fi
  fi

  if [ ${#value} -ge "$min_length" ]; then
    local masked="${value:0:4}****${value: -4}"
    log_success "$name: Valid (length: ${#value}, min: $min_length)"
    return 0
  else
    log_error "$name: Too short (length: ${#value}, min: $min_length)"
    return 1
  fi
}

# =============================================================================
# Main Validation
# =============================================================================

echo ""
echo "=============================================="
echo "  A.E.S Bizzy Credential Validation"
echo "=============================================="
echo ""

# --- API Keys ---
echo "--- API Keys ---"

validate_prefix "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY" "sk-ant-" "false"
validate_prefix "OPENAI_API_KEY" "$OPENAI_API_KEY" "sk-" "false"
validate_prefix "REF_API_KEY" "$REF_API_KEY" "ref-" "true"
validate_prefix "TAVILY_API_KEY" "$TAVILY_API_KEY" "tvly-" "false"
validate_prefix "FIRECRAWL_API_KEY" "$FIRECRAWL_API_KEY" "fc-" "false"
validate_prefix "PERPLEXITY_API_KEY" "$PERPLEXITY_API_KEY" "pplx-" "false"

# EXA uses UUID format - just validate length
validate_length "EXA_API_KEY" "$EXA_API_KEY" 10 "true"

# Magic UX/UI uses API_KEY (not MAGIC_21ST_API_KEY!)
validate_length "API_KEY (21st.dev)" "$API_KEY" 10 "false"

echo ""
echo "--- Personal Access Tokens (PATs) ---"

validate_github_token
validate_prefix "SUPABASE_ACCESS_TOKEN" "$SUPABASE_ACCESS_TOKEN" "sbp_" "false"
validate_prefix "SUPABASE_API_KEY" "$SUPABASE_API_KEY" "sbp_" "false"

echo ""
echo "--- JWT Tokens ---"

validate_jwt "SUPABASE_KEY" "$SUPABASE_KEY" "false"
validate_jwt "SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "false"
validate_jwt "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "false"

echo ""
echo "--- URLs ---"

if [ -n "$SUPABASE_URL" ]; then
  if [[ "$SUPABASE_URL" == https://*.supabase.co ]]; then
    log_success "SUPABASE_URL: Valid format"
  else
    log_warning "SUPABASE_URL: Non-standard format ($SUPABASE_URL)"
  fi
else
  log_warning "SUPABASE_URL: Not set"
fi

if [ -n "$QDRANT_URL" ]; then
  log_success "QDRANT_URL: Set to $QDRANT_URL"
else
  log_verbose "QDRANT_URL: Not set (auto-configured in Docker)"
fi

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "=============================================="
echo "  Validation Summary"
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  log_success "All credentials validated successfully!"
elif [ $ERRORS -eq 0 ]; then
  log_warning "$WARNINGS warning(s), 0 errors"
  echo ""
  echo "Some optional credentials are missing. Tests may skip related features."
else
  log_error "$ERRORS error(s), $WARNINGS warning(s)"
  echo ""
  if [ "$STRICT" = true ]; then
    echo "Strict mode: Exiting with error due to missing required credentials."
    exit 1
  fi
fi

echo ""

# Exit with error count in strict mode
if [ "$STRICT" = true ] && [ $ERRORS -gt 0 ]; then
  exit 1
fi

exit 0
