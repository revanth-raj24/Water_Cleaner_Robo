/**
 * App – root layout for the Water Cleaning Robot Dashboard.
 *
 * Layout (desktop):
 * ┌─────────────────────────────────────────────────────┐
 * │                    StatusBar                        │
 * ├────────────────────────┬────────────────────────────┤
 * │       CameraView       │         MapView            │
 * │     (left column)      │      (right column)        │
 * ├────────────────────────┴────────────────────────────┤
 * │                   ControlPad                        │
 * └─────────────────────────────────────────────────────┘
 */

import useWebSocket from "./hooks/useWebSocket";
import StatusBar from "./components/StatusBar";
import CameraView from "./components/CameraView";
import MapView from "./components/MapView";
import ControlPad from "./components/ControlPad";

export default function App() {
  const { connected, gpsPosition, statusMsg, sendCommand } = useWebSocket();

  return (
    <div className="flex flex-col h-screen bg-robot-dark text-white overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <StatusBar
        connected={connected}
        statusMsg={statusMsg}
        gpsPosition={gpsPosition}
      />

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left column: Camera + Map stacked */}
        <div className="flex flex-col flex-1 gap-4 min-w-0">
          {/* Camera */}
          <div className="flex-1 flex flex-col min-h-0">
            <CameraView />
          </div>

          {/* Map */}
          <div className="flex-1 flex flex-col min-h-0">
            <MapView gpsPosition={gpsPosition} />
          </div>
        </div>

        {/* Right column: Control pad */}
        <aside className="flex flex-col justify-center w-64 shrink-0">
          <ControlPad sendCommand={sendCommand} connected={connected} />
        </aside>
      </main>
    </div>
  );
}
