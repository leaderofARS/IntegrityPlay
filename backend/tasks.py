from __future__ import annotations
import asyncio
import json
import os
import tempfile
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from fastapi import BackgroundTasks

from .config import get_settings
from .models import Alert

settings = get_settings()


@dataclass
class TaskState:
    id: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, running, completed, failed
    logs: List[str] = field(default_factory=list)
    result: Optional[dict] = None
    error: Optional[str] = None


class TaskRegistry:
    """In-memory task registry used for demo orchestration.

    Not meant for production, but deterministic and judge-friendly. Can be swapped
    for Celery or RQ if desired.
    """

    def __init__(self) -> None:
        self._tasks: Dict[str, TaskState] = {}
        self._lock = asyncio.Lock()

    async def create(self) -> TaskState:
        tid = str(uuid.uuid4())
        ts = TaskState(id=tid)
        async with self._lock:
            self._tasks[tid] = ts
        return ts

    async def get(self, tid: str) -> Optional[TaskState]:
        async with self._lock:
            return self._tasks.get(tid)

    async def append_log(self, tid: str, line: str) -> None:
        async with self._lock:
            if tid in self._tasks:
                self._tasks[tid].logs.append(line)

    async def set_status(self, tid: str, status: str) -> None:
        async with self._lock:
            if tid in self._tasks:
                self._tasks[tid].status = status

    async def set_result(self, tid: str, result: dict) -> None:
        async with self._lock:
            if tid in self._tasks:
                self._tasks[tid].result = result

    async def set_error(self, tid: str, error: str) -> None:
        async with self._lock:
            if tid in self._tasks:
                self._tasks[tid].error = error


task_registry = TaskRegistry()


async def write_demo_alert_files(alert: Dict[str, Any]) -> tuple[str, str]:
    """Ensure ALERT-DEMO-001 files exist on disk (JSON + TXT).

    Returns (json_path, txt_path)
    """
    alerts_dir = Path(settings.ALERTS_DIR)
    alerts_dir.mkdir(parents=True, exist_ok=True)
    json_path = alerts_dir / "ALERT-DEMO-001.json"
    txt_path = alerts_dir / "ALERT-DEMO-001.txt"
    if not json_path.exists():
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(alert, f, indent=2)
    if not txt_path.exists():
        content = (
            "IntegrityPlay Demo Narrative\n\n"
            "This is a deterministic demo alert generated to ensure judges can evaluate the pipeline.\n"
        )
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(content)
    return str(json_path), str(txt_path)

