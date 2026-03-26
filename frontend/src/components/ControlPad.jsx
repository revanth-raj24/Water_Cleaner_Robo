/**
 * ControlPad – directional arrow pad + conveyor belt toggle.
 *
 * Layout:
 *        [▲ FWD]
 *   [◄ L] [■ STOP] [R ►]
 *        [▼ BWD]
 *
 *   [CONVEYOR ON]  [CONVEYOR OFF]
 */

import { useState } from "react";

// Tailwind class helpers
const baseBtn =
  "select-none flex items-center justify-center rounded-xl font-bold text-white " +
  "transition-all duration-100 active:scale-95 shadow-lg cursor-pointer";

const dirBtn =
  baseBtn +
  " h-16 w-16 text-xl bg-robot-panel border border-robot-border " +
  "hover:bg-robot-accent hover:border-robot-accent";

const stopBtn =
  baseBtn +
  " h-16 w-16 text-lg bg-robot-danger border border-red-700 " +
  "hover:brightness-110";

export default function ControlPad({ sendCommand, connected }) {
  const [conveyorOn, setConveyorOn] = useState(false);

  const send = (cmd) => {
    if (!connected) return;
    sendCommand(cmd);
  };

  const toggleConveyor = () => {
    const nextState = !conveyorOn;
    setConveyorOn(nextState);
    send(nextState ? "conveyor_on" : "conveyor_off");
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-robot-panel rounded-2xl border border-robot-border">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        Robot Control
      </h2>

      {!connected && (
        <p className="text-xs text-robot-danger font-medium">
          No server connection – commands disabled
        </p>
      )}

      {/* ── Directional pad ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1 */}
        <div />
        <button
          className={dirBtn}
          title="Forward"
          onMouseDown={() => send("forward")}
          onMouseUp={() => send("stop")}
          onTouchStart={(e) => { e.preventDefault(); send("forward"); }}
          onTouchEnd={(e) => { e.preventDefault(); send("stop"); }}
        >
          ▲
        </button>
        <div />

        {/* Row 2 */}
        <button
          className={dirBtn}
          title="Left"
          onMouseDown={() => send("left")}
          onMouseUp={() => send("stop")}
          onTouchStart={(e) => { e.preventDefault(); send("left"); }}
          onTouchEnd={(e) => { e.preventDefault(); send("stop"); }}
        >
          ◄
        </button>
        <button
          className={stopBtn}
          title="Stop"
          onClick={() => send("stop")}
        >
          ■
        </button>
        <button
          className={dirBtn}
          title="Right"
          onMouseDown={() => send("right")}
          onMouseUp={() => send("stop")}
          onTouchStart={(e) => { e.preventDefault(); send("right"); }}
          onTouchEnd={(e) => { e.preventDefault(); send("stop"); }}
        >
          ►
        </button>

        {/* Row 3 */}
        <div />
        <button
          className={dirBtn}
          title="Backward"
          onMouseDown={() => send("backward")}
          onMouseUp={() => send("stop")}
          onTouchStart={(e) => { e.preventDefault(); send("backward"); }}
          onTouchEnd={(e) => { e.preventDefault(); send("stop"); }}
        >
          ▼
        </button>
        <div />
      </div>

      {/* ── Conveyor belt toggle ───────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-robot-border">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Conveyor Belt
        </span>
        <button
          onClick={toggleConveyor}
          disabled={!connected}
          className={`
            w-full py-3 rounded-xl font-bold text-white text-sm tracking-wide
            transition-all duration-200 active:scale-95 shadow-md
            disabled:opacity-40 disabled:cursor-not-allowed
            ${
              conveyorOn
                ? "bg-robot-success hover:brightness-110 border border-green-600"
                : "bg-slate-600 hover:bg-slate-500 border border-slate-500"
            }
          `}
        >
          {conveyorOn ? "⚙ CONVEYOR ON" : "⚙ CONVEYOR OFF"}
        </button>
      </div>

      {/* ── Key hints ─────────────────────────────────────────────── */}
      <p className="text-xs text-slate-500 text-center">
        Hold directional buttons to move · Release to stop
      </p>
    </div>
  );
}
