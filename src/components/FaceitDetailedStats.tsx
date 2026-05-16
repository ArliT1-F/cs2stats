import { useMemo, useState } from "react";
import type { FaceitData, FaceitMatch, LightHistoryItem } from "../lib/demoData";
import { getMapBanner } from "../lib/mapPool";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, ReferenceLine,
} from "recharts";

// ----------------------------------------------------------------------------
// Massive FACEIT detailed-stats panel (faceittracker.net style).
// Combines lifetime stats + recent matches + activity timeline + ELO chart.
// All data is FACEIT-only — never mixes with Steam stats elsewhere on the page.
// ----------------------------------------------------------------------------

export function FaceitDetailedStats({ faceit }: { faceit: FaceitData | null }) {
  if (!faceit?.player) return null;
  const lifetime = faceit.lifetimeRaw || faceit.stats?.lifetime || {};
  const matches = faceit.matches || [];
  const lightHistory = faceit.historyLight || [];
  const allActivity: LightHistoryItem[] = [
    ...matches.map((m) => ({
      matchId: m.matchId,
      finishedAt: m.finishedAt,
      startedAt: m.startedAt ?? null,
      competition: m.competition,
      won: m.won,
      map: m.map,
    })),
    ...lightHistory,
  ];

  return (
    <div className="space-y-6">
      <PerformanceMetrics lifetime={lifetime} matches={matches} />
      <OtherStats lifetime={lifetime} matches={matches} />
      <PlayActivity activity={allActivity} />
      <EloProgress matches={matches} lightHistory={lightHistory} currentElo={faceit.player.games?.cs2?.faceit_elo} />
      <MapHighlights matches={matches} />
      <TotalStatsPanel lifetime={lifetime} matches={matches} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PERFORMANCE METRICS — top tiles with delta vs ~30-day baseline
// ────────────────────────────────────────────────────────────────────────────
function PerformanceMetrics({
  lifetime,
  matches,
}: {
  lifetime: Record<string, string>;
  matches: FaceitMatch[];
}) {
  // Compute "recent form" deltas vs lifetime average
  const recent = useMemo(() => aggregateMatches(matches), [matches]);

  const winRate = num(lifetime["Win Rate %"]);
  const adr = num(lifetime["ADR"]);
  const kr = num(lifetime["K/R Ratio"]) ?? num(lifetime["Average K/R Ratio"]);
  const clutchRate = num(lifetime["1v1 Win Rate"]);
  const entryRate = num(lifetime["Entry Success Rate"]);
  const hsPct = num(lifetime["Average Headshots %"]);
  const flashPct = num(lifetime["Flash Success Rate"]);
  const flashPerRound = num(lifetime["Flashes per Round"]);
  const utilDmgPerRound = num(lifetime["Utility Damage per Round"]);

  const tiles: Array<{ label: string; value: number | null; suffix?: string; delta: number | null; good: "high" | "low" }> = [
    { label: "Win rate", value: winRate, suffix: "%", delta: deltaPct(recent.winRate, winRate), good: "high" },
    { label: "ADR", value: adr, delta: delta(recent.avgADR, adr), good: "high" },
    { label: "K/R", value: kr, delta: delta(recent.avgKR, kr, 2), good: "high" },
    { label: "Clutch Success", value: clutchRate, suffix: "%", delta: deltaPct(recent.clutchRate, clutchRate), good: "high" },
    { label: "Entry Success", value: entryRate, suffix: "%", delta: deltaPct(recent.entrySuccess, entryRate), good: "high" },
    { label: "Headshot %", value: hsPct, suffix: "%", delta: deltaPct(recent.avgHS, hsPct), good: "high" },
    { label: "Flash Success", value: flashPct, suffix: "%", delta: deltaPct(recent.flashSuccess, flashPct), good: "high" },
    { label: "Flashes per round", value: flashPerRound, delta: delta(recent.flashesPerRound, flashPerRound, 2), good: "high" },
    { label: "Utility dmg / Round", value: utilDmgPerRound, delta: delta(recent.utilDmgPerRound, utilDmgPerRound, 1), good: "high" },
  ];

  return (
    <div>
      <PanelHeader label="Performance" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <MetricTile key={t.label} {...t} />
        ))}
      </div>
    </div>
  );
}

