/**
 * MapView – OpenStreetMap map via react-leaflet (no API key required).
 *
 * Displays a live-updating marker at the GPS coordinates sent by the ESP32.
 * Falls back to a default position (0, 0) when no GPS data is available.
 */

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet's default marker icon paths when bundled with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Default location when no GPS fix yet ─────────────────────────────────────
// PLACEHOLDER: Replace with your deployment area's approximate coordinates
const DEFAULT_POSITION = [13.0827, 80.2707]; // Chennai, India — change as needed
const DEFAULT_ZOOM = 14;

/**
 * Inner component – moves the map center whenever gpsPosition changes.
 */
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom(), {
        animate: true,
      });
    }
  }, [position, map]);
  return null;
}

export default function MapView({ gpsPosition }) {
  const markerPosition = gpsPosition
    ? [gpsPosition.lat, gpsPosition.lng]
    : DEFAULT_POSITION;

  const hasGps = Boolean(gpsPosition);

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          GPS Tracking
        </h2>
        {hasGps ? (
          <span className="text-xs text-robot-success font-mono">
            {gpsPosition.lat.toFixed(6)}, {gpsPosition.lng.toFixed(6)}
          </span>
        ) : (
          <span className="text-xs text-robot-warning font-medium">
            Awaiting GPS fix …
          </span>
        )}
      </div>

      {/* Map container – must have explicit height */}
      <div className="flex-1 rounded-xl overflow-hidden border border-robot-border min-h-[280px]">
        <MapContainer
          center={markerPosition}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          {/* OpenStreetMap tiles – free, no API key */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Robot marker */}
          <Marker position={markerPosition}>
            <Popup>
              <strong>Water Cleaning Robot</strong>
              <br />
              {hasGps
                ? `Lat: ${gpsPosition.lat.toFixed(6)} | Lng: ${gpsPosition.lng.toFixed(6)}`
                : "No GPS fix yet"}
            </Popup>
          </Marker>

          {/* Keeps the map centred on the robot */}
          <MapUpdater position={gpsPosition} />
        </MapContainer>
      </div>
    </div>
  );
}
