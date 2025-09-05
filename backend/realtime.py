from __future__ import annotations
import asyncio
import json
from typing import Any, Dict, Set

from fastapi import WebSocket


class AlertBroadcaster:
    """In-memory broadcaster for real-time alert events over WebSocket.

    This is a simple demo-grade implementation (no external broker).
    """

    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._processed_events = 0

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)
        await self._send_status(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            if ws in self._clients:
                self._clients.remove(ws)

    async def _send_status(self, ws: WebSocket) -> None:
        try:
            await ws.send_text(json.dumps({
                "type": "status",
                "timestamp": asyncio.get_event_loop().time(),
                "data": {
                    "status": "online",
                    "activeConnections": len(self._clients),
                    "processedEvents": self._processed_events,
                    "avgResponseTime": 0,
                }
            }))
        except Exception:
            pass

    async def broadcast_alert(self, alert: Dict[str, Any]) -> None:
        message = json.dumps({
            "type": "alert",
            "timestamp": asyncio.get_event_loop().time(),
            "data": alert,
        })
        async with self._lock:
            clients = list(self._clients)
        to_remove: Set[WebSocket] = set()
        for ws in clients:
            try:
                await ws.send_text(message)
            except Exception:
                to_remove.add(ws)
        if to_remove:
            async with self._lock:
                for ws in to_remove:
                    self._clients.discard(ws)
        self._processed_events += 1


broadcaster = AlertBroadcaster()
