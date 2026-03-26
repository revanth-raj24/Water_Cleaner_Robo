/**
 * Dashboard – orchestrates the two-section layout.
 *
 * Section 1: MapSection (hero, full width)
 * Section 2: ControllerPanel (left) + CameraFeed (right)
 *
 * Responsive:
 *   desktop  → side-by-side grid
 *   tablet   → stacked (controller above camera)
 *   mobile   → single column, natural order
 */

import MapSection      from "./MapSection";
import ControllerPanel from "./ControllerPanel";
import CameraFeed      from "./CameraFeed";

export default function Dashboard({
  connected,
  gpsPosition,
  gpsSource,
  onToggleSource,
  geoError,
  sendCommand,
}) {
  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-4"
      /* Subtle dot grid + radial glow background */
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 70%)," +
          "linear-gradient(rgba(51,65,85,0.18) 1px, transparent 1px)," +
          "linear-gradient(to right, rgba(51,65,85,0.18) 1px, transparent 1px)",
        backgroundSize: "auto, 32px 32px, 32px 32px",
      }}
    >
      {/* ── Hero: full-width map ──────────────────────────────────────── */}
      <MapSection
        gpsPosition={gpsPosition}
        gpsSource={gpsSource}
        onToggleSource={onToggleSource}
        geoError={geoError}
        connected={connected}
      />

      {/* ── Bottom grid: controller | camera ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ minHeight: "340px" }}>
        <ControllerPanel sendCommand={sendCommand} connected={connected} />
        <CameraFeed />
      </div>
    </div>
  );
}
