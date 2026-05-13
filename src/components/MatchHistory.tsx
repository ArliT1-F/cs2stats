import { useState } from "react";
import type { FaceitMatch } from "../lib/demoData";

export function MatchHistory({ matches }: { matches: FaceitMatch[] | undefined }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!matches || matches.length === 0) {
    return (
      <div className="border border-cs-border bg-cs-panel p-6 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
          // No recent matches found
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Play some FACEIT matches to see them appear here.
        </p>
      </div>
    );
  }

  // Quick summary: W-L of last 10
  const wins = matches.filter((m) => m.won).length;
  const losses = matches.filter((m) => m.won === false).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-cs-border bg-cs-panel p-3 clip-corner">
        <div className="flex items-center gap-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            // LAST {matches.length} MATCHES
          </div>
          <div className="flex gap-1">
            {matches.map((m) => (
              <span
                key={m.matchId}
                className={`flex h-6 w-6 items-center justify-center font-display text-[10px] font-bold ${
                  m.won
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : m.won === false
                    ? "bg-cs-red/20 text-cs-red border border-cs-red/40"
                    : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                }`}
                title={`${m.map} · ${m.score}`}
              >
                {m.won ? "W" : m.won === false ? "L" : "—"}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-4 font-mono text-xs">
          <span className="text-emerald-400">{wins}W</span>
          <span className="text-cs-red">{losses}L</span>
          <span className="text-slate-500">
            {matches.length > 0 ? ((wins / matches.length) * 100).toFixed(0) : 0}% win rate
          </span>
        </div>
      </div>

      {matches.map((m) => {
        const isOpen = expanded === m.matchId;
        return (
          <div
            key={m.matchId}
            className={`border bg-cs-panel transition clip-corner ${
              m.won
                ? "border-emerald-500/30 hover:border-emerald-500/60"
                : m.won === false
                ? "border-cs-red/30 hover:border-cs-red/60"
                : "border-cs-border hover:border-slate-500"
            }`}
          >
            <button
              onClick={() => setExpanded(isOpen ? null : m.matchId)}
              className="flex w-full items-center gap-4 p-4 text-left"
            >
              {/* Result badge */}
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center font-display text-2xl font-black ${
                  m.won
                    ? "bg-emerald-500/20 text-emerald-400"
                    : m.won === false
                    ? "bg-cs-red/20 text-cs-red"
                    : "bg-slate-500/20 text-slate-400"
                }`}
              >
                {m.won ? "W" : m.won === false ? "L" : "?"}
              </div>

              {/* Map + competition */}
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-bold uppercase tracking-tight text-white">
                  {m.map}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 truncate">
                  {m.competition} · {formatRelative(m.finishedAt)}
                </div>
              </div>

              {/* Score */}
              <div className="hidden text-center sm:block">
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Score</div>
                <div className="font-display text-xl font-bold text-white">{m.score}</div>
              </div>

              {/* K/D/A */}
              {m.kills !== null && (
                <div className="hidden text-center md:block">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">K / D / A</div>
                  <div className="font-display text-base font-bold text-white">
                    <span className="text-cs-orange">{m.kills}</span>
                    <span className="text-slate-600"> / </span>
                    <span className="text-cs-red">{m.deaths}</span>
                    <span className="text-slate-600"> / </span>
                    <span className="text-cs-blue">{m.assists}</span>
                  </div>
                </div>
              )}

              {/* K/D ratio */}
              {m.kdRatio !== null && (
                <div className="hidden text-center lg:block">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">K/D</div>
                  <div
                    className={`font-display text-lg font-bold ${
                      m.kdRatio >= 1.2 ? "text-emerald-400" : m.kdRatio >= 0.9 ? "text-cs-orange" : "text-cs-red"
                    }`}
                  >
                    {m.kdRatio.toFixed(2)}
                  </div>
                </div>
              )}

              <svg
                className={`h-5 w-5 flex-shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Expanded detail panel */}
            {isOpen && (
              <div className="border-t border-cs-border bg-cs-bg/50 p-4">
                <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
                  <DetailStat label="Kills" value={m.kills} accent="text-cs-orange" />
                  <DetailStat label="Deaths" value={m.deaths} accent="text-cs-red" />
                  <DetailStat label="Assists" value={m.assists} accent="text-cs-blue" />
                  <DetailStat label="K/D Ratio" value={m.kdRatio?.toFixed(2)} />
                  <DetailStat label="K/R Ratio" value={m.krRatio?.toFixed(2)} />
                  <DetailStat label="Headshot %" value={m.headshotsPct ? `${m.headshotsPct}%` : null} />
                  <DetailStat label="MVPs" value={m.mvps} accent="text-cs-orange" />
                  <DetailStat label="3K Rounds" value={m.tripleKills} />
                  <DetailStat label="4K Rounds" value={m.quadroKills} />
                  <DetailStat label="ACES (5K)" value={m.pentaKills} accent="text-cs-orange" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-cs-border pt-3">
                  <a
                    href={m.matchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-cs-orange px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110"
                  >
                    <ExternalIcon /> View Match Room
                  </a>
                  {m.demoUrl ? (
                    <a
                      href={m.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 border border-cs-blue/60 bg-cs-blue/10 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-blue transition hover:bg-cs-blue/20"
                    >
                      <DownloadIcon /> Download Demo (.dem)
                    </a>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                      Demo not available
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DetailStat({ label, value, accent }: { label: string; value: number | string | null | undefined; accent?: string }) {
  return (
    <div className="border border-cs-border bg-cs-panel p-3 clip-corner">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-0.5 font-display text-lg font-bold ${accent || "text-white"}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function formatRelative(ts: number): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function ExternalIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
