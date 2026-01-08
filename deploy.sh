#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}$1${NC}"
}

echo "Checking prerequisites..."

if [ ! -f "config.yaml" ]; then
    error "config.yaml not found. Copy config.example.yaml and configure it."
fi

if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
fi

if ! docker info &> /dev/null; then
    error "Docker daemon not running"
fi

echo "Stopping old container..."
docker compose down 2>/dev/null || true

echo "Building and starting container..."
docker compose up -d --build

success "Container started!"
echo ""
echo "Showing logs (Ctrl+C to stop viewing - container keeps running):"
echo ""

docker compose logs -f
