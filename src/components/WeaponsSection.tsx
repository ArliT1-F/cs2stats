import type { WeaponStat } from "../lib/demoData";
import type { Stats } from "../lib/demoData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { WeaponIcon } from "./WeaponIcon";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; kills: number; pctOfKills?: number } }[];
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="border border-cs-border bg-cs-panel px-3 py-2 font-mono text-xs">
      <div className="font-display text-sm font-bold text-cs-orange">{d.name}</div>
      <div className="mt-1 text-slate-300">{d.kills.toLocaleString()} kills</div>
      {d.pctOfKills != null && (
        <div className="text-slate-500">{d.pctOfKills}% of lifetime kills</div>
      )}
    </div>
  );
}

export function WeaponsSection({ weapons, overview }: { weapons: WeaponStat[]; overview?: Stats["overview"] }) {
  const totalKills = overview?.kills ?? weapons.reduce((s, w) => s + w.kills, 0);
  const top = weapons.slice(0, 10);
  const maxKills = Math.max(...top.map((w) => w.kills), 1);
  const top3 = weapons.slice(0, 3);

  const chartData = top.map((w) => ({
    name: w.name.length > 12 ? w.name.slice(0, 11) + "…" : w.name,
    fullName: w.name,
    kills: w.kills,
    pctOfKills: w.pctOfKills ?? (totalKills > 0 ? +((w.kills / totalKills) * 100).toFixed(1) : 0),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-2 lg:col-span-2">
        {top3.map((w, i) => (
          <div key={w.name} className="relative overflow-hidden border border-cs-border bg-cs-panel p-3 clip-corner sm:p-4">
            <div className="absolute right-2 top-2 font-display text-4xl font-black text-cs-orange/10 sm:text-5xl">
              #{i + 1}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-cs-bg/80 to-cs-panel/40 sm:h-20 sm:w-28"
                style={{ backgroundImage: "radial-gradient(circle at center, rgba(245,158,11,0.18) 0%, transparent 65%)" }}
              >
                <WeaponIcon name={w.name} internalKey={w.key} className="relative max-h-full max-w-full object-contain" size={96} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold uppercase tracking-tight text-white sm:text-xl">
                  {w.name}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {w.pctOfKills != null ? `${w.pctOfKills}% of all kills` : "Lifetime kills"}
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Kills</div>
                <div className="font-display text-base font-bold text-cs-orange sm:text-lg">{w.kills.toLocaleString()}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Shots</div>
                <div className="font-display text-base font-bold text-white sm:text-lg">
                  {w.noAccuracy ? "—" : w.shots.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase text-slate-500">Accuracy</div>
                <div className="font-display text-base font-bold text-cs-blue sm:text-lg">
                  {w.noAccuracy || !w.shots ? "N/A" : `${((w.hits / w.shots) * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-cs-border bg-cs-panel p-4 clip-corner lg:col-span-3">
        <div className="mb-1 font-mono text-xs uppercase tracking-widest text-slate-500">
          // TOP WEAPONS BY KILLS
        </div>
        <div className="mb-3 font-mono text-[10px] text-slate-600">
          Bar length = kills · % is share of your {totalKills.toLocaleString()} lifetime kills (Steam)
        </div>
        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 8, bottom: 0 }}>
              <XAxis type="number" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#475569"
                tick={{ fill: "#e2e8f0", fontSize: 10, fontWeight: 600 }}
                width={72}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(245,158,11,0.06)" }} />
              <Bar dataKey="kills" radius={[0, 2, 2, 0]} maxBarSize={22}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#f59e0b" : i < 3 ? "#fbbf24" : "#4fb3ff"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cs-border text-left font-mono text-[10px] uppercase tracking-widest text-slate-500">
                <th className="py-2">Weapon</th>
                <th className="py-2 text-right">Kills</th>
                <th className="py-2 text-right">% Total</th>
                <th className="py-2 text-right hidden sm:table-cell">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {top.map((w) => {
                const pct = w.pctOfKills ?? (totalKills > 0 ? (w.kills / totalKills) * 100 : 0);
                const acc = !w.noAccuracy && w.shots ? (w.hits / w.shots) * 100 : null;
                const barPct = (w.kills / maxKills) * 100;
                return (
                  <tr key={w.name} className="border-b border-cs-border/50 hover:bg-cs-bg/40">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-12 flex-shrink-0 items-center justify-center bg-cs-bg/60">
                          <WeaponIcon name={w.name} internalKey={w.key} className="max-h-full max-w-full object-contain" size={48} />
                        </div>
                        <span className="font-display text-sm font-bold text-white">{w.name}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-mono text-cs-orange">{w.kills.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-slate-400">{pct.toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono text-cs-blue hidden sm:table-cell">
                      {acc != null ? `${acc.toFixed(1)}%` : "—"}
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
