#!/usr/bin/env bash
#
# Heimdall Memory Backup Script
# Creates Qdrant snapshots with 7-backup retention
#
# Usage:
#   ./backup-memory.sh [--collection NAME] [--output DIR] [--retain N]
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
BACKUP_DIR="${HEIMDALL_BACKUP_DIR:-$HOME/.heimdall/backups}"
RETENTION_COUNT=7
OUTPUT_DIR=""

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --collection) COLLECTION_NAME="$2"; shift ;;
        --output) OUTPUT_DIR="$2"; shift ;;
        --retain) RETENTION_COUNT="$2"; shift ;;
        -h|--help)
            echo "Usage: $0 [--collection NAME] [--output DIR] [--retain N]"
            echo ""
            echo "Options:"
            echo "  --collection NAME  Collection to backup (default: agent_memories)"
            echo "  --output DIR       Output directory for backups"
            echo "  --retain N         Number of backups to retain (default: 7)"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Use output dir if specified
if [ -n "$OUTPUT_DIR" ]; then
    BACKUP_DIR="$OUTPUT_DIR"
fi

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Header
echo ""
echo "=============================================="
echo "       HEIMDALL MEMORY BACKUP                "
echo "=============================================="
echo ""

# Check Qdrant availability
log_info "Checking Qdrant availability..."
if ! curl -s "${QDRANT_URL}/health" &> /dev/null; then
    log_error "Qdrant is not accessible at ${QDRANT_URL}"
    exit 1
fi
log_success "Qdrant is accessible"

# Check collection exists
log_info "Checking collection: ${COLLECTION_NAME}..."
COLLECTION_INFO=$(curl -s "${QDRANT_URL}/collections/${COLLECTION_NAME}" 2>/dev/null)
if echo "$COLLECTION_INFO" | grep -q "error\|Not found"; then
    log_error "Collection '${COLLECTION_NAME}' not found"
    exit 1
fi
log_success "Collection found"

# Create backup directory
mkdir -p "$BACKUP_DIR"
log_info "Backup directory: $BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${COLLECTION_NAME}_${TIMESTAMP}"

# Create snapshot
log_info "Creating snapshot: ${BACKUP_NAME}..."

SNAPSHOT_RESPONSE=$(curl -s -X POST \
    "${QDRANT_URL}/collections/${COLLECTION_NAME}/snapshots" \
    -H "Content-Type: application/json" \
    2>/dev/null)

if echo "$SNAPSHOT_RESPONSE" | grep -q "error"; then
    log_error "Failed to create snapshot"
    echo "$SNAPSHOT_RESPONSE"
    exit 1
fi

# Extract snapshot name from response
SNAPSHOT_NAME=$(echo "$SNAPSHOT_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SNAPSHOT_NAME" ]; then
    log_error "Could not determine snapshot name"
    exit 1
fi

log_success "Snapshot created: ${SNAPSHOT_NAME}"

# Download snapshot
log_info "Downloading snapshot..."
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.snapshot"

curl -s -o "$BACKUP_FILE" \
    "${QDRANT_URL}/collections/${COLLECTION_NAME}/snapshots/${SNAPSHOT_NAME}" \
    2>/dev/null

if [ ! -f "$BACKUP_FILE" ] || [ ! -s "$BACKUP_FILE" ]; then
    log_error "Failed to download snapshot"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_success "Backup saved: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Create metadata file
METADATA_FILE="${BACKUP_DIR}/${BACKUP_NAME}.meta.json"
cat > "$METADATA_FILE" << EOF
{
    "collection": "${COLLECTION_NAME}",
    "timestamp": "${TIMESTAMP}",
    "snapshot_name": "${SNAPSHOT_NAME}",
    "backup_file": "${BACKUP_FILE}",
    "qdrant_url": "${QDRANT_URL}",
    "created_at": "$(date -Iseconds)"
}
EOF
log_info "Metadata saved: ${METADATA_FILE}"

# Cleanup remote snapshot
log_info "Cleaning up remote snapshot..."
curl -s -X DELETE \
    "${QDRANT_URL}/collections/${COLLECTION_NAME}/snapshots/${SNAPSHOT_NAME}" \
    2>/dev/null || true

# Apply retention policy
log_info "Applying retention policy (keeping ${RETENTION_COUNT} backups)..."

# Get list of backups sorted by date (oldest first)
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}/${COLLECTION_NAME}_"*.snapshot 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$RETENTION_COUNT" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - RETENTION_COUNT))
    log_info "Removing ${DELETE_COUNT} old backup(s)..."

    ls -1t "${BACKUP_DIR}/${COLLECTION_NAME}_"*.snapshot 2>/dev/null | \
        tail -n "$DELETE_COUNT" | \
        while read -r OLD_BACKUP; do
            OLD_META="${OLD_BACKUP%.snapshot}.meta.json"
            rm -f "$OLD_BACKUP" "$OLD_META"
            log_info "Removed: $(basename "$OLD_BACKUP")"
        done

    log_success "Retention policy applied"
else
    log_info "No old backups to remove (${BACKUP_COUNT}/${RETENTION_COUNT})"
fi

# Summary
echo ""
echo "=============================================="
echo "          BACKUP COMPLETE                    "
echo "=============================================="
echo ""
echo "Collection:    ${COLLECTION_NAME}"
echo "Backup File:   ${BACKUP_FILE}"
echo "Backup Size:   ${BACKUP_SIZE}"
echo "Retention:     ${RETENTION_COUNT} backups"
echo ""
log_success "Backup completed successfully!"
