/**
 * ControllerPanel – tactile D-pad + conveyor toggle.
 *
 * Keyboard shortcuts (when focused on the page):
 *   Arrow keys   → direction (hold to move, release to stop)
 *   Space        → stop
 *   C            → toggle conveyor
 */

import { useState, useEffect, useCallback } from "react";

// ── SVG icons ────────────────────────────────────────────────────────────────

const ArrowUp = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const ArrowDown = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ArrowLeft = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const ArrowRight = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const StopIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);
const ConveyorIcon = ({ spinning }) => (
  <svg className={`w-4 h-4 ${spinning ? "animate-spin-slow" : ""}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);

// ── D-pad button ─────────────────────────────────────────────────────────────

function DirButton({ command, icon, title, activeCmd, onPress, onRelease, disabled }) {
  const isActive = activeCmd === command;

  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={() => onPress(command)}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={(e) => { e.preventDefault(); onPress(command); }}
      onTouchEnd={(e)   => { e.preventDefault(); onRelease(); }}
      className={`
        relative flex items-center justify-center
        h-16 w-16 rounded-2xl select-none touch-none
        border transition-all duration-100 font-medium
        disabled:opacity-30 disabled:cursor-not-allowed
        ${isActive
          ? "bg-cyan-500/25 border-cyan-500/70 text-cyan-300 shadow-glow-cyan scale-95"
          : "bg-surface-800/70 border-surface-700/50 text-slate-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400 hover:shadow-lg active:scale-90"
        }
      `}
    >
      {icon}
      {/* Active ripple */}
      {isActive && (
        <span className="absolute inset-0 rounded-2xl bg-cyan-500/10 animate-pulse" />
      )}
    </button>
  );
}

// ── Conveyor toggle ───────────────────────────────────────────────────────────

function ConveyorToggle({ on, onToggle, disabled }) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span className={on ? "text-cyan-400" : "text-surface-600"}>
          <ConveyorIcon spinning={on} />
        </span>
        <div>
          <p className="text-xs font-semibold text-white">Conveyor Belt</p>
          <p className={`text-[10px] font-medium ${on ? "text-cyan-400" : "text-surface-600"}`}>
            {on ? "Running" : "Stopped"}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        onClick={onToggle}
        disabled={disabled}
        title={on ? "Turn conveyor off (C)" : "Turn conveyor on (C)"}
        className={`
          relative inline-flex h-7 w-14 shrink-0 items-center rounded-full
          transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
          focus:outline-none
          ${on
            ? "bg-cyan-500 shadow-glow-cyan"
            : "bg-surface-700 border border-surface-600"}
        `}
      >
        <span className={`
          absolute h-5 w-5 rounded-full bg-white shadow-md
          transition-transform duration-300
          ${on ? "translate-x-8" : "translate-x-1"}
        `} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ControllerPanel({ sendCommand, connected }) {
  const [activeCmd, setActiveCmd]   = useState(null);
  const [conveyorOn, setConveyorOn] = useState(false);

  const disabled = !connected;

  // ── press / release helpers ─────────────────────────────────────────────
  const handlePress = useCallback((cmd) => {
    if (disabled) return;
    setActiveCmd(cmd);
    sendCommand(cmd);
  }, [disabled, sendCommand]);

  const handleRelease = useCallback(() => {
    if (!activeCmd) return;
    if (["forward", "backward", "left", "right"].includes(activeCmd)) {
      sendCommand("stop");
    }
    setActiveCmd(null);
  }, [activeCmd, sendCommand]);

  const handleStop = useCallback(() => {
    if (disabled) return;
    sendCommand("stop");
    setActiveCmd(null);
  }, [disabled, sendCommand]);

  const toggleConveyor = useCallback(() => {
    if (disabled) return;
    setConveyorOn((v) => {
      const next = !v;
      sendCommand(next ? "conveyor_on" : "conveyor_off");
      return next;
    });
  }, [disabled, sendCommand]);

  // ── Keyboard controls ────────────────────────────────────────────────────
  useEffect(() => {
    const downMap = {
      ArrowUp:    "forward",
      ArrowDown:  "backward",
      ArrowLeft:  "left",
      ArrowRight: "right",
    };
    const held = new Set();

    const onKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === "INPUT") return;

      if (downMap[e.key] && !held.has(e.key)) {
        e.preventDefault();
        held.add(e.key);
        handlePress(downMap[e.key]);
      }
      if (e.key === " " && !held.has(" ")) {
        e.preventDefault();
        held.add(" ");
        handleStop();
      }
      if ((e.key === "c" || e.key === "C") && !held.has("c")) {
        held.add("c");
        toggleConveyor();
      }
    };

    const onKeyUp = (e) => {
      held.delete(e.key);
      if (downMap[e.key]) {
        e.preventDefault();
        handleRelease();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup",   onKeyUp);
    };
  }, [handlePress, handleRelease, handleStop, toggleConveyor]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="
      flex flex-col h-full
      bg-surface-900/60 backdrop-blur-sm
      rounded-2xl border border-surface-700/50 shadow-panel
      p-5 gap-5
    ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-surface-600">
            Navigation
          </h2>
          <p className="text-base font-semibold text-white mt-0.5">Robot Control</p>
        </div>
        {/* Connection indicator */}
        <span className={`
          flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg border
          ${connected
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : "text-red-400 bg-red-500/10 border-red-500/20"}
        `}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />
          {connected ? "Ready" : "No Signal"}
        </span>
      </div>

      {/* ── D-pad ────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1">
        {/* Decorative label */}
        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-1">
          Hold to move · Release to stop
        </p>

        {/* Row 1: Up */}
        <DirButton command="forward"  icon={<ArrowUp />}    title="Forward (↑)"
          activeCmd={activeCmd} onPress={handlePress} onRelease={handleRelease} disabled={disabled} />

        {/* Row 2: Left · Stop · Right */}
        <div className="flex items-center gap-1">
          <DirButton command="left" icon={<ArrowLeft />} title="Left (←)"
            activeCmd={activeCmd} onPress={handlePress} onRelease={handleRelease} disabled={disabled} />

          {/* STOP – centre */}
          <button
            title="Stop (Space)"
            onClick={handleStop}
            disabled={disabled}
            className={`
              flex items-center justify-center h-16 w-16 rounded-2xl
              border transition-all duration-100 select-none
              disabled:opacity-30 disabled:cursor-not-allowed
              bg-red-500/15 border-red-500/40 text-red-400
              hover:bg-red-500/25 hover:border-red-500/60 hover:shadow-glow-red
              active:scale-90
            `}
          >
            <StopIcon />
          </button>

          <DirButton command="right" icon={<ArrowRight />} title="Right (→)"
            activeCmd={activeCmd} onPress={handlePress} onRelease={handleRelease} disabled={disabled} />
        </div>

        {/* Row 3: Down */}
        <DirButton command="backward" icon={<ArrowDown />} title="Backward (↓)"
          activeCmd={activeCmd} onPress={handlePress} onRelease={handleRelease} disabled={disabled} />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="h-px bg-surface-700/50" />

      {/* ── Conveyor belt ────────────────────────────────────────────── */}
      <ConveyorToggle on={conveyorOn} onToggle={toggleConveyor} disabled={disabled} />

      {/* ── Keyboard hint ────────────────────────────────────────────── */}
      <div className="mt-auto pt-2 border-t border-surface-700/30">
        <p className="text-[10px] text-surface-600 text-center leading-5">
          <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-[9px]">↑↓←→</kbd>{" "}
          move &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-[9px]">Space</kbd>{" "}
          stop &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 rounded bg-surface-800 border border-surface-700 font-mono text-[9px]">C</kbd>{" "}
          conveyor
        </p>
      </div>
    </div>
  );
}
