/**
 * App – root component.
 * Wires hooks to the Dashboard layout. Keeps this file intentionally minimal.
 */

import { useState } from "react";
import useWebSocket   from "./hooks/useWebSocket";
import useGeolocation from "./hooks/useGeolocation";
import StatusBar  from "./components/StatusBar";
import Dashboard  from "./components/Dashboard";

export default function App() {
  const { connected, gpsPosition: esp32Gps, statusMsg, sendCommand } = useWebSocket();
  const { position: laptopGps, error: geoError }                     = useGeolocation();

  // "laptop" → browser Geolocation API (default for dev)
  // "esp32"  → live GPS from hardware via WebSocket
  const [gpsSource, setGpsSource] = useState("laptop");
  const toggleSource = () => setGpsSource((s) => (s === "laptop" ? "esp32" : "laptop"));

  const activeGps = gpsSource === "laptop" ? laptopGps : esp32Gps;

  return (
    <div
      className="flex flex-col h-screen text-white overflow-hidden"
      style={{ background: "#020617" }}   /* surface-950 */
    >
      <StatusBar connected={connected} statusMsg={statusMsg} />

      <Dashboard
        connected={connected}
        gpsPosition={activeGps}
        gpsSource={gpsSource}
        onToggleSource={toggleSource}
        geoError={geoError}
        sendCommand={sendCommand}
      />
    </div>
  );
}
