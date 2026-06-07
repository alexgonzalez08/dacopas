#!/bin/bash
# Dispara un sync de partidos contra football-data.org
# Uso: ./scripts/trigger-sync.sh [URL]
# URL por defecto: http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"

if [ -z "$CRON_SECRET" ]; then
  # Intentar leer del .env.local
  if [ -f ".env.local" ]; then
    export $(grep CRON_SECRET .env.local | xargs)
  fi
fi

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET no encontrado. Exportalo o poné en .env.local"
  exit 1
fi

echo "Disparando sync en $BASE_URL ..."
curl -s -X POST "$BASE_URL/api/matches/sync" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
