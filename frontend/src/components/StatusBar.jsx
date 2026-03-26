/**
 * StatusBar – slim top navigation strip.
 * Shows brand, live server status, ESP32 count, and last status event.
 */

export default function StatusBar({ connected, statusMsg }) {
  return (
    <header
      className="
        relative z-10 flex items-center justify-between
        px-5 h-12 shrink-0
        bg-surface-900/80 backdrop-blur-md
        border-b border-surface-700/50
      "
    >
      {/* ── Brand ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Animated water drop logo */}
        <span className="relative flex h-7 w-7 items-center justify-center">
          <span
            className={`
              absolute inline-flex h-full w-full rounded-full opacity-40
              ${connected ? "animate-ping bg-cyan-400" : "bg-slate-600"}
            `}
          />
          <span
            className={`
              relative inline-flex h-4 w-4 rounded-full
              ${connected ? "bg-cyan-400" : "bg-slate-600"}
            `}
          />
        </span>
        <span className="font-semibold tracking-wide text-white text-sm">
          Water Cleaning Robot
        </span>
        <span className="hidden sm:inline text-surface-600 text-xs font-mono">
          v1.0
        </span>
      </div>

      {/* ── Centre: last status message ────────────────────────────── */}
      <p className="hidden md:block absolute left-1/2 -translate-x-1/2 text-xs text-surface-600 truncate max-w-xs text-center">
        {statusMsg}
      </p>

      {/* ── Right: connection pill ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          className={`
            flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
            border transition-colors duration-300
            ${connected
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10   border-red-500/30   text-red-400"}
          `}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-emerald-400 animate-pulse-slow" : "bg-red-400"
            }`}
          />
          {connected ? "Server Online" : "Disconnected"}
        </span>
      </div>
    </header>
  );
}
