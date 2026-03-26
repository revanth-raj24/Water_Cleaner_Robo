"""
Water Cleaning Robot – FastAPI Backend
=======================================
WebSocket endpoints:
  /ws/frontend  ← browser dashboard connects here
  /ws/esp32     ← ESP32 main controller connects here

Message flow:
  Frontend  ──control cmd──►  Server  ──► ESP32(s)
  ESP32     ──gps / status──►  Server  ──► Frontend(s)
"""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from ws_manager import ConnectionManager

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App lifecycle ────────────────────────────────────────────────────────────
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Water Robot Controller API starting …")
    yield
    logger.info("Water Robot Controller API shutting down …")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Water Cleaning Robot Controller",
    version="1.0.0",
    description="Real-time WebSocket bridge between React dashboard and ESP32 robot.",
    lifespan=lifespan,
)

# Allow all origins for local-network deployment.
# Restrict to specific IPs in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── REST endpoints ───────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "service": "Water Robot Controller API"}


@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "frontends_connected": manager.frontend_count,
        "esp32s_connected": manager.esp32_count,
    }


# ─── WebSocket: Frontend (browser dashboard) ──────────────────────────────────

@app.websocket("/ws/frontend")
async def ws_frontend(websocket: WebSocket):
    """
    Browser dashboard WebSocket endpoint.

    Accepts:
        { "type": "control", "command": "forward|backward|left|right|stop" }
        { "type": "control", "command": "conveyor_on|conveyor_off" }

    Sends:
        { "type": "gps",    "lat": float, "lng": float }
        { "type": "status", "message": str }
    """
    await manager.connect_frontend(websocket)
    # Notify dashboard of current robot count
    await websocket.send_text(
        json.dumps({
            "type": "status",
            "message": f"Connected to server. ESP32 devices online: {manager.esp32_count}",
        })
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from frontend: %s", raw)
                continue

            msg_type = message.get("type")
            logger.info("Frontend → Server: %s", message)

            if msg_type == "control":
                # Forward command to all connected ESP32 devices
                if manager.esp32_count == 0:
                    await websocket.send_text(
                        json.dumps({
                            "type": "status",
                            "message": "Warning: no ESP32 connected.",
                        })
                    )
                else:
                    await manager.broadcast_to_esp32(json.dumps(message))
            else:
                logger.warning("Unknown message type from frontend: %s", msg_type)

    except WebSocketDisconnect:
        logger.info("Frontend WebSocket disconnected normally.")
    except Exception as exc:
        logger.error("Frontend WebSocket error: %s", exc)
    finally:
        manager.disconnect_frontend(websocket)


# ─── WebSocket: ESP32 (hardware slave) ────────────────────────────────────────

@app.websocket("/ws/esp32")
async def ws_esp32(websocket: WebSocket):
    """
    ESP32 main controller WebSocket endpoint.

    Receives (from ESP32):
        { "type": "gps",    "lat": float, "lng": float }
        { "type": "status", "message": str }

    Sends (to ESP32):
        { "type": "control", "command": str }   ← forwarded from frontend
    """
    await manager.connect_esp32(websocket)
    # Notify all frontends that a robot came online
    await manager.broadcast_to_frontends(
        json.dumps({"type": "status", "message": "ESP32 robot connected."})
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from ESP32: %s", raw)
                continue

            msg_type = message.get("type")
            logger.info("ESP32 → Server: %s", message)

            if msg_type == "gps":
                # Forward live GPS coordinates to all dashboards
                await manager.broadcast_to_frontends(json.dumps(message))

            elif msg_type == "status":
                # Forward robot status messages to all dashboards
                await manager.broadcast_to_frontends(json.dumps(message))

            else:
                logger.warning("Unknown message type from ESP32: %s", msg_type)

    except WebSocketDisconnect:
        logger.info("ESP32 WebSocket disconnected normally.")
    except Exception as exc:
        logger.error("ESP32 WebSocket error: %s", exc)
    finally:
        manager.disconnect_esp32(websocket)
        await manager.broadcast_to_frontends(
            json.dumps({"type": "status", "message": "ESP32 robot disconnected."})
        )


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    # Replace host with your machine's LAN IP so ESP32 can reach it.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
