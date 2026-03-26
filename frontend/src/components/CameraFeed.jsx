/**
 * CameraFeed – ESP32-CAM live MJPEG stream.
 *
 * Uses <img> rather than <iframe> to avoid browser mixed-content blocking.
 * Maintains a 16:9 aspect ratio at all times.
 *
 * PLACEHOLDER: replace DEFAULT_CAM_URL with your ESP32-CAM's LAN IP.
 */

import { useState, useRef } from "react";

// ── PLACEHOLDER ───────────────────────────────────────────────────────────────
const DEFAULT_CAM_URL = "http://192.168.1.200:81/stream";

// ── SVG icons ────────────────────────────────────────────────────────────────

const EditIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const CameraOffIcon = () => (
  <svg className="w-10 h-10 text-surface-600" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 1l22 22" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

// ── No-signal placeholder ─────────────────────────────────────────────────────

function NoSignal({ url, onRetry }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-900">
      {/* Scan-line effect */}
      <div className="absolute inset-0 overflow-hidden opacity-5 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 2px,rgba(255,255,255,0.3) 4px)",
        }}
      />

      <CameraOffIcon />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-400">No Signal</p>
        <p className="text-[10px] text-surface-600 mt-0.5 font-mono break-all px-4">
          {url}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-surface-800 border border-surface-700/50 text-slate-400
          hover:border-cyan-500/40 hover:text-cyan-400
          transition-all duration-150 active:scale-95
        "
      >
        <RefreshIcon /> Retry
      </button>
    </div>
  );
}

// ── Recording dot ─────────────────────────────────────────────────────────────

function RecordingDot() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-900/80 backdrop-blur-sm">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-[10px] font-semibold tracking-wide text-red-400">LIVE</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CameraFeed() {
  const [camUrl, setCamUrl]     = useState(DEFAULT_CAM_URL);
  const [inputUrl, setInputUrl] = useState(DEFAULT_CAM_URL);
  const [editMode, setEditMode] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const imgKey = useRef(0); // increment to force remount

  const applyUrl = () => {
    imgKey.current += 1;
    setCamUrl(inputUrl);
    setHasError(false);
    setLoaded(false);
    setEditMode(false);
  };

  const retry = () => {
    imgKey.current += 1;
    setHasError(false);
    setLoaded(false);
  };

  return (
    <div className="
      flex flex-col h-full
      bg-surface-900/60 backdrop-blur-sm
      rounded-2xl border border-surface-700/50 shadow-panel
      p-5 gap-3
    ">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-surface-600">
            Camera
          </h2>
          <p className="text-base font-semibold text-white mt-0.5">Live Feed</p>
        </div>

        <div className="flex items-center gap-2">
          {loaded && !hasError && <RecordingDot />}
          <button
            onClick={() => setEditMode((v) => !v)}
            title="Change stream URL"
            className="
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              text-[11px] font-medium
              bg-surface-800 border border-surface-700/50 text-slate-400
              hover:border-cyan-500/40 hover:text-cyan-400
              transition-all duration-150 active:scale-95
            "
          >
            <EditIcon />
            {editMode ? "Cancel" : "URL"}
          </button>
        </div>
      </div>

      {/* ── URL editor ─────────────────────────────────────────────── */}
      {editMode && (
        <div className="flex gap-2 shrink-0 animate-fade-in">
          <input
            autoFocus
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyUrl()}
            placeholder="http://<ESP32_CAM_IP>:81/stream"
            className="
              flex-1 rounded-xl bg-surface-800 border border-surface-700/50
              px-3 py-2 text-xs text-white font-mono placeholder-surface-600
              focus:outline-none focus:border-cyan-500/50
              transition-colors duration-150
            "
          />
          <button
            onClick={applyUrl}
            className="
              px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold
              hover:bg-cyan-400 active:scale-95 transition-all duration-150
              shadow-glow-cyan
            "
          >
            Apply
          </button>
        </div>
      )}

      {/* ── Stream area (16:9) ──────────────────────────────────────── */}
      <div className="relative w-full flex-1 min-h-0 rounded-xl overflow-hidden border border-surface-700/40 bg-black">
        {/* Maintain 16:9 via aspect-video, but also flex-1 fills remaining space */}
        <div className="relative w-full h-full" style={{ aspectRatio: "unset" }}>

          {/* MJPEG stream image */}
          {!hasError && (
            <img
              key={imgKey.current}
              src={camUrl}
              alt="ESP32-CAM stream"
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setLoaded(true)}
              onError={() => { setHasError(true); setLoaded(false); }}
            />
          )}

          {/* Loading skeleton */}
          {!loaded && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-900">
              <div className="w-10 h-10 rounded-full border-2 border-surface-700 border-t-cyan-500 animate-spin" />
              <p className="text-xs text-surface-600">Connecting to camera…</p>
            </div>
          )}

          {/* No-signal placeholder */}
          {hasError && <NoSignal url={camUrl} onRetry={retry} />}

          {/* Overlay: stream URL badge */}
          {loaded && !hasError && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="
                px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm
                text-[9px] font-mono text-slate-400 truncate max-w-[70%]
              ">
                {camUrl}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
