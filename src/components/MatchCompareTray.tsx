import { useState } from "react";
import type { FaceitMatch } from "../lib/demoData";
import { getMapIcon } from "../lib/mapPool";

// Match comparison: pick any 2 of your recent FACEIT matches and see them
// side-by-side. The "tray" floats at the bottom-right of the dashboard
// once the user adds at least one match. Click "Compare" to open the modal.

export function MatchCompareTray({
  selected,
  matches,
  onRemove,
  onClear,
}: {
  selected: string[];
  matches: FaceitMatch[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (selected.length === 0) return null;

  const selectedMatches = selected
    .map((id) => matches.find((m) => m.matchId === id))
    .filter((m): m is FaceitMatch => !!m);

  return (
    <>
      {/* Floating tray (always visible while selection > 0) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-3 border border-cs-orange/60 bg-cs-bg/95 p-3 shadow-2xl backdrop-blur clip-corner">
        <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange">
          // COMPARE
        </div>
        <div className="flex gap-1">
          {[0, 1].map((slot) => {
            const m = selectedMatches[slot];
            return (
              <div
                key={slot}
                className={`flex h-10 w-12 items-center justify-center border ${
                  m ? "border-cs-orange/60" : "border-dashed border-cs-border"
                }`}
              >
                {m ? (
                  <img src={getMapIcon(m.map) || ""} alt="" className="h-7 w-7 object-contain" />
                ) : (
                  <span className="font-mono text-[10px] text-slate-600">—</span>
                )}
              </div>
            );
          })}
        </div>
        <button
          disabled={selected.length < 2}
          onClick={() => setOpen(true)}
          className="bg-cs-orange px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-bg disabled:opacity-40"
        >
          Compare ({selected.length}/2)
        </button>
        <button
          onClick={onClear}
          className="font-display text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-cs-red"
        >
          Clear
        </button>
      </div>

      {open && selectedMatches.length === 2 && (
        <CompareModal a={selectedMatches[0]} b={selectedMatches[1]} onClose={() => setOpen(false)} onRemove={onRemove} />
      )}
    </>
  );
}

function CompareModal({ a, b, onClose, onRemove }: {
  a: FaceitMatch;
  b: FaceitMatch;
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  // Side-by-side stat rows. Highlight the better value with green.
  const rows: Array<{ label: string; va: number | null; vb: number | null; higherBetter: boolean; format?: (n: number) => string }> = [
    { label: "Result", va: a.won ? 1 : 0, vb: b.won ? 1 : 0, higherBetter: true, format: (n) => n === 1 ? "WIN" : "LOSS" },
    { label: "Score", va: null, vb: null, higherBetter: true },
    { label: "Kills", va: a.kills, vb: b.kills, higherBetter: true },
    { label: "Deaths", va: a.deaths, vb: b.deaths, higherBetter: false },
    { label: "Assists", va: a.assists, vb: b.assists, higherBetter: true },
    { label: "K/D", va: a.kdRatio, vb: b.kdRatio, higherBetter: true, format: (n) => n.toFixed(2) },
    { label: "ADR", va: a.adr, vb: b.adr, higherBetter: true },
    { label: "Headshot %", va: a.headshotsPct, vb: b.headshotsPct, higherBetter: true, format: (n) => `${n}%` },
    { label: "MVPs", va: a.mvps, vb: b.mvps, higherBetter: true },
    { label: "Triple Kills", va: a.tripleKills ?? null, vb: b.tripleKills ?? null, higherBetter: true },
    { label: "Quad Kills", va: a.quadroKills ?? null, vb: b.quadroKills ?? null, higherBetter: true },
    { label: "Aces (5K)", va: a.pentaKills ?? null, vb: b.pentaKills ?? null, higherBetter: true },
    { label: "Entry Kills", va: a.firstKills ?? null, vb: b.firstKills ?? null, higherBetter: true },
    { label: "Clutch Kills", va: a.clutchKills ?? null, vb: b.clutchKills ?? null, higherBetter: true },
    { label: "Flashes Thrown", va: a.flashesThrown ?? null, vb: b.flashesThrown ?? null, higherBetter: true },
    { label: "Utility Damage", va: a.utilityDamage ?? null, vb: b.utilityDamage ?? null, higherBetter: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-cs-orange/60 bg-cs-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cs-border bg-cs-bg/95 p-4 backdrop-blur">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange">// MATCH COMPARISON</div>
            <div className="font-display text-xl font-bold uppercase text-white">Side-by-side</div>
          </div>
          <button onClick={onClose} className="border border-cs-border bg-cs-panel px-3 py-1 font-mono text-xs uppercase text-slate-300 hover:border-cs-red hover:text-cs-red">
            ✕ Close
          </button>
        </div>

        {/* Match headers */}
        <div className="grid grid-cols-2 gap-3 border-b border-cs-border p-4">
          {[a, b].map((m, i) => (
            <div key={m.matchId} className={`relative border ${m.won ? "border-emerald-500/40" : "border-cs-red/40"} bg-cs-panel p-3`}>
              <button
                onClick={() => onRemove(m.matchId)}
                className="absolute right-2 top-2 font-mono text-[10px] text-slate-500 hover:text-cs-red"
                title="Remove from comparison"
              >
                ✕
              </button>
              <div className="flex items-center gap-2">
                <img src={getMapIcon(m.map) || ""} alt="" className="h-10 w-10 object-contain" />
                <div className="min-w-0">
                  <div className="font-display text-base font-bold uppercase text-white truncate">{m.map}</div>
                  <div className={`font-display text-lg font-black ${m.won ? "text-emerald-400" : "text-cs-red"}`}>
                    {m.won ? "WIN" : "LOSS"} · {m.score}
                  </div>
                </div>
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                {i === 0 ? "MATCH A" : "MATCH B"} · {m.competition}
              </div>
            </div>
          ))}
        </div>

        {/* Stat rows */}
        <div className="divide-y divide-cs-border/50">
          {rows.map((r) => {
            const va = r.va, vb = r.vb;
            const fmt = (n: number | null) => n === null ? "—" : r.format ? r.format(n) : String(n);
            const aBetter = va !== null && vb !== null && (r.higherBetter ? va > vb : va < vb);
            const bBetter = va !== null && vb !== null && (r.higherBetter ? vb > va : vb < va);
            return (
              <div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-2">
                <div className={`text-right font-display text-sm font-bold ${aBetter ? "text-emerald-400" : "text-slate-300"}`}>
                  {fmt(va)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 text-center min-w-[100px]">
                  {r.label}
                </div>
                <div className={`text-left font-display text-sm font-bold ${bBetter ? "text-emerald-400" : "text-slate-300"}`}>
                  {fmt(vb)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
