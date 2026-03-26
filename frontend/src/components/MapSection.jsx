/**
 * MapSection – full-width hero GPS map.
 *
 * Props:
 *   gpsPosition    { lat, lng, accuracy? } | null
 *   gpsSource      "laptop" | "esp32"
 *   onToggleSource () => void
 *   geoError       string | null
 *   connected      boolean
 */

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon   from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet marker icons in Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India centre
const DEFAULT_ZOOM   = 5;
const TRACKING_ZOOM  = 17;

/** Smoothly pans the map to follow new positions. */
function MapUpdater({ position, initialised }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    const zoom = initialised.current ? map.getZoom() : TRACKING_ZOOM;
    initialised.current = true;
    map.setView([position.lat, position.lng], zoom, { animate: true, duration: 0.8 });
  }, [position, map, initialised]);
  return null;
}

// ── SVG icons ────────────────────────────────────────────────────────────────

const SatIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7 9 3 5 7l4 4" />
    <path d="m17 11 4 4-4 4-4-4" />
    <line x1="14" y1="6" x2="18" y2="10" />
    <line x1="3"  y1="21" x2="9"  y2="15" />
  </svg>
);

const LaptopIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const PinIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────────

export default function MapSection({
  gpsPosition,
  gpsSource,
  onToggleSource,
  geoError,
  connected,
}) {
  const initialised = useRef(false);
  const hasGps      = Boolean(gpsPosition);
  const markerPos   = hasGps
    ? [gpsPosition.lat, gpsPosition.lng]
    : DEFAULT_CENTER;

  return (
    <section className="relative w-full rounded-2xl overflow-hidden shadow-panel border border-surface-700/50"
      style={{ height: "56vh", minHeight: "320px" }}>

      {/* ── Leaflet map ──────────────────────────────────────────────── */}
      <MapContainer
        center={markerPos}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {hasGps && (
          <>
            {/* Accuracy radius ring */}
            {gpsPosition.accuracy != null && (
              <Circle
                center={markerPos}
                radius={gpsPosition.accuracy}
                pathOptions={{
                  color: "#06b6d4",
                  fillColor: "#06b6d4",
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: "4 4",
                }}
              />
            )}
            <Marker position={markerPos}>
              <Popup className="robot-popup">
                <div className="text-xs font-mono leading-5">
                  <strong className="block mb-1">
                    {gpsSource === "laptop" ? "Laptop GPS" : "Robot GPS"}
                  </strong>
                  Lat: {gpsPosition.lat.toFixed(6)}<br />
                  Lng: {gpsPosition.lng.toFixed(6)}<br />
                  {gpsPosition.accuracy != null && `±${Math.round(gpsPosition.accuracy)} m`}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        <MapUpdater position={gpsPosition} initialised={initialised} />
      </MapContainer>

      {/* ── Top-left overlay: status + coordinates ───────────────────── */}
      <div className="
        absolute top-3 left-3 z-[500]
        flex flex-col gap-2 animate-fade-in
      ">
        {/* Robot status pill */}
        <div className="
          flex items-center gap-2 px-3 py-1.5
          bg-surface-900/85 backdrop-blur-md
          rounded-xl border border-surface-700/60
          shadow-lg
        ">
          <span className={`h-2 w-2 rounded-full ${
            connected ? "bg-emerald-400 animate-pulse-slow" : "bg-red-400"
          }`} />
          <span className={`text-xs font-semibold tracking-wide ${
            connected ? "text-emerald-400" : "text-red-400"
          }`}>
            {connected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>

        {/* Coordinates card */}
        <div className="
          px-3 py-2
          bg-surface-900/85 backdrop-blur-md
          rounded-xl border border-surface-700/60
          shadow-lg min-w-[180px]
        ">
          {hasGps ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-cyan-400"><PinIcon /></span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-600">
                  Live Position
                </span>
              </div>
              <p className="text-xs font-mono text-white leading-5">
                {gpsPosition.lat.toFixed(6)}<br />
                {gpsPosition.lng.toFixed(6)}
              </p>
              {gpsPosition.accuracy != null && (
                <p className="text-[10px] text-surface-600 mt-1 font-mono">
                  ± {Math.round(gpsPosition.accuracy)} m accuracy
                </p>
              )}
            </>
          ) : geoError ? (
            <p className="text-[10px] text-red-400">{geoError}</p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] text-amber-400 font-medium">Acquiring GPS fix…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Top-right overlay: GPS source toggle ─────────────────────── */}
      <div className="absolute top-3 right-3 z-[500] animate-fade-in">
        <button
          onClick={onToggleSource}
          className="
            flex items-center gap-2 px-3 py-1.5
            bg-surface-900/85 backdrop-blur-md
            rounded-xl border transition-all duration-200
            shadow-lg text-xs font-medium
            hover:scale-105 active:scale-95
            border-surface-700/60 hover:border-cyan-500/50
            text-slate-300 hover:text-cyan-400
          "
          title="Toggle GPS source"
        >
          {gpsSource === "laptop"
            ? <><LaptopIcon /><span>Laptop GPS</span></>
            : <><SatIcon   /><span>ESP32 GPS</span></>
          }
          {/* Small swap icon */}
          <svg className="w-3 h-3 text-surface-600" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      {/* ── Bottom attribution strip ──────────────────────────────────── */}
      <div className="
        absolute bottom-0 right-0 z-[500]
        px-2 py-0.5
        bg-surface-900/70 backdrop-blur-sm
        rounded-tl-lg
        text-[9px] text-surface-600
      ">
        © OpenStreetMap contributors
      </div>
    </section>
  );
}
