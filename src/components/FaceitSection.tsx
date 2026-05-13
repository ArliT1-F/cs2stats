import type { FaceitData } from "../lib/demoData";

export function FaceitSection({ faceit }: { faceit: FaceitData | null }) {
  if (!faceit?.player) {
    return (
      <div className="border border-cs-border bg-cs-panel p-8 text-center clip-corner">
        <div className="font-display text-lg font-bold uppercase text-slate-400">No Faceit Profile Linked</div>
        <p className="mt-2 text-sm text-slate-500">
          We couldn't find a Faceit account associated with this Steam ID.
        </p>
        <a
          href="https://www.faceit.com/en/cs2"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg clip-corner"
        >
          Sign up for Faceit ↗
        </a>
      </div>
    );
  }

  const lvl = faceit.player.games?.cs2?.skill_level || 1;
  const elo = faceit.player.games?.cs2?.faceit_elo || 0;
  const region = faceit.player.games?.cs2?.region || "—";
  const lifetime = faceit.stats?.lifetime || {};

  const statEntries = Object.entries(lifetime).slice(0, 8);

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="relative overflow-hidden border border-cs-border bg-gradient-to-br from-orange-900/30 via-cs-panel to-cs-bg p-6 clip-corner">
        <div className="absolute inset-0 tactical-grid opacity-30" />
        <div className="relative">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// FACEIT RANK</div>
          <div className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white">
            {faceit.player.nickname}
          </div>
          <div className="mt-1 font-mono text-xs uppercase text-slate-500">
            Region: {region} · Country: {faceit.player.country?.toUpperCase()}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <BigBadge level={lvl} />
            <div>
              <div className="font-display text-5xl font-black text-cs-orange text-glow">{elo}</div>
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500">ELO POINTS</div>
            </div>
          </div>
          <div className="mt-4 font-mono text-xs uppercase tracking-widest text-slate-500">
            Skill Level {lvl} / 10
          </div>
          <div className="mt-2 h-2 w-full bg-cs-bg">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-cs-orange to-cs-red" style={{ width: `${lvl * 10}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        {statEntries.map(([k, v]) => (
          <div key={k} className="border border-cs-border bg-cs-panel p-4 clip-corner">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{k}</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BigBadge({ level }: { level: number }) {
  const colors = ["#ffffff","#a3e635","#a3e635","#facc15","#facc15","#facc15","#fb923c","#fb923c","#ef4444","#ef4444","#dc2626"];
  const c = colors[level] || "#fff";
  return (
    <div
      className="flex h-20 w-20 items-center justify-center border-4 font-display text-4xl font-black"
      style={{ borderColor: c, color: c }}
    >
      {level}
    </div>
  );
}
