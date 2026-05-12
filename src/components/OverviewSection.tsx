import type { Stats } from "../lib/demoData";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function OverviewSection({ stats }: { stats: Stats }) {
  const o = stats.overview;
  const cards = [
    { label: "Total Kills", value: o.kills.toLocaleString(), accent: "text-cs-orange" },
    { label: "Total Deaths", value: o.deaths.toLocaleString() },
    { label: "Rounds Won", value: o.wins.toLocaleString() },
    { label: "Rounds Played", value: o.rounds.toLocaleString() },
    { label: "MVPs", value: o.mvps.toLocaleString(), accent: "text-cs-orange" },
    { label: "Bombs Planted", value: o.bombsPlanted.toLocaleString() },
    { label: "Bombs Defused", value: o.bombsDefused.toLocaleString() },
    { label: "Money Earned", value: `$${(o.moneyEarned / 1_000_000).toFixed(1)}M` },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Radial dial section */}
      <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">// PRECISION</div>
        <RadialDial label="Accuracy" value={o.accuracy} max={50} color="#4fb3ff" />
        <RadialDial label="Headshot %" value={o.headshotPct} max={100} color="#f59e0b" />
        <RadialDial label="Win Rate" value={o.winRate} max={100} color="#22c55e" />
      </div>

      {/* K/D card */}
      <div className="relative flex flex-col justify-between border border-cs-border bg-gradient-to-br from-cs-orange/20 to-transparent p-5 clip-corner">
        <div className="absolute inset-0 tactical-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// KILL/DEATH</div>
          <div className="mt-2 font-display text-7xl font-black text-white text-glow">{o.kd.toFixed(2)}</div>
          <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Lifetime ratio</div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-cs-border pt-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Kills</div>
            <div className="font-display text-2xl font-bold text-cs-orange">{o.kills.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Deaths</div>
            <div className="font-display text-2xl font-bold text-cs-red">{o.deaths.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="border border-cs-border bg-cs-panel p-4 clip-corner">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{c.label}</div>
            <div className={`mt-1 font-display text-xl font-bold ${c.accent || "text-white"}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadialDial({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const data = [{ name: label, value: Math.min(value, max), fill: color }];
  const pct = (value / max) * 100;
  return (
    <div className="mb-2 flex items-center gap-4">
      <div className="relative h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={90 - (pct * 3.6)}>
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar background={{ fill: "#1f2942" }} dataKey="value" cornerRadius={2} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-white">
          {value.toFixed(1)}%
        </div>
      </div>
      <div>
        <div className="font-display text-base font-bold uppercase tracking-wide text-white">{label}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">of {max}% scale</div>
      </div>
    </div>
  );
}
