import { useMemo } from "react";
import type { FaceitData, FaceitMatch } from "../lib/demoData";
import { ACTIVE_DUTY_MAPS, getMapBanner } from "../lib/mapPool";

// FACEIT-only map performance, kept fully separate from Steam map stats.
// Two data sources combined intelligently:
//   1. Faceit `segments` (lifetime per-map stats reported by FACEIT)
//   2. Recent match history (used as a fallback / verification)
// Steam Premier map data is NEVER mixed in here.

export function FaceitMapPerformance({ faceit }: { faceit: FaceitData | null }) {
  const segments = (faceit?.stats?.segments || []).filter((s) => s.mode === "5v5" || !s.mode);
  const matches = faceit?.matches || [];

  // Aggregate from segments primarily, supplement from match history
  const mapStats = useMemo(() => {
    const byMap = new Map<string, {
      name: string;
      matches: number;
      wins: number;
      winRate: number;
      avgKD: number | null;
      avgHS: number | null;
      source: "lifetime" | "recent";
    }>();

    // Pass 1: lifetime segments (preferred, more data)
    for (const s of segments) {
      const matchesPlayed = parseFloat(s.stats["Matches"] || "0");
      const wins = parseFloat(s.stats["Wins"] || "0");
      if (matchesPlayed === 0) continue;
      byMap.set(normalizeMapName(s.label), {
        name: normalizeMapName(s.label),
        matches: matchesPlayed,
        wins,
        winRate: parseFloat(s.stats["Win Rate %"] || "0"),
        avgKD: parseFloat(s.stats["Average K/D Ratio"] || "0") || null,
        avgHS: parseFloat(s.stats["Average Headshots %"] || "0") || null,
        source: "lifetime",
      });
    }

    // Pass 2: recent matches (only fill in gaps, don't overwrite lifetime data)
    const recentByMap = new Map<string, FaceitMatch[]>();
    for (const m of matches) {
      const key = normalizeMapName(m.map);
      if (!recentByMap.has(key)) recentByMap.set(key, []);
      recentByMap.get(key)!.push(m);
    }
    for (const [name, ms] of recentByMap) {
      if (byMap.has(name)) continue; // segments take priority
      const wins = ms.filter((m) => m.won).length;
      const kdSum = ms.reduce((s, m) => s + (m.kdRatio || 0), 0);
      const hsSum = ms.reduce((s, m) => s + (m.headshotsPct || 0), 0);
      byMap.set(name, {
        name,
        matches: ms.length,
        wins,
        winRate: (wins / ms.length) * 100,
        avgKD: kdSum > 0 ? +(kdSum / ms.length).toFixed(2) : null,
        avgHS: hsSum > 0 ? +(hsSum / ms.length).toFixed(0) : null,
        source: "recent",
      });
    }

    return Array.from(byMap.values()).sort((a, b) => b.matches - a.matches);
  }, [segments, matches]);

  if (mapStats.length === 0) {
    return (
      <div className="border border-cs-border bg-cs-panel p-6 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
          // No FACEIT map stats available
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Play a few FACEIT matches and your per-map performance will appear here.
        </p>
      </div>
    );
  }

  // Best FACEIT map (by win rate, min 5 matches)
  const eligible = mapStats.filter((m) => m.matches >= 5);
  const best = (eligible.length > 0 ? eligible : mapStats)
    .slice()
    .sort((a, b) => b.winRate - a.winRate)[0];

  const totalMatches = mapStats.reduce((s, m) => s + m.matches, 0);
  const totalWins = mapStats.reduce((s, m) => s + m.wins, 0);

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Best FACEIT map */}
        {best && (
          <div className="relative overflow-hidden border border-cs-orange/40 clip-corner">
            <img
              src={getMapBanner(best.name)}
              alt={`${best.name} banner`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-cs-bg/80 via-cs-bg/60 to-cs-bg/90" />
            <div className="relative p-6">
              <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// BEST FACEIT MAP</div>
              <div className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-white text-glow">
                {best.name}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <div className="font-display text-5xl font-black text-cs-orange">
                  {best.winRate.toFixed(0)}<span className="text-2xl">%</span>
                </div>
                <div className="pb-2 font-mono text-xs uppercase text-slate-300">win rate</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Matches</div>
                  <div className="font-display text-lg font-bold text-white">{best.matches}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Avg K/D</div>
                  <div className="font-display text-lg font-bold text-cs-orange">
                    {best.avgKD?.toFixed(2) ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-400">Avg HS%</div>
                  <div className="font-display text-lg font-bold text-cs-blue">
                    {best.avgHS != null ? `${best.avgHS}%` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Aggregate counters */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Counter label="Total FACEIT Matches" value={totalMatches} accent />
          <Counter label="Total Wins" value={totalWins} />
          <Counter label="Total Losses" value={totalMatches - totalWins} />
          <Counter
            label="Overall Win Rate"
            value={totalMatches > 0 ? `${((totalWins / totalMatches) * 100).toFixed(1)}%` : "—"}
            accent
          />
          <Counter label="Maps Played" value={mapStats.length} />
          <Counter label="Active Duty Coverage"
            value={`${mapStats.filter((m) => ACTIVE_DUTY_MAPS.some((ad) => normalizeMapName(ad.name) === m.name)).length} / ${ACTIVE_DUTY_MAPS.length}`}
          />
        </div>
      </div>

      {/* Per-map cards (Active Duty grid) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mapStats.map((m) => (
          <FaceitMapCard key={m.name} stat={m} />
        ))}
      </div>
    </div>
  );
}

function Counter({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${accent ? "text-cs-orange" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function FaceitMapCard({
  stat,
}: {
  stat: { name: string; matches: number; wins: number; winRate: number; avgKD: number | null; avgHS: number | null; source: string };
}) {
  const banner = getMapBanner(stat.name);
  return (
    <div className="relative overflow-hidden border border-cs-border clip-corner">
      <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-br from-cs-bg/85 via-cs-bg/65 to-cs-bg/95" />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="font-display text-lg font-bold uppercase tracking-tight text-white text-glow">
            {stat.name}
          </div>
          {stat.source === "recent" && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500" title="Estimated from recent matches only">
              EST.
            </span>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div
            className={`font-display text-2xl font-bold ${
              stat.winRate >= 60 ? "text-emerald-400" : stat.winRate >= 50 ? "text-cs-orange" : "text-cs-red"
            }`}
          >
            {stat.winRate.toFixed(1)}%
          </div>
          <div className="font-mono text-[10px] uppercase text-slate-400">
            {stat.matches} {stat.matches === 1 ? "match" : "matches"}
          </div>
        </div>

        <div className="mt-2 h-1 w-full bg-black/40">
          <div
            className={`h-full ${stat.winRate >= 60 ? "bg-emerald-400" : stat.winRate >= 50 ? "bg-cs-orange" : "bg-cs-red"}`}
            style={{ width: `${Math.min(stat.winRate, 100)}%` }}
          />
        </div>

        <div className="mt-3 flex justify-between font-mono text-[10px] uppercase text-slate-400">
          <span>K/D: <span className="text-cs-orange">{stat.avgKD?.toFixed(2) ?? "—"}</span></span>
          <span>HS%: <span className="text-cs-blue">{stat.avgHS != null ? `${stat.avgHS}%` : "—"}</span></span>
        </div>
      </div>
    </div>
  );
}

function normalizeMapName(name: string): string {
  return name
    .replace(/^de_/i, "")
    .replace(/_/g, " ")
    .toUpperCase()
    .trim()
    .replace(/^DUST 2$/, "DUST II")
    .replace(/^DUST2$/, "DUST II");
}
