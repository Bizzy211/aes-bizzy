#!/usr/bin/env bash
#
# Heimdall Memory Export Script
# Export memories to JSON with flexible filtering
#
# Usage:
#   ./export-memory.sh --output memories.json
#   ./export-memory.sh --project my-app --output my-app-memories.json
#   ./export-memory.sh --type lesson --output lessons.json
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

# Export options
OUTPUT_FILE=""
PROJECT_FILTER=""
TYPE_FILTER=""
TAG_FILTER=""
LIMIT=10000
FORMAT="json"
INCLUDE_VECTORS=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --output|-o) OUTPUT_FILE="$2"; shift ;;
        --project) PROJECT_FILTER="$2"; shift ;;
        --type) TYPE_FILTER="$2"; shift ;;
        --tag) TAG_FILTER="$2"; shift ;;
        --limit) LIMIT="$2"; shift ;;
        --format) FORMAT="$2"; shift ;;
        --include-vectors) INCLUDE_VECTORS=true ;;
        --collection) COLLECTION_NAME="$2"; shift ;;
        -h|--help)
            echo "Usage:"
            echo "  $0 --output FILE [--project NAME] [--type TYPE] [--tag TAG]"
            echo ""
            echo "Options:"
            echo "  --output, -o FILE  Output file path (required)"
            echo "  --project NAME     Filter by project tag"
            echo "  --type TYPE        Filter by memory type"
            echo "  --tag TAG          Filter by specific tag"
            echo "  --limit N          Maximum memories to export (default: 10000)"
            echo "  --format FORMAT    Output format: json, jsonl (default: json)"
            echo "  --include-vectors  Include vector embeddings (larger file)"
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

# Validate arguments
if [ -z "$OUTPUT_FILE" ]; then
    log_error "--output is required"
    exit 1
fi

# Header
echo ""
echo "=============================================="
echo "       HEIMDALL MEMORY EXPORT                "
echo "=============================================="
echo ""

# Check Qdrant availability
log_info "Checking Qdrant availability..."
if ! curl -s "${QDRANT_URL}/health" &> /dev/null; then
    log_error "Qdrant is not accessible at ${QDRANT_URL}"
    exit 1
fi
log_success "Qdrant is accessible"

# Build filter conditions
FILTER_CONDITIONS=()

# Add project filter
if [ -n "$PROJECT_FILTER" ]; then
    FILTER_CONDITIONS+=("{ \"key\": \"tags\", \"match\": { \"value\": \"project:${PROJECT_FILTER}\" } }")
    log_info "Filtering: project = ${PROJECT_FILTER}"
fi

# Add type filter
if [ -n "$TYPE_FILTER" ]; then
    FILTER_CONDITIONS+=("{ \"key\": \"memory_type\", \"match\": { \"value\": \"${TYPE_FILTER}\" } }")
    log_info "Filtering: type = ${TYPE_FILTER}"
fi

# Add tag filter
if [ -n "$TAG_FILTER" ]; then
    FILTER_CONDITIONS+=("{ \"key\": \"tags\", \"match\": { \"value\": \"${TAG_FILTER}\" } }")
    log_info "Filtering: tag = ${TAG_FILTER}"
fi

# Build filter JSON
if [ ${#FILTER_CONDITIONS[@]} -gt 0 ]; then
    FILTER_MUST=$(printf '%s,' "${FILTER_CONDITIONS[@]}" | sed 's/,$//')
    FILTER_JSON="\"filter\": { \"must\": [${FILTER_MUST}] },"
else
    FILTER_JSON=""
fi

# Determine with_vector setting
if [ "$INCLUDE_VECTORS" = true ]; then
    WITH_VECTOR="true"
else
    WITH_VECTOR="false"
fi

SCROLL_QUERY=$(cat << EOF
{
    ${FILTER_JSON}
    "limit": ${LIMIT},
    "with_payload": true,
    "with_vector": ${WITH_VECTOR}
}
EOF
)

# Query memories
log_info "Exporting memories..."

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

# Extract points
POINTS=$(echo "$SCROLL_RESULT" | grep -o '"points":\[.*\]' | sed 's/"points"://')

# Count memories
MEMORY_COUNT=$(echo "$SCROLL_RESULT" | grep -o '"id"' | wc -l)

if [ "$MEMORY_COUNT" -eq 0 ]; then
    log_warning "No memories found matching criteria"
    echo "[]" > "$OUTPUT_FILE"
    exit 0
fi

log_info "Found ${MEMORY_COUNT} memories to export"

# Create output directory if needed
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [ -n "$OUTPUT_DIR" ] && [ "$OUTPUT_DIR" != "." ]; then
    mkdir -p "$OUTPUT_DIR"
fi

# Format and write output
if [ "$FORMAT" = "jsonl" ]; then
    # JSON Lines format (one JSON object per line)
    echo "$SCROLL_RESULT" | \
        grep -o '"id":"[^"]*"[^}]*}' | \
        while read -r line; do
            echo "{${line}}"
        done > "$OUTPUT_FILE"
else
    # Pretty JSON format
    cat > "$OUTPUT_FILE" << EOF
{
    "exported_at": "$(date -Iseconds)",
    "collection": "${COLLECTION_NAME}",
    "count": ${MEMORY_COUNT},
    "filters": {
        "project": "${PROJECT_FILTER:-null}",
        "type": "${TYPE_FILTER:-null}",
        "tag": "${TAG_FILTER:-null}"
    },
    "memories": ${POINTS}
}
EOF
fi

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
log_success "Export saved: ${OUTPUT_FILE} (${FILE_SIZE})"

# Summary
echo ""
echo "=============================================="
echo "          EXPORT COMPLETE                    "
echo "=============================================="
echo ""
echo "Collection:     ${COLLECTION_NAME}"
echo "Memories:       ${MEMORY_COUNT}"
echo "Output File:    ${OUTPUT_FILE}"
echo "File Size:      ${FILE_SIZE}"
echo "Format:         ${FORMAT}"
echo "Include Vectors: ${INCLUDE_VECTORS}"
echo ""

# Show filters if any
if [ -n "$PROJECT_FILTER" ] || [ -n "$TYPE_FILTER" ] || [ -n "$TAG_FILTER" ]; then
    echo "Filters applied:"
    [ -n "$PROJECT_FILTER" ] && echo "  - Project: ${PROJECT_FILTER}"
    [ -n "$TYPE_FILTER" ] && echo "  - Type: ${TYPE_FILTER}"
    [ -n "$TAG_FILTER" ] && echo "  - Tag: ${TAG_FILTER}"
    echo ""
fi

log_success "Export completed successfully!"
