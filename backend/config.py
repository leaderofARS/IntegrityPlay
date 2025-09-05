from __future__ import annotations
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    This config is intentionally minimal and robust for judge environments.
    """

    API_TITLE: str = "IntegrityPlay API"
    API_VERSION: str = "0.1.0"

    # Security
    API_KEY: str | None = None  # simple demo API key

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        # Safe default for local/dev: a file-based SQLite DB
        "sqlite:///./.demo.sqlite3",
    )

    # Redis (optional)
    REDIS_URL: str | None = os.getenv("REDIS_URL")

    # MinIO (optional)
    MINIO_ENDPOINT: str | None = os.getenv("MINIO_ENDPOINT")  # e.g. minio:9000
    MINIO_ACCESS_KEY: str | None = os.getenv("MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY: str | None = os.getenv("MINIO_SECRET_KEY")
    MINIO_SECURE: bool = bool(int(os.getenv("MINIO_SECURE", "0")))
    MINIO_BUCKET: str = os.getenv("MINIO_BUCKET", "integrityplay")

    # Paths
    RESULTS_DIR: str = os.getenv("RESULTS_DIR", "results")
    ALERTS_DIR: str = os.getenv("ALERTS_DIR", "results/alerts")
    EVIDENCE_DIR: str = os.getenv("EVIDENCE_DIR", "results/evidence_samples")

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000, http://127.0.0.1:3000")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

