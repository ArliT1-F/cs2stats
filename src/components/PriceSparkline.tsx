// Tiny inline sparkline that shows the recent (90d → 24h) price trend for a
// single skin. Renders an SVG polyline + a percent-change badge. Designed to
// fit inside the SkinCard pricing area.

interface PriceHistory {
  points: number[];
  labels: string[];
  current: number;
  oldest: number;
  changePercent: number;
}

export function PriceSparkline({ history }: { history: PriceHistory | null }) {
  if (!history || history.points.length < 2) return null;
  const w = 64, h = 18;
  const min = Math.min(...history.points);
  const max = Math.max(...history.points);
  const range = max - min || 1;
  const stepX = w / (history.points.length - 1);
  const path = history.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(" ");
  const up = history.changePercent > 0;
  const stroke = up ? "#22c55e" : history.changePercent < 0 ? "#ef4444" : "#94a3b8";
  return (
    <div className="flex items-center gap-1.5" title={`${history.labels[0]} ago: $${history.oldest.toFixed(2)}\nNow: $${history.current.toFixed(2)}`}>
      <svg width={w} height={h} className="flex-shrink-0">
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className={`font-mono text-[9px] font-bold ${up ? "text-emerald-400" : history.changePercent < 0 ? "text-cs-red" : "text-slate-500"}`}>
        {up ? "▲" : history.changePercent < 0 ? "▼" : "—"}{Math.abs(history.changePercent).toFixed(1)}%
      </span>
    </div>
  );
}

export type { PriceHistory };