import type { Profile, Stats, FaceitData } from "../lib/demoData";

export function ProfileBanner({
  profile,
  faceit,
  stats,
}: {
  profile: Profile;
  faceit: FaceitData | null;
  stats: Stats;
}) {
  const lvl = faceit?.player?.games?.cs2?.skill_level;
  const elo = faceit?.player?.games?.cs2?.faceit_elo;

  return (
    <div className="relative overflow-hidden border border-cs-border bg-gradient-to-br from-cs-panel to-cs-bg p-5 clip-corner sm:p-7">
      <div className="absolute inset-0 tactical-grid opacity-40" />
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cs-orange/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative">
          <div className="absolute -inset-1 bg-cs-orange/40 blur-md" />
          <img
            src={profile.avatarfull}
            alt={`${profile.personaname} CS2 player avatar`}
            className="relative h-24 w-24 border-2 border-cs-orange object-cover sm:h-28 sm:w-28"
          />
        </div>

        <div className="flex-1">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// OPERATIVE</div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
            {profile.personaname}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-xs text-slate-500">
            <span>STEAM ID: {profile.steamid}</span>
            <a href={profile.profileurl} target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
              View Steam Profile ↗
            </a>
            <ShareLink steamId={profile.steamid} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickStat label="K/D Ratio" value={stats.overview.kd.toFixed(2)} accent />
            <QuickStat label="Headshot %" value={`${stats.overview.headshotPct.toFixed(1)}%`} />
            <QuickStat label="Accuracy" value={`${stats.overview.accuracy.toFixed(1)}%`} />
            <QuickStat label="Hours" value={stats.overview.hoursPlayed.toLocaleString()} />
          </div>
        </div>

        {lvl && (
          <div className="flex flex-col items-center gap-2 border-l border-cs-border pl-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Faceit</div>
            <FaceitBadge level={lvl} />
            <div className="font-display text-2xl font-bold text-white">{elo}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">ELO</div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border-l-2 border-cs-border pl-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`font-display text-xl font-bold ${accent ? "text-cs-orange" : "text-white"}`}>{value}</div>
    </div>
  );
}

function FaceitBadge({ level }: { level: number }) {
  const colors = ["#ffffff","#a3e635","#a3e635","#facc15","#facc15","#facc15","#fb923c","#fb923c","#ef4444","#ef4444","#dc2626"];
  const c = colors[level] || "#fff";
  return (
    <div
      className="flex h-10 w-10 items-center justify-center border-2 font-display text-lg font-black"
      style={{ borderColor: c, color: c }}
    >
      {level}
    </div>
  );
}

function ShareLink({ steamId }: { steamId: string }) {
  const shareUrl = `https://cs2stats.com/profile/${steamId}`;
  return (
    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
      Share ↗
    </a>
  );
}