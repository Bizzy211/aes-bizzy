#!/usr/bin/env bash
#
# Heimdall Setup Script
# One-command installation for Heimdall persistent memory system
#
# Usage:
#   ./setup-heimdall.sh [--skip-docker] [--skip-mcp] [--force]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QDRANT_CONTAINER_NAME="heimdall-qdrant"
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_IMAGE="qdrant/qdrant:latest"
DATA_DIR="${HEIMDALL_DATA_DIR:-$HOME/.heimdall/qdrant_data}"

# Parse arguments
SKIP_DOCKER=false
SKIP_MCP=false
FORCE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-docker) SKIP_DOCKER=true ;;
        --skip-mcp) SKIP_MCP=true ;;
        --force) FORCE=true ;;
        -h|--help)
            echo "Usage: $0 [--skip-docker] [--skip-mcp] [--force]"
            echo ""
            echo "Options:"
            echo "  --skip-docker  Skip Docker/Qdrant setup"
            echo "  --skip-mcp     Skip MCP configuration"
            echo "  --force        Force reinstallation"
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

# Header
echo ""
echo "=============================================="
echo "       HEIMDALL MEMORY SYSTEM SETUP          "
echo "=============================================="
echo ""

# Step 1: Check prerequisites
log_info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi
log_success "Docker found"

# Check Docker is running
if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi
log_success "Docker is running"

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi
log_success "Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm first."
    exit 1
fi
log_success "npm found: $(npm --version)"

# Step 2: Setup Qdrant
if [ "$SKIP_DOCKER" = false ]; then
    echo ""
    log_info "Setting up Qdrant vector database..."

    # Create data directory
    mkdir -p "$DATA_DIR"
    log_success "Data directory: $DATA_DIR"

    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^${QDRANT_CONTAINER_NAME}$"; then
        if [ "$FORCE" = true ]; then
            log_warning "Removing existing container..."
            docker rm -f "$QDRANT_CONTAINER_NAME" &> /dev/null || true
        else
            # Check if it's running
            if docker ps --format '{{.Names}}' | grep -q "^${QDRANT_CONTAINER_NAME}$"; then
                log_success "Qdrant is already running"
            else
                log_info "Starting existing Qdrant container..."
                docker start "$QDRANT_CONTAINER_NAME"
                log_success "Qdrant started"
            fi
        fi
    fi

    # Create container if it doesn't exist
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${QDRANT_CONTAINER_NAME}$"; then
        log_info "Pulling Qdrant image..."
        docker pull "$QDRANT_IMAGE"

        log_info "Creating Qdrant container..."
        docker run -d \
            --name "$QDRANT_CONTAINER_NAME" \
            -p "${QDRANT_PORT}:6333" \
            -p "${QDRANT_GRPC_PORT}:6334" \
            -v "${DATA_DIR}:/qdrant/storage:z" \
            --restart unless-stopped \
            "$QDRANT_IMAGE"

        log_success "Qdrant container created and started"
    fi

    # Wait for Qdrant to be ready
    log_info "Waiting for Qdrant to be ready..."
    for i in {1..30}; do
        if curl -s "http://localhost:${QDRANT_PORT}/health" &> /dev/null; then
            log_success "Qdrant is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Qdrant failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
    done
else
    log_warning "Skipping Docker setup (--skip-docker)"
fi

# Step 3: Setup MCP Configuration
if [ "$SKIP_MCP" = false ]; then
    echo ""
    log_info "Checking MCP configuration..."

    # Check if aes-bizzy CLI is available
    if command -v aes-bizzy &> /dev/null; then
        log_info "Running Heimdall installer via CLI..."
        aes-bizzy init --heimdall || {
            log_warning "CLI installer failed, checking manual config..."
        }
    else
        log_warning "aes-bizzy CLI not found globally, using local package..."

        # Check for local package
        if [ -f "package.json" ]; then
            npm run build 2>/dev/null || true
            npx aes-bizzy init --heimdall 2>/dev/null || {
                log_warning "Local CLI not available, manual setup may be needed"
            }
        fi
    fi

    log_success "MCP configuration checked"
else
    log_warning "Skipping MCP setup (--skip-mcp)"
fi

# Step 4: Health Check
echo ""
log_info "Running health checks..."

# Check Qdrant health
if curl -s "http://localhost:${QDRANT_PORT}/health" | grep -q "ok\|title"; then
    log_success "Qdrant health: OK"
else
    log_warning "Qdrant health: Unable to verify"
fi

# Check Qdrant collections info
COLLECTIONS=$(curl -s "http://localhost:${QDRANT_PORT}/collections" 2>/dev/null || echo "error")
if echo "$COLLECTIONS" | grep -q "result"; then
    log_success "Qdrant API: Accessible"
else
    log_warning "Qdrant API: Unable to verify"
fi

# Summary
echo ""
echo "=============================================="
echo "          SETUP COMPLETE                     "
echo "=============================================="
echo ""
echo "Qdrant URL: http://localhost:${QDRANT_PORT}"
echo "Data Dir:   ${DATA_DIR}"
echo ""
echo "Next steps:"
echo "  1. Ensure Heimdall MCP server is configured in Claude settings"
echo "  2. Run 'aes-bizzy memory health' to verify integration"
echo "  3. Start using memory commands in Claude Code"
echo ""
log_success "Heimdall is ready for use!"
