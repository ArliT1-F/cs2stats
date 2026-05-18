import { useState, useMemo } from "react";
import type { MapStat } from "../lib/demoData";
import { SUPPORTED_MAPS, ACTIVE_DUTY_MAPS, getMapBanner } from "../lib/mapPool";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts";

type Filter = "premier" | "all";

export function MapsSection({ maps }: { maps: MapStat[] }) {
  const [filter, setFilter] = useState<Filter>("premier");

  // Build a complete list — every Active Duty (or Reserve, if "all") map shown,
  // even if the user hasn't played it yet (with 0 stats placeholder).
  const fullMapList = useMemo(() => {
    const pool = filter === "premier" ? ACTIVE_DUTY_MAPS : SUPPORTED_MAPS;
    const playedByName = new Map(maps.map((m) => [m.name, m]));
    return pool.map((m) => {
      const played = playedByName.get(m.name);
      return (
        played || {
          name: m.name,
          pool: m.pool,
          rounds: 0,
          wins: 0,
          winRate: 0,
        }
      );
    });
  }, [maps, filter]);

  const playedOnly = fullMapList.filter((m) => m.rounds > 0);
  const sortedByWinRate = [...playedOnly].sort((a, b) => b.winRate - a.winRate);
  const best = sortedByWinRate[0];

  const chartData = playedOnly
    .slice()
    .sort((a, b) => b.rounds - a.rounds)
    .slice(0, 8)
    .map((m) => ({
      name: m.name === "DUST II" ? "DUST2" : m.name,
      winRate: +m.winRate.toFixed(1),
    }));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Filter tabs */}
      <div className="lg:col-span-3 -mt-2 flex flex-wrap items-center gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">// FILTER:</div>
        <div className="flex border border-cs-border bg-cs-panel">
          <FilterButton active={filter === "premier"} onClick={() => setFilter("premier")}>
            Active Duty (Premier)
          </FilterButton>
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All Competitive
          </FilterButton>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          {playedOnly.length} of {fullMapList.length} played
        </div>
      </div>

      {/* Best map highlight (with map banner background) */}
      {best ? (
        <div className="relative overflow-hidden border border-cs-orange/40 clip-corner lg:col-span-1">
          <img
            src={getMapBanner(best.name)}
            alt={`${best.name} map banner`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-cs-bg/85 via-cs-bg/60 to-cs-bg/95" />
          <div className="absolute inset-0 tactical-grid opacity-20" />
          <div className="relative p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// BEST MAP</div>
            <div className="mt-2 font-display text-5xl font-black uppercase tracking-tight text-white text-glow">
              {best.name}
            </div>
            <div className="mt-4 flex items-end gap-2">
              <div className="font-display text-6xl font-black text-cs-orange">
                {best.winRate.toFixed(0)}<span className="text-3xl">%</span>
              </div>
              <div className="pb-2 font-mono text-xs uppercase text-slate-300">win rate</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-sm">
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-300">Wins</div>
                <div className="font-display text-lg font-bold text-white">{best.wins.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-300">Rounds</div>
                <div className="font-display text-lg font-bold text-white">{best.rounds.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState filter={filter} />
      )}

      {/* Win-rate chart */}
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner lg:col-span-2">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">
          // WIN-RATE PER MAP {filter === "premier" ? "(ACTIVE DUTY)" : "(ALL)"}
        </div>
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#475569" tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 600 }} />
                <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" domain={[0, 100]} />
                <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4" label={{ value: "50%", fill: "#64748b", fontSize: 10, position: "insideTopRight" }} />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Win rate"]}
                  contentStyle={{ background: "#11172a", border: "1px solid #1f2942", borderRadius: 0 }}
                  labelStyle={{ color: "#f59e0b", fontWeight: 700 }}
                  cursor={{ fill: "rgba(245,158,11,0.05)" }}
                />
                <Bar dataKey="winRate" radius={[2, 2, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.winRate >= 60 ? "#22c55e" : d.winRate >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 items-center justify-center font-mono text-xs uppercase text-slate-600">
            // No matches recorded on these maps
          </div>
        )}
      </div>

      {/* All maps grid — banner background per card */}
      <div className="lg:col-span-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {fullMapList.map((m) => {
            const played = m.rounds > 0;
            return (
              <div
                key={m.name}
                className={`relative overflow-hidden border border-cs-border clip-corner ${!played ? "opacity-70" : ""}`}
              >
                <img
                  src={getMapBanner(m.name)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <div className={`absolute inset-0 ${
                  played
                    ? "bg-gradient-to-br from-cs-bg/85 via-cs-bg/65 to-cs-bg/95"
                    : "bg-gradient-to-br from-cs-bg/95 via-cs-bg/85 to-cs-bg"
                }`} />
                <div className="relative p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-display text-lg font-bold uppercase tracking-tight text-white text-glow">
                      {m.name}
                    </div>
                    {m.pool === "premier" ? (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-cs-orange">PREMIER</span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">RESERVE</span>
                    )}
                  </div>
                  {played ? (
                    <>
                      <div className="mt-1 flex items-baseline justify-between">
                        <div
                          className={`font-display text-2xl font-bold ${
                            m.winRate >= 60 ? "text-emerald-400" : m.winRate >= 50 ? "text-cs-orange" : "text-cs-red"
                          }`}
                        >
                          {m.winRate.toFixed(1)}%
                        </div>
                        <div className="font-mono text-[10px] uppercase text-slate-300">
                          {m.rounds.toLocaleString()} rds
                        </div>
                      </div>
                      <div className="mt-2 h-1 w-full bg-black/60">
                        <div
                          className={`h-full ${
                            m.winRate >= 60 ? "bg-emerald-400" : m.winRate >= 50 ? "bg-cs-orange" : "bg-cs-red"
                          }`}
                          style={{ width: `${Math.min(m.winRate, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                      Not played
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
        active ? "bg-cs-orange text-cs-bg" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="border border-cs-border bg-cs-panel p-6 clip-corner lg:col-span-1">
      <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// NO DATA</div>
      <div className="mt-2 font-display text-xl font-bold text-white">
        No {filter === "premier" ? "Active Duty" : "competitive"} matches yet
      </div>
      <div className="mt-2 text-sm text-slate-400">
        Play a few games on the current map pool to see your performance here.
      </div>
    </div>
  );
}
