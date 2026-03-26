"""
WebSocket Connection Manager
Maintains separate pools for frontend clients and ESP32 devices.
Master (server) routes messages between the two pools.
"""

import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Dashboard/browser clients
        self.frontend_connections: List[WebSocket] = []
        # ESP32 hardware clients
        self.esp32_connections: List[WebSocket] = []

    # ─── Frontend ─────────────────────────────────────────────────────────────

    async def connect_frontend(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.frontend_connections.append(websocket)
        logger.info(
            "Frontend connected  (total=%d)", len(self.frontend_connections)
        )

    def disconnect_frontend(self, websocket: WebSocket) -> None:
        if websocket in self.frontend_connections:
            self.frontend_connections.remove(websocket)
        logger.info(
            "Frontend disconnected (total=%d)", len(self.frontend_connections)
        )

    async def broadcast_to_frontends(self, message: str) -> None:
        """Send a message to every connected browser dashboard."""
        stale: List[WebSocket] = []
        for ws in self.frontend_connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_frontend(ws)

    # ─── ESP32 ────────────────────────────────────────────────────────────────

    async def connect_esp32(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.esp32_connections.append(websocket)
        logger.info(
            "ESP32 connected     (total=%d)", len(self.esp32_connections)
        )

    def disconnect_esp32(self, websocket: WebSocket) -> None:
        if websocket in self.esp32_connections:
            self.esp32_connections.remove(websocket)
        logger.info(
            "ESP32 disconnected  (total=%d)", len(self.esp32_connections)
        )

    async def broadcast_to_esp32(self, message: str) -> None:
        """Forward a control command to every connected ESP32."""
        stale: List[WebSocket] = []
        for ws in self.esp32_connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect_esp32(ws)

    # ─── Status helpers ───────────────────────────────────────────────────────

    @property
    def frontend_count(self) -> int:
        return len(self.frontend_connections)

    @property
    def esp32_count(self) -> int:
        return len(self.esp32_connections)
