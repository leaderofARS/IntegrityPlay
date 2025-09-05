from __future__ import annotations
import asyncio
import json
import os
from pathlib import Path
from typing import Any, Optional

from minio import Minio
from minio.error import S3Error
from .config import get_settings

settings = get_settings()


class Storage:
    """Abstraction to store and retrieve evidence artifacts.

    If MinIO is configured, use it. Otherwise, operate on local filesystem paths
    under results/evidence_samples.
    """

    def __init__(self) -> None:
        self._client: Optional[Minio] = None
        if settings.MINIO_ENDPOINT and settings.MINIO_ACCESS_KEY and settings.MINIO_SECRET_KEY:
            try:
                self._client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE,
                )
                # Ensure bucket exists
                if not self._client.bucket_exists(settings.MINIO_BUCKET):
                    self._client.make_bucket(settings.MINIO_BUCKET)
            except Exception:
                # Fall back to local
                self._client = None

    def put_file(self, local_path: str, object_name: Optional[str] = None) -> str:
        """Upload a file to MinIO (if configured) or return the local path.

        Returns a URL (MinIO) or a local file path.
        """
        if not os.path.exists(local_path):
            raise FileNotFoundError(local_path)

        if self._client is None:
            return local_path

        name = object_name or Path(local_path).name
        try:
            self._client.fput_object(settings.MINIO_BUCKET, name, local_path)
            scheme = "https" if settings.MINIO_SECURE else "http"
            return f"{scheme}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{name}"
        except S3Error:
            return local_path


storage = Storage()

