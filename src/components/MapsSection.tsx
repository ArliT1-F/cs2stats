import type { MapStat } from "../lib/demoData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const MAP_GRADIENTS: Record<string, string> = {
  MIRAGE: "from-yellow-700/40 to-orange-900/40",
  DUST2: "from-amber-700/40 to-yellow-900/40",
  INFERNO: "from-orange-700/40 to-red-900/40",
  NUKE: "from-slate-600/40 to-slate-900/40",
  OVERPASS: "from-emerald-700/40 to-teal-900/40",
  ANCIENT: "from-green-700/40 to-emerald-900/40",
  ANUBIS: "from-cyan-700/40 to-blue-900/40",
  VERTIGO: "from-zinc-600/40 to-slate-900/40",
  TRAIN: "from-stone-600/40 to-zinc-900/40",
  CACHE: "from-yellow-800/40 to-stone-900/40",
};

export function MapsSection({ maps }: { maps: MapStat[] }) {
  const sorted = [...maps].sort((a, b) => b.winRate - a.winRate);
  const best = sorted[0];

  const chartData = maps.slice(0, 8).map((m) => ({
    name: m.name,
    winRate: +m.winRate.toFixed(1),
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Best map highlight */}
      {best && (
        <div className={`relative overflow-hidden border border-cs-border bg-gradient-to-br ${MAP_GRADIENTS[best.name] || "from-cs-orange/20 to-transparent"} p-6 clip-corner lg:col-span-1`}>
          <div className="absolute inset-0 tactical-grid opacity-30" />
          <div className="relative">
            <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// BEST MAP</div>
            <div className="mt-2 font-display text-5xl font-black uppercase tracking-tight text-white text-glow">
              {best.name}
            </div>
            <div className="mt-4 flex items-end gap-2">
              <div className="font-display text-6xl font-black text-cs-orange">
                {best.winRate.toFixed(0)}<span className="text-3xl">%</span>
              </div>
              <div className="pb-2 font-mono text-xs uppercase text-slate-400">win rate</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-sm">
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-400">Wins</div>
                <div className="font-display text-lg font-bold text-white">{best.wins.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-400">Rounds</div>
                <div className="font-display text-lg font-bold text-white">{best.rounds.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win-rate chart */}
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner lg:col-span-2">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">// WIN-RATE PER MAP</div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#475569" tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 600 }} />
              <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
              <Tooltip
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
      </div>

      {/* All maps grid */}
      <div className="lg:col-span-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {sorted.map((m) => (
            <div
              key={m.name}
              className={`relative overflow-hidden border border-cs-border bg-gradient-to-br ${MAP_GRADIENTS[m.name] || "from-cs-panel to-cs-bg"} p-4 clip-corner`}
            >
              <div className="font-display text-lg font-bold uppercase tracking-tight text-white">{m.name}</div>
              <div className="mt-1 flex items-baseline justify-between">
                <div className="font-display text-2xl font-bold text-cs-orange">{m.winRate.toFixed(1)}%</div>
                <div className="font-mono text-[10px] uppercase text-slate-400">{m.rounds.toLocaleString()} rds</div>
              </div>
              <div className="mt-2 h-1 w-full bg-black/40">
                <div
                  className="h-full bg-cs-orange"
                  style={{ width: `${Math.min(m.winRate, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
