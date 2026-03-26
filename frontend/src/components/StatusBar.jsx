/**
 * StatusBar – top strip showing connection state and latest server message.
 */

export default function StatusBar({ connected, statusMsg, gpsPosition }) {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-robot-panel border-b border-robot-border">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <span className="text-2xl select-none">🌊</span>
        <span className="text-lg font-bold tracking-wide text-white">
          Water Cleaning Robot
        </span>
      </div>

      {/* Status message */}
      <p className="hidden sm:block text-sm text-slate-400 truncate max-w-xs">
        {statusMsg}
      </p>

      {/* Indicators */}
      <div className="flex items-center gap-4">
        {/* GPS indicator */}
        {gpsPosition && (
          <span className="hidden md:flex items-center gap-1 text-xs text-slate-400 font-mono">
            📍 {gpsPosition.lat.toFixed(5)}, {gpsPosition.lng.toFixed(5)}
          </span>
        )}

        {/* WS connection dot */}
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected ? "bg-robot-success animate-pulse" : "bg-robot-danger"
            }`}
          />
          <span className={connected ? "text-robot-success" : "text-robot-danger"}>
            {connected ? "Online" : "Offline"}
          </span>
        </span>
      </div>
    </header>
  );
}
