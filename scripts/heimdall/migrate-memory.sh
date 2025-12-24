#!/usr/bin/env bash
#
# Heimdall Memory Migration Script
# Re-tag memories between projects or update memory metadata
#
# Usage:
#   ./migrate-memory.sh --from-project OLD --to-project NEW [--dry-run]
#   ./migrate-memory.sh --retag "old:tag" --with "new:tag" [--dry-run]
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

# Migration options
FROM_PROJECT=""
TO_PROJECT=""
OLD_TAG=""
NEW_TAG=""
DRY_RUN=false
LIMIT=1000

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --from-project) FROM_PROJECT="$2"; shift ;;
        --to-project) TO_PROJECT="$2"; shift ;;
        --retag) OLD_TAG="$2"; shift ;;
        --with) NEW_TAG="$2"; shift ;;
        --dry-run) DRY_RUN=true ;;
        --limit) LIMIT="$2"; shift ;;
        --collection) COLLECTION_NAME="$2"; shift ;;
        -h|--help)
            echo "Usage:"
            echo "  $0 --from-project OLD --to-project NEW [--dry-run]"
            echo "  $0 --retag 'old:tag' --with 'new:tag' [--dry-run]"
            echo ""
            echo "Options:"
            echo "  --from-project  Source project tag"
            echo "  --to-project    Target project tag"
            echo "  --retag         Old tag to replace"
            echo "  --with          New tag to use"
            echo "  --dry-run       Show what would be changed without changing"
            echo "  --limit N       Maximum memories to process (default: 1000)"
            echo "  --collection    Collection name (default: agent_memories)"
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
if [ -n "$FROM_PROJECT" ] && [ -z "$TO_PROJECT" ]; then
    log_error "--to-project is required when using --from-project"
    exit 1
fi

if [ -n "$OLD_TAG" ] && [ -z "$NEW_TAG" ]; then
    log_error "--with is required when using --retag"
    exit 1
fi

if [ -z "$FROM_PROJECT" ] && [ -z "$OLD_TAG" ]; then
    log_error "Either --from-project or --retag is required"
    exit 1
fi

# Header
echo ""
echo "=============================================="
echo "       HEIMDALL MEMORY MIGRATION             "
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY-RUN MODE - No changes will be made"
    echo ""
fi

# Check Qdrant availability
log_info "Checking Qdrant availability..."
if ! curl -s "${QDRANT_URL}/health" &> /dev/null; then
    log_error "Qdrant is not accessible at ${QDRANT_URL}"
    exit 1
fi
log_success "Qdrant is accessible"

# Determine search filter
if [ -n "$FROM_PROJECT" ]; then
    SEARCH_TAG="project:${FROM_PROJECT}"
    NEW_SEARCH_TAG="project:${TO_PROJECT}"
    log_info "Migrating: project:${FROM_PROJECT} -> project:${TO_PROJECT}"
else
    SEARCH_TAG="$OLD_TAG"
    NEW_SEARCH_TAG="$NEW_TAG"
    log_info "Migrating: ${OLD_TAG} -> ${NEW_TAG}"
fi

# Query memories with the old tag
log_info "Searching for memories with tag: ${SEARCH_TAG}..."

# Build scroll query
SCROLL_QUERY=$(cat << EOF
{
    "filter": {
        "must": [
            {
                "key": "tags",
                "match": {
                    "value": "${SEARCH_TAG}"
                }
            }
        ]
    },
    "limit": ${LIMIT},
    "with_payload": true,
    "with_vector": false
}
EOF
)

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

# Parse results
POINTS=$(echo "$SCROLL_RESULT" | grep -o '"points":\[[^]]*\]' | sed 's/"points"://')
POINT_COUNT=$(echo "$POINTS" | grep -o '"id"' | wc -l)

if [ "$POINT_COUNT" -eq 0 ]; then
    log_warning "No memories found with tag: ${SEARCH_TAG}"
    exit 0
fi

log_info "Found ${POINT_COUNT} memories to migrate"

# Process each memory
MIGRATED=0
FAILED=0

# Extract point IDs and update each
echo "$SCROLL_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | while read -r POINT_ID; do
    if [ -z "$POINT_ID" ]; then
        continue
    fi

    # Get current payload
    POINT_DATA=$(curl -s "${QDRANT_URL}/collections/${COLLECTION_NAME}/points/${POINT_ID}" 2>/dev/null)

    # Extract current tags
    CURRENT_TAGS=$(echo "$POINT_DATA" | grep -o '"tags":\[[^]]*\]' | sed 's/"tags"://')

    if [ -z "$CURRENT_TAGS" ]; then
        log_warning "Could not extract tags for point: ${POINT_ID}"
        continue
    fi

    # Replace old tag with new tag
    NEW_TAGS=$(echo "$CURRENT_TAGS" | sed "s/${SEARCH_TAG}/${NEW_SEARCH_TAG}/g")

    if [ "$DRY_RUN" = true ]; then
        log_dry "Would update ${POINT_ID}: ${SEARCH_TAG} -> ${NEW_SEARCH_TAG}"
    else
        # Update the point with new tags
        UPDATE_PAYLOAD=$(cat << EOF
{
    "points": ["${POINT_ID}"],
    "payload": {
        "tags": ${NEW_TAGS}
    }
}
EOF
)

        UPDATE_RESULT=$(curl -s -X POST \
            "${QDRANT_URL}/collections/${COLLECTION_NAME}/points/payload" \
            -H "Content-Type: application/json" \
            -d "$UPDATE_PAYLOAD" \
            2>/dev/null)

        if echo "$UPDATE_RESULT" | grep -q '"status":"ok"'; then
            log_success "Updated: ${POINT_ID}"
            MIGRATED=$((MIGRATED + 1))
        else
            log_error "Failed to update: ${POINT_ID}"
            FAILED=$((FAILED + 1))
        fi
    fi
done

# Summary
echo ""
echo "=============================================="
echo "          MIGRATION COMPLETE                 "
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "DRY-RUN: ${POINT_COUNT} memories would be migrated"
    echo ""
    echo "To apply changes, run without --dry-run"
else
    echo "Memories Found:    ${POINT_COUNT}"
    echo "Successfully Migrated: ${MIGRATED}"
    echo "Failed:            ${FAILED}"
fi

echo ""
log_success "Migration completed!"
