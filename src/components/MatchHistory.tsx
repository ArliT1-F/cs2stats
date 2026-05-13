import { useState } from "react";
import type { FaceitMatch } from "../lib/demoData";
import { getMapBanner, getMapIcon } from "../lib/mapPool";
import { MatchDetail } from "./MatchDetail";
import { MatchCompareTray } from "./MatchCompareTray";

export function MatchHistory({ matches }: { matches: FaceitMatch[] | undefined }) {
  const [openMatch, setOpenMatch] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // bump oldest, keep last 2
      return [...prev, id];
    });
  };

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
        return (
          <CompactMatchCard
            key={m.matchId}
            match={m}
            onOpen={() => setOpenMatch(m.matchId)}
            isInCompare={compareIds.includes(m.matchId)}
            onToggleCompare={() => toggleCompare(m.matchId)}
          />
        );
      })}

      <MatchCompareTray
        selected={compareIds}
        matches={matches}
        onRemove={(id) => setCompareIds((prev) => prev.filter((x) => x !== id))}
        onClear={() => setCompareIds([])}
      />
    </div>
  );
}

function CompactMatchCard({
  match, onOpen, isInCompare, onToggleCompare,
}: {
  match: FaceitMatch;
  onOpen: () => void;
  isInCompare?: boolean;
  onToggleCompare?: () => void;
}) {
  const banner = getMapBanner(match.map);
  const mapIcon = getMapIcon(match.map);
  return (
    <button
      onClick={onOpen}
      className={`group relative flex w-full flex-col overflow-hidden border bg-cs-panel text-left transition clip-corner ${
        match.won
          ? "border-emerald-500/30 hover:border-emerald-500/70"
          : match.won === false
          ? "border-cs-red/30 hover:border-cs-red/70"
          : "border-cs-border hover:border-slate-500"
      }`}
    >
      {/* Top: full-width map banner inside the card */}
      <div className="relative h-20 w-full overflow-hidden sm:h-24">
        <img
          src={banner}
          alt={`${match.map} banner`}
          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
          loading="lazy"
        />
        {/* Dark gradient bottom→top so the banner blends into the panel */}
        <div className="absolute inset-0 bg-gradient-to-t from-cs-panel via-cs-panel/30 to-transparent" />

        {/* WIN/LOSS pill in the top-left corner of the banner */}
        <div
          className={`absolute left-3 top-3 inline-flex items-center justify-center px-2 py-0.5 font-display text-xs font-black ${
            match.won
              ? "bg-emerald-500/90 text-cs-bg"
              : match.won === false
              ? "bg-cs-red/90 text-cs-bg"
              : "bg-slate-500/90 text-cs-bg"
          }`}
        >
          {match.won ? "WIN" : match.won === false ? "LOSS" : "—"}
        </div>

        {/* Competition + relative time on the top-right of the banner */}
        <div className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-widest text-white/70 text-right">
          {match.competition}
          <div className="text-white/50">{formatRelative(match.finishedAt)}</div>
        </div>

        {/* Compare toggle (bottom-right of banner) */}
        {onToggleCompare && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(); }}
            className={`absolute bottom-2 right-2 px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-widest transition ${
              isInCompare
                ? "bg-cs-orange text-cs-bg"
                : "bg-cs-bg/70 text-slate-300 hover:bg-cs-orange/80 hover:text-cs-bg"
            }`}
            title={isInCompare ? "Remove from comparison" : "Add to comparison"}
          >
            {isInCompare ? "✓ COMPARE" : "+ COMPARE"}
          </button>
        )}
      </div>

      {/* Bottom: info row with map emblem on the far left */}
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Round map emblem (far left) */}
        {mapIcon && (
          <img
            src={mapIcon}
            alt={match.map}
            className="h-12 w-12 flex-shrink-0 object-contain sm:h-14 sm:w-14"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Map name + score + meta */}
        <div className="flex-1 min-w-0">
          <div className="font-display text-base font-bold uppercase tracking-tight text-white sm:text-lg">
            {match.map}
          </div>
          <div className="font-display text-xl font-bold text-white sm:text-2xl">{match.score}</div>
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
