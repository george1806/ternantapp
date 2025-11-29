#!/bin/bash

# =================================================================
# Logs Viewer Script
# Usage: ./scripts/logs.sh [service] [follow|lines]
# Examples:
#   ./scripts/logs.sh backend
#   ./scripts/logs.sh frontend -f
#   ./scripts/logs.sh mysql --tail=100
# =================================================================

SERVICE=${1:-backend}
FOLLOW=${2:-}
COMPOSE_FILE="docker-compose.yml"

# Check if prod
if [ -f ".env.production" ] && [ "$NODE_ENV" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

if [ "$FOLLOW" = "-f" ] || [ "$FOLLOW" = "--follow" ]; then
    docker-compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
elif [[ "$FOLLOW" == --tail=* ]]; then
    LINES=${FOLLOW#--tail=}
    docker-compose -f "$COMPOSE_FILE" logs --tail="$LINES" "$SERVICE"
else
    docker-compose -f "$COMPOSE_FILE" logs "$SERVICE"
fi