function MetricTile({
  label, value, suffix, delta, good,
}: {
  label: string; value: number | null; suffix?: string; delta: number | null; good: "high" | "low";
}) {
  const positive = delta !== null && (good === "high" ? delta > 0 : delta < 0);
  const negative = delta !== null && (good === "high" ? delta < 0 : delta > 0);
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="font-display text-2xl font-bold text-white">
        {value !== null ? `${formatNum(value)}${suffix || ""}` : "—"}
      </div>
      {delta !== null && delta !== 0 && (
        <div className={`mt-0.5 font-mono text-[11px] font-bold ${positive ? "text-emerald-400" : negative ? "text-cs-red" : "text-slate-500"}`}>
          {delta > 0 ? "▲ " : "▼ "}
          {Math.abs(delta).toFixed(Math.abs(delta) < 1 ? 2 : 1)}{suffix || ""}
        </div>
      )}
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// OTHER STATS — quick counters
// ────────────────────────────────────────────────────────────────────────────
function OtherStats({ lifetime, matches }: { lifetime: Record<string, string>; matches: FaceitMatch[] }) {
  const totalWins = num(lifetime["Wins"]) ?? num(lifetime["Total Wins"]);
  const totalKills = num(lifetime["Total Kills with extended stats"]) ?? sumStat(matches, "kills");
  const totalClutches = num(lifetime["Total Clutches"]);
  const totalMVPs = num(lifetime["Total MVPs"]) ?? sumStat(matches, "mvps");
  const totalAces = num(lifetime["Total Aces"]) ?? sumStat(matches, "pentaKills");

  const tiles = [
    { label: "Total wins", value: totalWins },
    { label: "Total kills", value: totalKills },
    { label: "Total clutches", value: totalClutches },
    { label: "MVPs", value: totalMVPs },
    { label: "Aces", value: totalAces },
  ];

  return (
    <div>
      <PanelHeader label="Other stats" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="border border-cs-border bg-cs-panel p-4 clip-corner">
            <div className="font-display text-2xl font-bold text-cs-orange">
              {t.value !== null && t.value !== undefined ? formatNum(t.value) : "—"}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {t.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PLAY ACTIVITY — counts, most active month/hour, daily/weekly chart, heatmap
// ────────────────────────────────────────────────────────────────────────────
function PlayActivity({ activity }: { activity: LightHistoryItem[] }) {
  const stats = useMemo(() => {
    if (activity.length === 0) return null;

    const days = new Set<string>();
    const monthCount: Record<string, number> = {};
    const hourCount: Record<number, { matches: number; wins: number }> = {};
    const dayOfWeekCount: Record<number, { matches: number; wins: number }> = {};
    const dayCount: Record<string, { matches: number; wins: number }> = {};
    let wins = 0;

    for (const a of activity) {
      if (!a.finishedAt) continue;
      const d = new Date(a.finishedAt * 1000);
      const dayKey = d.toISOString().slice(0, 10);
      const monthKey = d.toLocaleString("en-US", { month: "long" });
      const hour = d.getHours();
      const dow = d.getDay();

      days.add(dayKey);
      monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
      if (!hourCount[hour]) hourCount[hour] = { matches: 0, wins: 0 };
      hourCount[hour].matches++;
      if (a.won) hourCount[hour].wins++;

      if (!dayOfWeekCount[dow]) dayOfWeekCount[dow] = { matches: 0, wins: 0 };
      dayOfWeekCount[dow].matches++;
      if (a.won) dayOfWeekCount[dow].wins++;

      if (!dayCount[dayKey]) dayCount[dayKey] = { matches: 0, wins: 0 };
      dayCount[dayKey].matches++;
      if (a.won) dayCount[dayKey].wins++;

      if (a.won) wins++;
    }

    const mostActiveMonth = Object.entries(monthCount).sort((a, b) => b[1] - a[1])[0];
    const mostActiveHour = Object.entries(hourCount).sort((a, b) => b[1].matches - a[1].matches)[0];

    const winRate = activity.length > 0 ? +((wins / activity.length) * 100).toFixed(1) : 0;
    const avgDaily = days.size > 0 ? +(activity.length / days.size).toFixed(1) : 0;

    // Daily series (last 30 days)
    const today = new Date();
    today.setHours(0,0,0,0);
    const dailySeries = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      const k = d.toISOString().slice(0, 10);
      const e = dayCount[k] || { matches: 0, wins: 0 };
      return {
        day: d.getDate().toString().padStart(2, "0"),
        matches: e.matches,
        wins: e.wins,
      };
    });

    // Day-of-week series
    const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dowSeries = dowLabels.map((label, i) => {
      const e = dayOfWeekCount[i] || { matches: 0, wins: 0 };
      return { day: label, matches: e.matches, wins: e.wins };
    });

    // Activity heatmap (last 12 weeks × 7 days)
    const heatmap: Array<{ date: string; matches: number; intensity: number }> = [];
    for (let w = 11; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const k = date.toISOString().slice(0, 10);
        const m = dayCount[k]?.matches || 0;
        heatmap.push({ date: k, matches: m, intensity: m === 0 ? 0 : m <= 1 ? 1 : m <= 3 ? 2 : m <= 5 ? 3 : 4 });
      }
    }

    return {
      total: activity.length,
      daysPlayed: days.size,
      mostActiveMonth: mostActiveMonth ? mostActiveMonth[0] : null,
      mostActiveHour: mostActiveHour ? +mostActiveHour[0] : null,
      mostActiveHourWinRate: mostActiveHour
        ? +((mostActiveHour[1].wins / mostActiveHour[1].matches) * 100).toFixed(1)
        : null,
      winRate,
      avgDaily,
      dailySeries,
      dowSeries,
      heatmap,
    };
  }, [activity]);

  if (!stats) return null;

  return (
    <div>
      <PanelHeader label="Play activity" sublabel="Beta" />

      {/* Top counters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActivityStat label="Matches played" value={stats.total} />
        <ActivityStat label="Days played" value={stats.daysPlayed} />
        <ActivityStat label="Most active month" value={stats.mostActiveMonth || "—"} small />
        <ActivityStat label="Most active hour" value={stats.mostActiveHour !== null ? formatHour(stats.mostActiveHour) : "—"}
          subtitle={stats.mostActiveHourWinRate !== null ? `Win rate ${stats.mostActiveHourWinRate}%` : ""} />
      </div>

      {/* Activity bar charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
          <div className="mb-2 flex items-baseline gap-3">
            <div className="font-display text-xl font-bold text-cs-orange">{stats.avgDaily}</div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Avg daily matches</div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailySeries}>
                <XAxis dataKey="day" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} interval={4} />
                <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#11172a", border: "1px solid #1f2942", borderRadius: 0 }}
                  labelStyle={{ color: "#f59e0b", fontSize: 11 }}
                />
                <Bar dataKey="matches" fill="#1f2942" stackId="a" />
                <Bar dataKey="wins" fill="#f59e0b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend />
        </div>

        <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
          <div className="mb-2 flex items-baseline gap-3">
            <div className="font-display text-xl font-bold text-cs-orange">
              {stats.dowSeries.reduce((s, d) => s + d.matches, 0) / 7 | 0}
            </div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Avg weekly matches</div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dowSeries}>
                <XAxis dataKey="day" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#11172a", border: "1px solid #1f2942", borderRadius: 0 }}
                  labelStyle={{ color: "#f59e0b", fontSize: 11 }}
                />
                <Bar dataKey="matches" fill="#1f2942" stackId="a" />
                <Bar dataKey="wins" fill="#f59e0b" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend />
        </div>
      </div>

      {/* Activity heatmap (12 weeks) */}
      <div className="mt-4 border border-cs-border bg-cs-panel p-4 clip-corner">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest text-slate-500">// ACTIVITY HEATMAP — Last 12 weeks</div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-slate-500">
            <span>Less</span>
            {[0,1,2,3,4].map((i) => (
              <span key={i} className="h-2.5 w-2.5 border border-cs-border" style={{ background: heatColor(i) }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <ActivityHeatmap heatmap={stats.heatmap} />
      </div>
    </div>
  );
}

function ActivityStat({ label, value, subtitle, small }: { label: string; value: number | string; subtitle?: string; small?: boolean }) {
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className={`font-display font-bold text-white ${small ? "text-xl" : "text-3xl"}`}>{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      {subtitle && <div className="mt-0.5 font-mono text-[10px] text-cs-orange">{subtitle}</div>}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex items-center gap-4 font-mono text-[10px] uppercase text-slate-500">
      <span className="flex items-center gap-1.5"><span className="h-2 w-3" style={{ background: "#1f2942" }} /> Matches played</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-3" style={{ background: "#f59e0b" }} /> Wins</span>
    </div>
  );
}

// Heatmap renderer with day-of-week labels (left), month labels (top), and a
// custom React hover tooltip (browser title= is too laggy and ugly).
// Cells are rendered with explicit small px sizing so the grid never feels
// "suffocating" on wide layouts.
function ActivityHeatmap({ heatmap }: { heatmap: Array<{ date: string; matches: number; intensity: number }> }) {
  // Build columns: 12 weeks × 7 days. heatmap is laid out [w0d0, w0d1...w0d6, w1d0...]
  const columns: Array<Array<{ date: string; matches: number; intensity: number }>> = [];
  for (let w = 0; w < 12; w++) {
    columns.push(heatmap.slice(w * 7, w * 7 + 7));
  }

  // Month labels: show the month name above the first column where it begins
  // (or the first cell of any new month going left → right).
  const monthLabels: (string | null)[] = columns.map((col, i) => {
    const first = col[0];
    if (!first) return null;
    const d = new Date(first.date);
    const monthName = d.toLocaleString("en-US", { month: "short" });
    if (i === 0) return monthName;
    const prevFirst = columns[i - 1][0];
    if (!prevFirst) return monthName;
    const prevMonth = new Date(prevFirst.date).getMonth();
    return d.getMonth() !== prevMonth ? monthName : null;
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [hover, setHover] = useState<{ x: number; y: number; cell: { date: string; matches: number } } | null>(null);

  return (
    <div className="relative">
      <div className="flex">
        {/* Day-of-week labels (left axis). Show every other row to save space. */}
        <div className="mr-1.5 flex flex-col justify-between pr-1 pt-4 font-mono text-[9px] uppercase tracking-widest text-slate-500">
          {dayLabels.map((d, i) => (
            <div key={d} className="h-3 leading-3">
              {i % 2 === 1 ? d : ""}
            </div>
          ))}
        </div>

        <div className="flex-1">
          {/* Month labels (top axis) */}
          <div className="mb-1 flex gap-0.5">
            {monthLabels.map((label, i) => (
              <div key={i} className="h-3 w-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">
                {label || ""}
              </div>
            ))}
          </div>

          {/* Cell grid — fixed small cell size, no aspect-ratio expansion */}
          <div className="flex gap-0.5">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-0.5">
                {col.map((cell) => {
                  const d = new Date(cell.date);
                  const dayName = d.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
                  return (
                    <div
                      key={cell.date}
                      className="h-3 w-3 cursor-pointer transition hover:ring-1 hover:ring-cs-orange"
                      style={{ background: heatColor(cell.intensity) }}
                      onMouseEnter={(e) => {
                        try {
                          const target = e.currentTarget as HTMLDivElement;
                          const container = target.closest(".relative") as HTMLDivElement | null;
                          if (!container) return;
                          const rect = target.getBoundingClientRect();
                          const containerRect = container.getBoundingClientRect();
                          setHover({
                            x: rect.left - containerRect.left + rect.width / 2,
                            y: rect.top - containerRect.top - 8,
                            cell: { date: dayName, matches: cell.matches },
                          });
                        } catch {
                          // Defensive — never let a tooltip crash the app
                        }
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-cs-orange/60 bg-cs-bg/95 px-2 py-1 backdrop-blur"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="font-display text-xs font-bold text-white">
            {hover.cell.matches} {hover.cell.matches === 1 ? "match" : "matches"}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
            {hover.cell.date}
          </div>
        </div>
      )}
    </div>
  );
}

function heatColor(intensity: number): string {
  return ["#0a0e1a", "#3d2c0a", "#7a5612", "#b8801a", "#f59e0b"][intensity] || "#0a0e1a";
}

// ────────────────────────────────────────────────────────────────────────────
// ELO PROGRESSION — line chart over recent matches
// ────────────────────────────────────────────────────────────────────────────
function EloProgress({
  matches,
  lightHistory,
  currentElo,
}: {
  matches: FaceitMatch[];
  lightHistory: LightHistoryItem[];
  currentElo: number | undefined;
}) {
  // ELO timeline reconstruction.
  // Preferred: use real `eloChange` values from the FACEIT match-detail
  // endpoint when available (the FACEIT history endpoint includes them on
  // recent matches but not always older ones).
  // Fallback: ±25 ELO per win/loss — close to FACEIT's actual algorithm but
  // not exact. Honest disclaimer shown on the chart.
  const series = useMemo(() => {
    const wls: Array<{ won: boolean | null; ts: number; eloChange: number | null }> = [
      ...matches.map((m) => ({
        won: m.won,
        ts: m.finishedAt,
        eloChange: m.eloChange ?? null,
      })),
      ...lightHistory.map((m) => ({
        won: m.won,
        ts: m.finishedAt,
        eloChange: null,
      })),
    ]
      .filter((m) => m.ts && m.won !== null)
      .sort((a, b) => a.ts - b.ts);

    if (wls.length === 0 || !currentElo) return null;

    // Walk backwards from current ELO, applying real change when known
    const reversed = [...wls].reverse();
    let elo = currentElo;
    const back: Array<{ idx: number; elo: number; won: boolean; estimated: boolean }> = [];
    for (let i = 0; i < reversed.length; i++) {
      const change = reversed[i].eloChange;
      const isReal = change !== null && Number.isFinite(change);
      back.push({ idx: i, elo, won: !!reversed[i].won, estimated: !isReal });
      elo = elo - (isReal ? change : (reversed[i].won ? 25 : -25));
    }
    const forward = back
      .reverse()
      .map((b, i) => ({ idx: i + 1, elo: b.elo, won: b.won, estimated: b.estimated }));
    return forward;
  }, [matches, lightHistory, currentElo]);

  if (!series || series.length === 0) return null;
  const eloMin = Math.min(...series.map((s) => s.elo));
  const eloMax = Math.max(...series.map((s) => s.elo));
  const diff = series[series.length - 1].elo - series[0].elo;
  const wins = series.filter((s) => s.won).length;
  const losses = series.length - wins;

  return (
    <div>
      <PanelHeader label="Progress" sublabel="ELO" />
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Tile label="ELO change" value={`${diff >= 0 ? "+" : ""}${diff}`} accent={diff >= 0 ? "text-emerald-400" : "text-cs-red"} />
          <Tile label="Highest Elo" value={eloMax.toLocaleString()} />
          <Tile label="Lowest Elo" value={eloMin.toLocaleString()} />
          <Tile label="Win %" value={`${((wins / series.length) * 100).toFixed(1)}%`} />
          <Tile label="Matches" value={series.length} subtitle={`W ${wins} · L ${losses}`} />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
              <XAxis dataKey="idx" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} domain={["dataMin - 30", "dataMax + 30"]} />
              <Tooltip
                contentStyle={{ background: "#11172a", border: "1px solid #1f2942", borderRadius: 0 }}
                labelStyle={{ color: "#f59e0b", fontSize: 11 }}
                formatter={(v) => [`${v} ELO`, "ELO"]}
              />
              <ReferenceLine y={series[0].elo} stroke="#475569" strokeDasharray="2 4" />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0a0e1a", stroke: "#f59e0b" }}
                activeDot={{ r: 5, fill: "#f59e0b" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-600">
          // {(() => {
            const realCount = series.filter((s) => !s.estimated).length;
            const estCount = series.length - realCount;
            if (estCount === 0) return "All ELO values from FACEIT API (real data)";
            if (realCount === 0) return "ELO timeline estimated (±25 per W/L) — FACEIT didn't return per-match ELO";
            return `${realCount} real + ${estCount} estimated — FACEIT only exposes per-match ELO for some recent matches`;
          })()}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAP HIGHLIGHTS — best ADR / best Entry / best Clutch maps
// ────────────────────────────────────────────────────────────────────────────
function MapHighlights({ matches }: { matches: FaceitMatch[] }) {
  const byMap = useMemo(() => {
    const m: Record<string, FaceitMatch[]> = {};
    for (const x of matches) {
      const k = x.map || "—";
      if (!m[k]) m[k] = [];
      m[k].push(x);
    }
    return m;
  }, [matches]);

  if (Object.keys(byMap).length === 0) return null;

  // Best ADR
  const bestADR = Object.entries(byMap)
    .map(([map, ms]) => ({
      map,
      value: avg(ms.map((m) => m.adr)) || 0,
      recent: ms.slice(0, 3).map((m) => m.won),
    }))
    .sort((a, b) => b.value - a.value)[0];

  const bestEntry = Object.entries(byMap)
    .map(([map, ms]) => {
      const totalAttempts = ms.reduce((s, m) => s + (m.entryCount || 0), 0);
      const totalWins = ms.reduce((s, m) => s + (m.entryWins || 0), 0);
      return {
        map,
        value: totalAttempts > 0 ? +((totalWins / totalAttempts) * 100).toFixed(0) : 0,
        recent: ms.slice(0, 3).map((m) => m.won),
      };
    })
    .sort((a, b) => b.value - a.value)[0];

  const bestClutch = Object.entries(byMap)
    .map(([map, ms]) => {
      const wins = ms.reduce((s, m) => s + (m.oneVOneWins || 0) + (m.oneVTwoWins || 0), 0);
      const losses = ms.reduce((s, m) => s + (m.oneVOneLosses || 0) + (m.oneVTwoLosses || 0), 0);
      const total = wins + losses;
      return {
        map,
        value: total > 0 ? +((wins / total) * 100).toFixed(0) : 0,
        recent: ms.slice(0, 3).map((m) => m.won),
      };
    })
    .sort((a, b) => b.value - a.value)[0];

  return (
    <div>
      <PanelHeader label="Map highlights" />
      <div className="grid gap-4 md:grid-cols-3">
        <HighlightCard label="ADR" suffix="" map={bestADR.map} value={bestADR.value} recent={bestADR.recent} />
        <HighlightCard label="Entry success %" suffix="%" map={bestEntry.map} value={bestEntry.value} recent={bestEntry.recent} />
        <HighlightCard label="Clutch success %" suffix="%" map={bestClutch.map} value={bestClutch.value} recent={bestClutch.recent} />
      </div>
    </div>
  );
}

function HighlightCard({ label, suffix, map, value, recent }: { label: string; suffix: string; map: string; value: number; recent: (boolean | null)[] }) {
  return (
    <div className="relative overflow-hidden border border-cs-border clip-corner">
      <img src={getMapBanner(map)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-br from-cs-bg/85 via-cs-bg/65 to-cs-bg/95" />
      <div className="relative p-5">
        <div className="flex items-baseline gap-2">
          <div className="font-display text-4xl font-black text-cs-orange text-glow">
            {value.toFixed(value < 10 ? 1 : 0)}{suffix}
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-slate-300">{label}</div>
        </div>
        <div className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-white">
          {map}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="font-mono text-[10px] uppercase text-slate-400">Recent results</div>
          <div className="flex gap-1">
            {recent.slice(0, 5).map((r, i) => (
              <span
                key={i}
                className={`flex h-5 w-5 items-center justify-center font-display text-[10px] font-black ${
                  r ? "bg-emerald-500/30 text-emerald-300" : r === false ? "bg-cs-red/30 text-cs-red" : "bg-slate-500/30 text-slate-400"
                }`}
              >
                {r ? "W" : r === false ? "L" : "—"}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TOTAL STATS — the big detailed breakdown panel
// ────────────────────────────────────────────────────────────────────────────
function TotalStatsPanel({ lifetime, matches }: { lifetime: Record<string, string>; matches: FaceitMatch[] }) {
  const r = aggregateMatches(matches);
  const totalMatches = num(lifetime["Matches"]) ?? matches.length;
  const wins = num(lifetime["Wins"]) ?? matches.filter((m) => m.won).length;
  const losses = totalMatches - wins;
  const winRate = num(lifetime["Win Rate %"]) ?? (totalMatches ? (wins / totalMatches) * 100 : 0);

  // Aggregates from recent matches (since FACEIT lifetime doesn't expose all of these)
  const recentRounds = getOwnRoundTotals(matches);
  const totalRounds = recentRounds.total;
  const totalDamage = matches.reduce((s, m) => s + (m.damage || (m.adr && m.totalRounds ? m.adr * m.totalRounds : 0)), 0);
  const recentKills = sumStat(matches, "kills");
  const totalKills = num(lifetime["Total Kills with extended stats"]) ?? recentKills;
  const totalDeaths = sumStat(matches, "deaths");
  const totalAssists = sumStat(matches, "assists");
  const totalHeadshots = sumStat(matches, "headshots") || recentKills * (r.avgHS / 100);
  const lifetimeKR = num(lifetime["K/R Ratio"]) ?? num(lifetime["Average K/R Ratio"]);
  const lifetimeKD = num(lifetime["Average K/D Ratio"]) ?? num(lifetime["K/D Ratio"]);
  const headshotPct = num(lifetime["Average Headshots %"]) ?? r.avgHS;

  return (
    <div>
      <PanelHeader label="Total stats" />
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Matches */}
          <Group title="Matches" big={String(totalMatches)}>
            <Row label="Wins" value={wins} positive />
            <Row label="Losses" value={losses} negative />
            <Row label="Win rate" value={`${winRate.toFixed(1)}%`} />
            <Row label="Best win streak" value={lifetime["Longest Win Streak"]} />
            <Row label="Current win streak" value={lifetime["Current Win Streak"]} />
          </Group>

          <Group title="Recent rounds" big={totalRounds ? totalRounds.toLocaleString() : "—"}>
            <Row label="Rounds won" value={totalRounds ? recentRounds.won.toLocaleString() : "—"} />
            <Row label="Rounds win rate" value={totalRounds ? `${((recentRounds.won / totalRounds) * 100).toFixed(0)}%` : "—"} />
            <Row label="Total damage" value={Math.round(totalDamage).toLocaleString()} />
            <Row label="ADR" value={r.avgADR ? r.avgADR.toFixed(1) : (lifetime["ADR"] || "—")} />
          </Group>

          <Group title="Kills" big={totalKills.toLocaleString()}>
            <Row label="Deaths" value={totalDeaths.toLocaleString()} />
            <Row label="Assists" value={totalAssists.toLocaleString()} />
            <Row label="K/R" value={lifetimeKR !== null ? lifetimeKR.toFixed(2) : totalRounds > 0 ? (recentKills / totalRounds).toFixed(2) : "—"} />
            <Row label="K/D" value={lifetimeKD !== null ? lifetimeKD.toFixed(2) : totalDeaths > 0 ? (recentKills / totalDeaths).toFixed(2) : "—"} />
            <Row label="Headshots" value={Math.round(totalHeadshots).toLocaleString()} />
            <Row label="Headshot %" value={`${headshotPct.toFixed(0)}%`} />
          </Group>

          <Group title="Entry Success" big={`${r.entrySuccess.toFixed(0)}%`}>
            <Row label="First kills" value={sumStat(matches, "firstKills")} />
            <Row label="First deaths" value={sumStat(matches, "firstDeaths")} />
            <Row label="Entry attempts" value={sumStat(matches, "entryCount")} />
            <Row label="Entry attempts %" value={totalRounds > 0 ? `${((sumStat(matches, "entryCount") / totalRounds) * 100).toFixed(0)}%` : "—"} />
            <Row label="First kill / Round" value={totalRounds > 0 ? (sumStat(matches, "firstKills") / totalRounds).toFixed(2) : "—"} />
          </Group>

          <Group title="Multiple eliminations">
            <Row label="Aces" value={sumStat(matches, "pentaKills")} accent />
            <Row label="4k" value={sumStat(matches, "quadroKills")} />
            <Row label="3k" value={sumStat(matches, "tripleKills")} />
            <Row label="2k" value={"—"} />
            <Row label="1k" value={"—"} />
          </Group>

          <Group title="Weapons">
            <Row label="Sniper kills" value={sumStat(matches, "sniperKills")} />
            <Row label="Pistols" value={sumStat(matches, "pistolKills")} />
            <Row label="Knife" value={sumStat(matches, "knifeKills")} />
            <Row label="Zeus" value={sumStat(matches, "zeusKills")} />
          </Group>

          <Group title="Utility">
            <Row label="Flashes thrown" value={sumStat(matches, "flashesThrown")} />
            <Row label="Enemies flashed" value={sumStat(matches, "enemiesFlashed")} />
            <Row label="Flash success %" value={`${r.flashSuccess.toFixed(0)}%`} />
            <Row label="Flashes per round" value={r.flashesPerRound.toFixed(2)} />
            <Row label="HE grenades" value={sumStat(matches, "heCount")} />
            <Row label="Utility damage" value={sumStat(matches, "utilityDamage").toLocaleString()} />
          </Group>

          <Group title="Clutches" big={String(sumStat(matches, "clutchKills"))}>
            <Row label="Clutch kills" value={sumStat(matches, "clutchKills")} />
            <Row label="1v1 wins" value={sumStat(matches, "oneVOneWins")} positive />
            <Row label="1v1 losses" value={sumStat(matches, "oneVOneLosses")} negative />
            <Row label="1v1 win %" value={percent(sumStat(matches, "oneVOneWins"), sumStat(matches, "oneVOneWins") + sumStat(matches, "oneVOneLosses"))} />
            <Row label="1v2 wins" value={sumStat(matches, "oneVTwoWins")} positive />
            <Row label="1v2 losses" value={sumStat(matches, "oneVTwoLosses")} negative />
            <Row label="1v2 win %" value={percent(sumStat(matches, "oneVTwoWins"), sumStat(matches, "oneVTwoWins") + sumStat(matches, "oneVTwoLosses"))} />
          </Group>
        </div>
        <div className="mt-4 border-t border-cs-border pt-3 font-mono text-[10px] uppercase tracking-widest text-slate-600">
          // Lifetime totals from FACEIT API · Detailed breakdowns aggregated from your last {matches.length} matches with full stats
        </div>
      </div>
    </div>
  );
}

function Group({ title, big, children }: { title: string; big?: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-cs-orange/40 pl-3">
      {big !== undefined && (
        <div className="font-display text-3xl font-bold text-white">{big}</div>
      )}
      <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange">{title}</div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, positive, negative, accent }: { label: string; value: number | string | null | undefined; positive?: boolean; negative?: boolean; accent?: boolean }) {
  const cls = positive ? "text-emerald-400" : negative ? "text-cs-red" : accent ? "text-cs-orange" : "text-white";
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`font-display text-sm font-bold ${cls}`}>
        {value !== null && value !== undefined && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function PanelHeader({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      <div className="font-display text-xl font-bold uppercase tracking-tight text-white">{label}</div>
      {sublabel && (
        <span className="border border-cs-orange/40 bg-cs-orange/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cs-orange">
          {sublabel}
        </span>
      )}
    </div>
  );
}

function Tile({ label, value, accent, subtitle }: { label: string; value: string | number; accent?: string; subtitle?: string }) {
  return (
    <div className="border border-cs-border bg-cs-bg p-3 clip-corner">
      <div className={`font-display text-xl font-bold ${accent || "text-white"}`}>{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      {subtitle && <div className="mt-0.5 font-mono text-[10px] text-slate-600">{subtitle}</div>}
    </div>
  );
}

function aggregateMatches(matches: FaceitMatch[]) {
  if (matches.length === 0) {
    return {
      avgADR: 0, avgKR: 0, avgHS: 0, winRate: 0,
      entrySuccess: 0, clutchRate: 0, flashSuccess: 0,
      flashesPerRound: 0, utilDmgPerRound: 0,
    };
  }
  const n = matches.length;
  const sum = (key: keyof FaceitMatch) =>
    matches.reduce((s, m) => s + (Number(m[key]) || 0), 0);
  const totalRounds = matches.reduce((s, m) => s + (m.totalRounds || 0), 0) || n * 24;
  const wins = matches.filter((m) => m.won).length;

  const entryAttempts = sum("entryCount");
  const entryWins = sum("entryWins");
  const onevWins = sum("oneVOneWins") + sum("oneVTwoWins");
  const onevLosses = sum("oneVOneLosses") + sum("oneVTwoLosses");
  const flashTotal = sum("flashesThrown");
  const flashSucc = sum("flashSuccesses");

  return {
    avgADR: sum("adr") / n,
    avgKR: sum("kills") / Math.max(totalRounds, 1),
    avgHS: sum("headshotsPct") / n,
    winRate: (wins / n) * 100,
    entrySuccess: entryAttempts > 0 ? (entryWins / entryAttempts) * 100 : 0,
    clutchRate: onevWins + onevLosses > 0 ? (onevWins / (onevWins + onevLosses)) * 100 : 0,
    flashSuccess: flashTotal > 0 ? (flashSucc / flashTotal) * 100 : 0,
    flashesPerRound: flashTotal / Math.max(totalRounds, 1),
    utilDmgPerRound: sum("utilityDamage") / Math.max(totalRounds, 1),
  };
}

function sumStat(matches: FaceitMatch[], key: keyof FaceitMatch): number {
  return matches.reduce((s, m) => s + (Number(m[key]) || 0), 0);
}
function getOwnRoundTotals(matches: FaceitMatch[]): { total: number; won: number } {
  return matches.reduce(
    (acc, match) => {
      const ownTeam = match.teams.find((team) => team.players.some((player) => player.isMe));
      if (ownTeam?.score !== null && ownTeam?.score !== undefined && match.totalRounds) {
        acc.total += match.totalRounds;
        acc.won += ownTeam.score;
        return acc;
      }

      const scores = match.score.match(/\d+/g)?.map(Number) || [];
      if (scores.length >= 2 && match.won !== null) {
        acc.total += scores[0] + scores[1];
        acc.won += match.won ? Math.max(scores[0], scores[1]) : Math.min(scores[0], scores[1]);
      }
      return acc;
    },
    { total: 0, won: 0 }
  );
}
function num(v: string | number | undefined | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}
function avg(arr: (number | null | undefined)[]): number | null {
  const filtered = arr.filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}
function delta(recent: number | null, base: number | null, decimals = 1): number | null {
  if (recent === null || base === null) return null;
  return +(recent - base).toFixed(decimals);
}
function deltaPct(recent: number | null, base: number | null): number | null {
  return delta(recent, base, 1);
}
function percent(num: number, total: number): string {
  if (!total) return "—";
  return `${((num / total) * 100).toFixed(0)}%`;
}
function formatNum(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(v < 10 ? 2 : 1);
}
function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}
