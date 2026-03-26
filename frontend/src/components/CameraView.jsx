/**
 * CameraView – embeds the ESP32-CAM MJPEG stream in an <img> tag.
 *
 * PLACEHOLDER: Replace ESP32_CAM_IP with your ESP32-CAM's actual LAN IP.
 * The streaming URL format for the default ESP32-CAM web server is:
 *   http://<IP>:81/stream
 */

import { useState } from "react";

// ── PLACEHOLDER ───────────────────────────────────────────────────────────────
const DEFAULT_CAM_URL = "http://192.168.1.200:81/stream";
// Replace 192.168.1.200 with your ESP32-CAM's IP address

export default function CameraView() {
  const [camUrl, setCamUrl] = useState(DEFAULT_CAM_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_CAM_URL);
  const [editMode, setEditMode] = useState(false);
  const [streamError, setStreamError] = useState(false);

  const applyUrl = () => {
    setCamUrl(inputUrl);
    setStreamError(false);
    setEditMode(false);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Camera Stream
        </h2>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="text-xs text-robot-accent hover:underline"
        >
          {editMode ? "Cancel" : "Change URL"}
        </button>
      </div>

      {/* URL editor */}
      {editMode && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-slate-800 border border-robot-border px-3 py-1.5
                       text-sm text-white placeholder-slate-500 focus:outline-none
                       focus:border-robot-accent"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://<ESP32_CAM_IP>:81/stream"
          />
          <button
            onClick={applyUrl}
            className="px-3 py-1.5 rounded-lg bg-robot-accent text-white text-sm font-medium
                       hover:brightness-110 active:scale-95 transition-all"
          >
            Apply
          </button>
        </div>
      )}

      {/* Stream area */}
      <div className="flex-1 rounded-xl overflow-hidden border border-robot-border bg-black
                      flex items-center justify-center min-h-[200px] relative">
        {streamError ? (
          /* Offline placeholder */
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <span className="text-5xl">📷</span>
            <p className="text-sm font-medium">Camera stream unavailable</p>
            <p className="text-xs font-mono text-slate-600 break-all px-4 text-center">
              {camUrl}
            </p>
            <button
              onClick={() => { setStreamError(false); }}
              className="text-xs text-robot-accent hover:underline mt-1"
            >
              Retry
            </button>
          </div>
        ) : (
          /*
           * Using <img> with the MJPEG stream URL is the most reliable method
           * for ESP32-CAM. An <iframe> can also work but some browsers block
           * mixed-content iframes.
           */
          <img
            key={camUrl}               // remount when URL changes
            src={camUrl}
            alt="ESP32-CAM live stream"
            className="w-full h-full object-contain"
            onError={() => setStreamError(true)}
          />
        )}

        {/* URL badge */}
        {!streamError && (
          <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5
                          text-xs font-mono text-slate-400 max-w-[90%] truncate">
            {camUrl}
          </div>
        )}
      </div>
    </div>
  );
}
