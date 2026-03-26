# Water Cleaning Robot Controller System

Real-time web-based control system for a water cleaning robot.

```
Browser Dashboard (React)
        │  WebSocket /ws/frontend
        ▼
FastAPI Backend Server      ◄──── WebSocket /ws/esp32 ────  ESP32 Main Controller
        │                                                          │
        │  GPS / Status                                    Motors + Conveyor + GPS
        ▼
Browser Dashboard (GPS map updated live)

                                                    ESP32-CAM → http://<IP>:81/stream
                                                    (embedded as <img> in dashboard)
```

---

## Project Structure

```
Water_Cleaner/
├── backend/
│   ├── main.py           ← FastAPI app (WebSocket bridge)
│   ├── ws_manager.py     ← Connection pool manager
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── hooks/useWebSocket.js
│   │   └── components/
│   │       ├── ControlPad.jsx
│   │       ├── MapView.jsx
│   │       ├── CameraView.jsx
│   │       └── StatusBar.jsx
│   ├── package.json
│   └── vite.config.js
├── esp32/
│   └── water_robot_controller/
│       └── water_robot_controller.ino
└── esp32_cam/
    └── camera_webserver/
        └── camera_webserver.ino
```

---

## Placeholders — Replace Before Running

| File | Placeholder | Replace With |
|------|------------|--------------|
| `esp32/.../water_robot_controller.ino` | `YOUR_WIFI_SSID` | Your WiFi SSID |
| `esp32/.../water_robot_controller.ino` | `YOUR_WIFI_PASSWORD` | Your WiFi password |
| `esp32/.../water_robot_controller.ino` | `192.168.1.100` (SERVER_HOST) | LAN IP of your PC running FastAPI |
| `esp32_cam/.../camera_webserver.ino` | `YOUR_WIFI_SSID` | Your WiFi SSID |
| `esp32_cam/.../camera_webserver.ino` | `YOUR_WIFI_PASSWORD` | Your WiFi password |
| `frontend/src/components/CameraView.jsx` | `192.168.1.200` | ESP32-CAM's assigned LAN IP |
| `frontend/src/hooks/useWebSocket.js` | `localhost:8000` | FastAPI server IP when not using Vite proxy |
| `frontend/src/components/MapView.jsx` | `[13.0827, 80.2707]` (DEFAULT_POSITION) | Your deployment area coordinates |

---

## 1. Backend Setup

### Prerequisites
- Python 3.10+

### Install & Run

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Server starts at `http://0.0.0.0:8000`

- REST health check: `http://localhost:8000/health`
- Frontend WebSocket: `ws://localhost:8000/ws/frontend`
- ESP32 WebSocket:   `ws://localhost:8000/ws/esp32`

---

## 2. Frontend Setup

### Prerequisites
- Node.js 18+

```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at `http://localhost:3000`

> The Vite dev server proxies `/ws/*` to `ws://localhost:8000` automatically.
> For production build: `npm run build` → serve the `dist/` folder.

---

## 3. ESP32 Main Controller

### Required Arduino Libraries
Install via **Arduino IDE → Library Manager**:

| Library | Author |
|---------|--------|
| ArduinoWebsockets | Gil Maimon |
| TinyGPSPlus | Mikal Hart |
| ArduinoJson | Benoit Blanchon |

### Board Settings (Arduino IDE)
- Board: **ESP32 Dev Module**
- Partition Scheme: Default 4MB with spiffs
- Upload Speed: 921600

### Steps
1. Open `esp32/water_robot_controller/water_robot_controller.ino`
2. Fill in WiFi credentials and `SERVER_HOST` (your PC's LAN IP)
3. If no GPS module is wired, set `#define GPS_SIMULATE 1`
4. Flash to ESP32
5. Open Serial Monitor (115200 baud) — confirm WiFi + WebSocket connection

### Wiring (L298N Motor Driver)

```
ESP32 GPIO  →  L298N
──────────────────────
GPIO 12     →  ENA  (Left motor PWM)
GPIO 14     →  IN1  (Left motor dir)
GPIO 27     →  IN2  (Left motor dir)
GPIO 26     →  ENB  (Right motor PWM)
GPIO 25     →  IN3  (Right motor dir)
GPIO 33     →  IN4  (Right motor dir)
GPIO 32     →  Conveyor relay (IN)
GPIO 16     →  GPS RX2 (GPS TX)
GPIO 17     →  GPS TX2 (GPS RX)
```

---

## 4. ESP32-CAM

### Board Settings (Arduino IDE)
- Board: **AI Thinker ESP32-CAM**
- No COM port needed for selection — use FTDI adapter

### Flashing Procedure
1. Wire GPIO0 to GND (flash mode)
2. Connect FTDI adapter (3.3V logic)
3. Open `esp32_cam/camera_webserver/camera_webserver.ino`
4. Fill in WiFi credentials
5. Upload sketch
6. Disconnect GPIO0 from GND, press RST button
7. Check Serial Monitor (115200) for assigned IP
8. Test stream: open `http://<IP>:81/stream` in browser
9. Copy that URL into the React dashboard camera panel

---

## 5. Communication Protocol (JSON over WebSocket)

### Frontend → Server → ESP32 (Control Commands)

```json
{ "type": "control", "command": "forward" }
{ "type": "control", "command": "backward" }
{ "type": "control", "command": "left" }
{ "type": "control", "command": "right" }
{ "type": "control", "command": "stop" }
{ "type": "control", "command": "conveyor_on" }
{ "type": "control", "command": "conveyor_off" }
```

### ESP32 → Server → Frontend (Telemetry)

```json
{ "type": "gps", "lat": 13.08270, "lng": 80.27070 }
{ "type": "status", "message": "ESP32 robot online" }
```

---

## 6. Run Everything (Quick Reference)

```bash
# Terminal 1 – Backend
cd backend && venv\Scripts\activate && python main.py

# Terminal 2 – Frontend
cd frontend && npm run dev

# Flash ESP32 and ESP32-CAM from Arduino IDE
```

Then open `http://localhost:3000` in your browser.
