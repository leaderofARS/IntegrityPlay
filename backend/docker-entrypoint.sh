#!/usr/bin/env bash
set -euo pipefail

# Run migrations if alembic is configured
if [ -f "/app/backend/alembic.ini" ]; then
  echo "Running migrations..."
  alembic -c /app/backend/alembic.ini upgrade head || echo "Alembic failed or not configured; continuing"
fi

# Start API
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info

