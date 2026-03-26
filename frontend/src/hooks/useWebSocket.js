/**
 * useWebSocket – custom React hook
 *
 * Manages the WebSocket connection to the FastAPI backend (/ws/frontend).
 * Handles auto-reconnect with exponential back-off.
 *
 * Returns:
 *   sendCommand(command: string) – sends a control command JSON to the server
 *   gpsPosition  { lat, lng } | null – latest GPS fix from ESP32
 *   statusMsg    string       – latest status message
 *   connected    boolean      – current connection state
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ── PLACEHOLDER: change to your server's LAN IP when deployed ──────────────
// During development the Vite proxy forwards /ws → ws://localhost:8000
const WS_URL = "ws://localhost:8000/ws/frontend";
// const WS_URL = "ws://192.168.1.100:8000/ws/frontend"; // LAN deployment

const RECONNECT_BASE_MS = 1500; // initial back-off delay
const RECONNECT_MAX_MS = 15000; // max back-off delay

export default function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null); // { lat, lng }
  const [statusMsg, setStatusMsg] = useState("Connecting …");

  const wsRef = useRef(null);
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const reconnectTimer = useRef(null);
  const unmounted = useRef(false);

  const connect = useCallback(() => {
    if (unmounted.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmounted.current) return;
      setConnected(true);
      setStatusMsg("Connected to server");
      reconnectDelay.current = RECONNECT_BASE_MS; // reset back-off
    };

    ws.onmessage = (event) => {
      if (unmounted.current) return;
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "gps":
            // { type: "gps", lat: number, lng: number }
            setGpsPosition({ lat: msg.lat, lng: msg.lng });
            break;

          case "status":
            // { type: "status", message: string }
            setStatusMsg(msg.message);
            break;

          default:
            console.warn("Unknown WS message type:", msg.type);
        }
      } catch {
        console.error("Failed to parse WebSocket message:", event.data);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      if (unmounted.current) return;
      setConnected(false);
      setStatusMsg(
        `Disconnected – reconnecting in ${Math.round(reconnectDelay.current / 1000)}s …`
      );
      // Exponential back-off
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 1.5,
          RECONNECT_MAX_MS
        );
        connect();
      }, reconnectDelay.current);
    };
  }, []);

  useEffect(() => {
    unmounted.current = false;
    connect();
    return () => {
      unmounted.current = true;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  /**
   * Send a robot control command.
   * @param {string} command  "forward" | "backward" | "left" | "right" | "stop" |
   *                          "conveyor_on" | "conveyor_off"
   */
  const sendCommand = useCallback((command) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open – command dropped:", command);
      return;
    }
    const payload = JSON.stringify({ type: "control", command });
    ws.send(payload);
    console.info("Sent command:", command);
  }, []);

  return { connected, gpsPosition, statusMsg, sendCommand };
}
