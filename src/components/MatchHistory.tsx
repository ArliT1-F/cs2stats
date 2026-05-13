import { useState } from "react";
import type { FaceitMatch } from "../lib/demoData";
import { getMapBanner } from "../lib/mapPool";
import { MatchDetail } from "./MatchDetail";

export function MatchHistory({ matches }: { matches: FaceitMatch[] | undefined }) {
  const [openMatch, setOpenMatch] = useState<string | null>(null);

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

  const wins = matches.filter((m) => m.won).length;
  const losses = matches.filter((m) => m.won === false).length;

  return (
    <div className="space-y-3">
      {/* Streak summary */}
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

      {/* Match cards */}
      {matches.map((m) => {
        const isOpen = openMatch === m.matchId;
        if (isOpen) {
          return (
            <MatchDetail
              key={m.matchId}
              match={m}
              onClose={() => setOpenMatch(null)}
            />
          );
        }
        return <CompactMatchCard key={m.matchId} match={m} onOpen={() => setOpenMatch(m.matchId)} />;
      })}
    </div>
  );
}

function CompactMatchCard({ match, onOpen }: { match: FaceitMatch; onOpen: () => void }) {
  const banner = getMapBanner(match.map);
  return (
    <button
      onClick={onOpen}
      className={`group relative flex w-full items-stretch overflow-hidden border text-left transition clip-corner ${
        match.won
          ? "border-emerald-500/30 hover:border-emerald-500/70"
          : match.won === false
          ? "border-cs-red/30 hover:border-cs-red/70"
          : "border-cs-border hover:border-slate-500"
      }`}
    >
      {/* Map thumb strip with banner background */}
      <div className="relative w-32 flex-shrink-0 overflow-hidden sm:w-44 md:w-56">
        <img
          src={banner}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cs-bg/40 via-cs-bg/20 to-cs-bg" />
        <div className="relative flex h-full flex-col justify-between p-3">
          <div
            className={`inline-flex w-fit items-center justify-center px-2 py-0.5 font-display text-xs font-black ${
              match.won
                ? "bg-emerald-500/80 text-cs-bg"
                : match.won === false
                ? "bg-cs-red/80 text-cs-bg"
                : "bg-slate-500/80 text-cs-bg"
            }`}
          >
            {match.won ? "WIN" : match.won === false ? "LOSS" : "—"}
          </div>
          <div className="font-display text-base font-bold uppercase tracking-tight text-white text-glow sm:text-lg">
            {match.map}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center gap-4 bg-cs-panel p-4">
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl font-bold text-white">{match.score}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500 truncate">
            {match.competition} · {formatRelative(match.finishedAt)}
          </div>
        </div>

        {/* Quick stats */}
        {match.kills !== null && (
          <div className="hidden text-center md:block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">K / D / A</div>
            <div className="font-display text-base font-bold">
              <span className="text-cs-orange">{match.kills}</span>
              <span className="text-slate-600"> / </span>
              <span className="text-cs-red">{match.deaths}</span>
              <span className="text-slate-600"> / </span>
              <span className="text-cs-blue">{match.assists}</span>
            </div>
          </div>
        )}
        {match.kdRatio !== null && (
          <div className="hidden text-center lg:block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">K/D</div>
            <div
              className={`font-display text-lg font-bold ${
                match.kdRatio >= 1.2 ? "text-emerald-400" : match.kdRatio >= 0.9 ? "text-cs-orange" : "text-cs-red"
              }`}
            >
              {match.kdRatio.toFixed(2)}
            </div>
          </div>
        )}
        {match.adr !== null && (
          <div className="hidden text-center lg:block">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">ADR</div>
            <div className="font-display text-lg font-bold text-slate-200">{match.adr}</div>
          </div>
        )}

        <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange opacity-0 transition group-hover:opacity-100">
          View →
        </div>
      </div>
    </button>
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
