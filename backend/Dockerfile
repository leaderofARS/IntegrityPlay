FROM python:3.10-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl bash build-essential git \
  && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy repo (backend uses app/* from repo root as well)
COPY . /app

# Alembic config lives in /app/backend
ENV PYTHONPATH=/app
ENV BACKEND_MODULE=backend.main:app

# Entrypoint to run migrations then start
COPY backend/docker-entrypoint.sh /app/backend/docker-entrypoint.sh
# Normalize line endings (Windows -> Unix) just in case
RUN sed -i 's/\r$//' /app/backend/docker-entrypoint.sh && chmod +x /app/backend/docker-entrypoint.sh

EXPOSE 8000
CMD ["/app/backend/docker-entrypoint.sh"]

