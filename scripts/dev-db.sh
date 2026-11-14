#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="projecthub-dev-db"
VOLUME_NAME="projecthub-dev-pgdata"
IMAGE="docker.io/library/postgres:16"
PORT="${PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-projecthub}"
POSTGRES_DB="${POSTGRES_DB:-projecthub_dev}"

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "Error: POSTGRES_PASSWORD must be set" >&2
  exit 1
fi

if ! command -v podman &>/dev/null; then
  echo "Error: podman is not installed or not in PATH" >&2
  exit 1
fi

if podman container exists "$CONTAINER_NAME" 2>/dev/null || podman ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  if podman ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Container $CONTAINER_NAME is already running"
  else
    echo "Starting existing container $CONTAINER_NAME..."
    podman start "$CONTAINER_NAME"
  fi
else
  echo "Creating and starting $CONTAINER_NAME container..."
  podman run -d \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_USER="$POSTGRES_USER" \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e POSTGRES_DB="$POSTGRES_DB" \
    -p "127.0.0.1:${PORT}:5432" \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    "$IMAGE"
fi
