/**
 * MapView – OpenStreetMap map via react-leaflet (no API key required).
 *
 * Props:
 *   gpsPosition    { lat, lng, accuracy? } | null
 *   gpsSource      "laptop" | "esp32"
 *   onToggleSource () => void
 *   geoError       string | null   (browser geolocation error, if any)
 */

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
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

// Fallback centre before any fix arrives (world centre)
const DEFAULT_POSITION = [20.0, 78.0]; // India – change if needed
const DEFAULT_ZOOM     = 5;
const TRACKING_ZOOM    = 16;

/** Moves the map view whenever the position changes. */
function MapUpdater({ position, hasTracked }) {
  const map = useMap();
  useEffect(() => {
    if (!position) return;
    // On first fix zoom in; afterwards just pan
    const zoom = hasTracked.current ? map.getZoom() : TRACKING_ZOOM;
    hasTracked.current = true;
    map.setView([position.lat, position.lng], zoom, { animate: true });
  }, [position, map, hasTracked]);
  return null;
}

export default function MapView({ gpsPosition, gpsSource, onToggleSource, geoError }) {
  const hasTracked  = { current: false };
  const hasGps      = Boolean(gpsPosition);
  const markerPos   = hasGps
    ? [gpsPosition.lat, gpsPosition.lng]
    : DEFAULT_POSITION;

  const accuracyM = gpsPosition?.accuracy;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          GPS Tracking
        </h2>

        <div className="flex items-center gap-3">
          {/* Coordinates / status */}
          {hasGps ? (
            <span className="text-xs text-robot-success font-mono">
              {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
              {accuracyM != null && (
                <span className="text-slate-500 ml-1">
                  ±{Math.round(accuracyM)} m
                </span>
              )}
            </span>
          ) : geoError ? (
            <span className="text-xs text-robot-danger font-medium" title={geoError}>
              GPS error
            </span>
          ) : (
            <span className="text-xs text-robot-warning font-medium">
              Acquiring fix …
            </span>
          )}

          {/* Source toggle button */}
          <button
            onClick={onToggleSource}
            className={`
              text-xs px-2.5 py-1 rounded-lg font-medium border transition-all
              ${gpsSource === "laptop"
                ? "bg-robot-accent/20 border-robot-accent text-robot-accent"
                : "bg-slate-700 border-robot-border text-slate-300 hover:bg-slate-600"}
            `}
            title={
              gpsSource === "laptop"
                ? "Using laptop GPS — click to switch to ESP32 GPS"
                : "Using ESP32 GPS — click to switch to laptop GPS"
            }
          >
            {gpsSource === "laptop" ? "💻 Laptop GPS" : "📡 ESP32 GPS"}
          </button>
        </div>
      </div>

      {/* Geolocation permission hint */}
      {geoError && gpsSource === "laptop" && (
        <p className="text-xs text-robot-danger bg-red-900/30 rounded-lg px-3 py-1.5">
          {geoError}. Allow location access in your browser, or switch to ESP32 GPS.
        </p>
      )}

      {/* ── Map container ──────────────────────────────────────────── */}
      <div className="flex-1 rounded-xl overflow-hidden border border-robot-border min-h-[280px]">
        <MapContainer
          center={markerPos}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          {/* OpenStreetMap tiles – free, no API key */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {hasGps && (
            <>
              {/* Accuracy circle */}
              {accuracyM != null && (
                <Circle
                  center={markerPos}
                  radius={accuracyM}
                  pathOptions={{
                    color: "#0ea5e9",
                    fillColor: "#0ea5e9",
                    fillOpacity: 0.10,
                    weight: 1,
                  }}
                />
              )}

              {/* Position marker */}
              <Marker position={markerPos}>
                <Popup>
                  <strong>
                    {gpsSource === "laptop" ? "Laptop GPS" : "Water Cleaning Robot"}
                  </strong>
                  <br />
                  Lat: {gpsPosition.lat.toFixed(6)}
                  <br />
                  Lng: {gpsPosition.lng.toFixed(6)}
                  {accuracyM != null && (
                    <>
                      <br />
                      Accuracy: ±{Math.round(accuracyM)} m
                    </>
                  )}
                </Popup>
              </Marker>
            </>
          )}

          <MapUpdater position={gpsPosition} hasTracked={hasTracked} />
        </MapContainer>
      </div>
    </div>
  );
}
