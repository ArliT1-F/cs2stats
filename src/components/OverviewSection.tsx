import type { Stats } from "../lib/demoData";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

export function OverviewSection({ stats }: { stats: Stats }) {
  const o = stats.overview;
  const cards = [
    { label: "Total Kills", value: o.kills.toLocaleString(), accent: "text-cs-orange" },
    { label: "Total Deaths", value: o.deaths.toLocaleString() },
    { label: "Rounds Won", value: o.wins.toLocaleString() },
    { label: "Hours Played", value: o.hoursPlayed.toLocaleString(), accent: "text-cs-blue" },
    { label: "MVPs", value: o.mvps.toLocaleString(), accent: "text-cs-orange" },
    { label: "Win Rate", value: `${o.winRate.toFixed(1)}%` },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">
          // KEY RATIOS
        </div>
        <RadialDial label="Accuracy" value={o.accuracy} max={50} color="#4fb3ff" hint="Hits ÷ shots fired" />
        <RadialDial label="Headshot %" value={o.headshotPct} max={100} color="#f59e0b" hint="% of kills that were HS" />
        <RadialDial label="Win Rate" value={o.winRate} max={100} color="#22c55e" hint="Rounds won ÷ played" />
      </div>

      <div className="relative flex flex-col justify-between border border-cs-border bg-gradient-to-br from-cs-orange/20 to-transparent p-4 clip-corner">
        <div className="absolute inset-0 tactical-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// K/D RATIO</div>
          <div className="mt-1 font-display text-6xl font-black text-white text-glow sm:text-7xl">{o.kd.toFixed(2)}</div>
          <div className="font-mono text-xs uppercase tracking-widest text-slate-500">Lifetime · all modes</div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-cs-border pt-3">
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

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {cards.map((c) => (
          <div key={c.label} className="border border-cs-border bg-cs-panel p-3 clip-corner sm:p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{c.label}</div>
            <div className={`mt-1 font-display text-lg font-bold sm:text-xl ${c.accent || "text-white"}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadialDial({
  label,
  value,
  max,
  color,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  hint: string;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const data = [{ name: label, value: clamped, fill: color }];

  return (
    <div className="mb-3 flex items-center gap-3 last:mb-0">
      <div className="relative h-[4.5rem] w-[4.5rem] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={90 - pct * 3.6}
          >
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar background={{ fill: "#1f2942" }} dataKey="value" cornerRadius={2} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-sm font-bold leading-none text-white">
            {label === "Accuracy" ? `${value.toFixed(1)}%` : `${value.toFixed(0)}%`}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm font-bold uppercase tracking-wide text-white">{label}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{hint}</div>
      </div>
    </div>
  );
}
