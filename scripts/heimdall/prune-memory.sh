#!/usr/bin/env bash
#
# Heimdall Memory Prune Script
# Removes old or unwanted memories with configurable retention
#
# Usage:
#   ./prune-memory.sh --older-than 30 [--dry-run]
#   ./prune-memory.sh --type context --older-than 7 [--dry-run]
#   ./prune-memory.sh --tag "project:old-project" [--dry-run]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
QDRANT_URL="${QDRANT_URL:-http://localhost:6333}"
COLLECTION_NAME="${HEIMDALL_COLLECTION:-agent_memories}"

# Prune options
OLDER_THAN_DAYS=""
MEMORY_TYPE=""
TAG_FILTER=""
DRY_RUN=false
LIMIT=1000
CONFIRM=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --older-than) OLDER_THAN_DAYS="$2"; shift ;;
        --type) MEMORY_TYPE="$2"; shift ;;
        --tag) TAG_FILTER="$2"; shift ;;
        --dry-run) DRY_RUN=true ;;
        --yes|-y) CONFIRM=true ;;
        --limit) LIMIT="$2"; shift ;;
        --collection) COLLECTION_NAME="$2"; shift ;;
        -h|--help)
            echo "Usage:"
            echo "  $0 --older-than DAYS [--type TYPE] [--dry-run]"
            echo "  $0 --tag 'project:old' [--dry-run]"
            echo ""
            echo "Options:"
            echo "  --older-than DAYS  Prune memories older than N days"
            echo "  --type TYPE        Filter by memory type (lesson, error, context, etc.)"
            echo "  --tag TAG          Filter by specific tag"
            echo "  --dry-run          Show what would be deleted without deleting"
            echo "  --yes, -y          Skip confirmation prompt"
            echo "  --limit N          Maximum memories to process (default: 1000)"
            echo "  --collection       Collection name (default: agent_memories)"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_dry() { echo -e "${YELLOW}[DRY-RUN]${NC} $1"; }

# Validate arguments
if [ -z "$OLDER_THAN_DAYS" ] && [ -z "$TAG_FILTER" ]; then
    log_error "Either --older-than or --tag is required"
    exit 1
fi

# Header
echo ""
echo "=============================================="
echo "       HEIMDALL MEMORY PRUNE                 "
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY-RUN MODE - No deletions will occur"
    echo ""
fi

# Check Qdrant availability
log_info "Checking Qdrant availability..."
if ! curl -s "${QDRANT_URL}/health" &> /dev/null; then
    log_error "Qdrant is not accessible at ${QDRANT_URL}"
    exit 1
fi
log_success "Qdrant is accessible"

# Build filter conditions
FILTER_CONDITIONS=()

# Add date filter
if [ -n "$OLDER_THAN_DAYS" ]; then
    CUTOFF_DATE=$(date -d "-${OLDER_THAN_DAYS} days" +%s 2>/dev/null || \
                  date -v "-${OLDER_THAN_DAYS}d" +%s 2>/dev/null)

    if [ -z "$CUTOFF_DATE" ]; then
        log_error "Could not calculate cutoff date"
        exit 1
    fi

    FILTER_CONDITIONS+=("{ \"key\": \"created_at\", \"range\": { \"lt\": ${CUTOFF_DATE} } }")
    log_info "Filtering: older than ${OLDER_THAN_DAYS} days"
fi

# Add type filter
if [ -n "$MEMORY_TYPE" ]; then
    FILTER_CONDITIONS+=("{ \"key\": \"memory_type\", \"match\": { \"value\": \"${MEMORY_TYPE}\" } }")
    log_info "Filtering: type = ${MEMORY_TYPE}"
fi

# Add tag filter
if [ -n "$TAG_FILTER" ]; then
    FILTER_CONDITIONS+=("{ \"key\": \"tags\", \"match\": { \"value\": \"${TAG_FILTER}\" } }")
    log_info "Filtering: tag = ${TAG_FILTER}"
fi

# Build filter JSON
FILTER_MUST=$(printf '%s,' "${FILTER_CONDITIONS[@]}" | sed 's/,$//')

SCROLL_QUERY=$(cat << EOF
{
    "filter": {
        "must": [${FILTER_MUST}]
    },
    "limit": ${LIMIT},
    "with_payload": true,
    "with_vector": false
}
EOF
)

# Query memories to prune
log_info "Searching for memories to prune..."

SCROLL_RESULT=$(curl -s -X POST \
    "${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll" \
    -H "Content-Type: application/json" \
    -d "$SCROLL_QUERY" \
    2>/dev/null)

# Check for errors
if echo "$SCROLL_RESULT" | grep -q '"status":"error"'; then
    log_error "Failed to query memories"
    echo "$SCROLL_RESULT"
    exit 1
fi

# Count points
POINT_COUNT=$(echo "$SCROLL_RESULT" | grep -o '"id"' | wc -l)

if [ "$POINT_COUNT" -eq 0 ]; then
    log_info "No memories found matching criteria"
    exit 0
fi

log_warning "Found ${POINT_COUNT} memories to prune"

# Show sample of what will be deleted
echo ""
log_info "Sample of memories to be pruned:"
echo "$SCROLL_RESULT" | grep -o '"content":"[^"]*"' | head -5 | while read -r content; do
    preview=$(echo "$content" | cut -d'"' -f4 | head -c 80)
    echo "  - ${preview}..."
done
echo ""

# Confirmation
if [ "$DRY_RUN" = false ] && [ "$CONFIRM" = false ]; then
    read -p "Are you sure you want to delete ${POINT_COUNT} memories? (yes/no): " answer
    if [ "$answer" != "yes" ]; then
        log_info "Aborted by user"
        exit 0
    fi
fi

# Extract point IDs
POINT_IDS=$(echo "$SCROLL_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | tr '\n' ',' | sed 's/,$//')

if [ -z "$POINT_IDS" ]; then
    log_error "Could not extract point IDs"
    exit 1
fi

# Convert to JSON array
POINT_IDS_JSON=$(echo "$POINT_IDS" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
POINT_IDS_JSON="[${POINT_IDS_JSON}]"

if [ "$DRY_RUN" = true ]; then
    log_dry "Would delete ${POINT_COUNT} memories"
    echo ""
    echo "Point IDs that would be deleted:"
    echo "$POINT_IDS" | tr ',' '\n' | head -10
    if [ "$POINT_COUNT" -gt 10 ]; then
        echo "... and $((POINT_COUNT - 10)) more"
    fi
else
    # Delete memories
    log_info "Deleting ${POINT_COUNT} memories..."

    DELETE_QUERY=$(cat << EOF
{
    "points": ${POINT_IDS_JSON}
}
EOF
)

    DELETE_RESULT=$(curl -s -X POST \
        "${QDRANT_URL}/collections/${COLLECTION_NAME}/points/delete" \
        -H "Content-Type: application/json" \
        -d "$DELETE_QUERY" \
        2>/dev/null)

    if echo "$DELETE_RESULT" | grep -q '"status":"ok"'; then
        log_success "Successfully deleted ${POINT_COUNT} memories"
    else
        log_error "Failed to delete memories"
        echo "$DELETE_RESULT"
        exit 1
    fi
fi

# Summary
echo ""
echo "=============================================="
echo "          PRUNE COMPLETE                     "
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "DRY-RUN: ${POINT_COUNT} memories would be deleted"
    echo ""
    echo "To apply changes, run without --dry-run"
else
    echo "Memories Deleted: ${POINT_COUNT}"
fi

echo ""
log_success "Prune completed!"
