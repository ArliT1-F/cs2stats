import type { WeaponStat } from "../lib/demoData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { WeaponIcon } from "./WeaponIcon";

export function WeaponsSection({ weapons }: { weapons: WeaponStat[] }) {
  const top = weapons.slice(0, 10);
  const maxKills = Math.max(...top.map((w) => w.kills), 1);
  const top3 = weapons.slice(0, 3);

  const chartData = top.map((w) => ({
    name: w.name,
    kills: w.kills,
    accuracy: w.shots ? +((w.hits / w.shots) * 100).toFixed(1) : 0,
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      {/* Top 3 weapons */}
      <div className="space-y-3 lg:col-span-2">
        {top3.map((w, i) => (
          <div key={w.name} className="relative overflow-hidden border border-cs-border bg-cs-panel p-4 clip-corner">
            <div className="absolute right-2 top-2 font-display text-5xl font-black text-cs-orange/10">
              #{i + 1}
            </div>
            <div className="flex items-center gap-4">
              {/* Weapon image */}
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center bg-cs-bg/60 p-1">
                <WeaponIcon name={w.name} className="max-h-full max-w-full object-contain" size={96} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange">
                  // {i === 0 ? "PRIMARY" : i === 1 ? "SECONDARY" : "TERTIARY"}
                </div>
                <div className="mt-0.5 font-display text-2xl font-bold uppercase tracking-tight text-white">
                  {w.name}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Kills</div>
                <div className="font-display text-lg font-bold text-cs-orange">{w.kills.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Shots</div>
                <div className="font-display text-lg font-bold text-white">{w.shots.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Accuracy</div>
                <div className="font-display text-lg font-bold text-cs-blue">
                  {w.shots ? ((w.hits / w.shots) * 100).toFixed(1) : "0"}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner lg:col-span-3">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">// TOP 10 KILLS BY WEAPON</div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 0 }}>
              <XAxis type="number" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#475569" tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 600 }} width={75} />
              <Tooltip
                contentStyle={{ background: "#11172a", border: "1px solid #1f2942", borderRadius: 0 }}
                labelStyle={{ color: "#f59e0b", fontWeight: 700 }}
                cursor={{ fill: "rgba(245,158,11,0.05)" }}
              />
              <Bar dataKey="kills" radius={[0, 2, 2, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f59e0b" : i < 3 ? "#fbbf24" : "#4fb3ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Full table with weapon icons */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cs-border text-left font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2">Weapon</th>
                <th className="py-2 text-right">Kills</th>
                <th className="py-2 text-right">Accuracy</th>
                <th className="py-2 hidden sm:table-cell">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {top.map((w) => {
                const acc = w.shots ? (w.hits / w.shots) * 100 : 0;
                const pct = (w.kills / maxKills) * 100;
                return (
                  <tr key={w.name} className="border-b border-cs-border/50 hover:bg-cs-bg/40">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-12 flex-shrink-0 items-center justify-center bg-cs-bg/60">
                          <WeaponIcon name={w.name} className="max-h-full max-w-full object-contain" size={48} />
                        </div>
                        <span className="font-display font-bold text-white">{w.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-cs-orange">{w.kills.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-cs-blue">{acc.toFixed(1)}%</td>
                    <td className="py-2 hidden sm:table-cell">
                      <div className="h-1.5 w-full bg-cs-bg">
                        <div className="h-full bg-cs-orange" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
