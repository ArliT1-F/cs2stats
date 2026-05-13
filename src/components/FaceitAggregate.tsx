import { useMemo } from "react";
import type { FaceitData } from "../lib/demoData";

// Aggregate FACEIT-only stats. Pulled from:
//   - lifetime stats (matches, win rate, avg K/D, avg HS%, win streak)
//   - recent match history (recent K/D/A totals, ADR averages, multi-kills)
// This data is shown SEPARATELY from Steam lifetime stats and never combined.

export function FaceitAggregate({ faceit }: { faceit: FaceitData | null }) {
  const lifetime = faceit?.stats?.lifetime || {};
  const matches = faceit?.matches || [];

  // Recent-match aggregates (last 10)
  const recent = useMemo(() => {
    if (matches.length === 0) return null;
    const sum = (key: keyof typeof matches[0]) =>
      matches.reduce((s, m) => s + (Number(m[key]) || 0), 0);
    const totalKills = sum("kills");
    const totalDeaths = sum("deaths");
    const totalAssists = sum("assists");
    const totalMVPs = sum("mvps");
    const totalTriples = sum("tripleKills");
    const totalQuads = sum("quadroKills");
    const totalAces = sum("pentaKills");
    const adrSum = sum("adr");
    const hsPctSum = sum("headshotsPct");
    const wins = matches.filter((m) => m.won).length;
    return {
      matchesAnalyzed: matches.length,
      totalKills,
      totalDeaths,
      totalAssists,
      totalMVPs,
      totalTriples,
      totalQuads,
      totalAces,
      avgADR: matches.length ? +(adrSum / matches.length).toFixed(1) : 0,
      avgHSPct: matches.length ? +(hsPctSum / matches.length).toFixed(1) : 0,
      wins,
      losses: matches.length - wins,
      kdRatio: totalDeaths > 0 ? +(totalKills / totalDeaths).toFixed(2) : 0,
    };
  }, [matches]);

  if (Object.keys(lifetime).length === 0 && !recent) {
    return (
      <div className="border border-cs-border bg-cs-panel p-6 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
          // No FACEIT aggregate data
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Lifetime FACEIT */}
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">
            // FACEIT LIFETIME
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            From FACEIT API
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Total Matches" value={lifetime["Matches"] || "—"} accent />
          <Stat label="Win Rate" value={lifetime["Win Rate %"] ? `${lifetime["Win Rate %"]}%` : "—"} accent="text-emerald-400" />
          <Stat label="Wins" value={lifetime["Wins"] || "—"} />
          <Stat label="Avg K/D" value={lifetime["Average K/D Ratio"] || "—"} accent="text-cs-orange" />
          <Stat label="Avg HS%" value={lifetime["Average Headshots %"] ? `${lifetime["Average Headshots %"]}%` : "—"} accent="text-cs-blue" />
          <Stat label="Avg K/R" value={lifetime["Average K/R Ratio"] || "—"} />
          <Stat label="Longest Win Streak" value={lifetime["Longest Win Streak"] || "—"} />
          <Stat label="Current Streak" value={lifetime["Current Win Streak"] || "—"} />
          <Stat label="Total Headshots" value={lifetime["Total Headshots %"] || lifetime["Headshots"] || "—"} />
        </div>
      </div>

      {/* Recent matches (last 10) */}
      {recent && (
        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">
              // FACEIT RECENT FORM
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Last {recent.matchesAnalyzed} matches
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Recent K/D" value={recent.kdRatio.toFixed(2)} accent="text-cs-orange" />
            <Stat label="W / L" value={`${recent.wins} / ${recent.losses}`} accent />
            <Stat label="Avg ADR" value={recent.avgADR} accent="text-cs-blue" />
            <Stat label="Recent HS%" value={`${recent.avgHSPct}%`} />
            <Stat label="Total Kills" value={recent.totalKills} />
            <Stat label="Total Deaths" value={recent.totalDeaths} />
            <Stat label="Total Assists" value={recent.totalAssists} />
            <Stat label="MVPs" value={recent.totalMVPs} accent="text-cs-orange" />
            <Stat label="Triples" value={recent.totalTriples} />
            <Stat label="Quads" value={recent.totalQuads} />
            <Stat label="Aces (5K)" value={recent.totalAces} accent="text-cs-orange" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean | string;
}) {
  const colorClass = accent === true ? "text-cs-orange" : typeof accent === "string" ? accent : "text-white";
  return (
    <div className="border-l-2 border-cs-border pl-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-0.5 font-display text-lg font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
