import { useState } from "react";
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

function ShareLink({ steamId }: { steamId: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    const url = `${window.location.origin}/u/${steamId}`;
    // iOS Safari can throw when *accessing* navigator.clipboard in restricted
    // contexts (private browsing, certain MDM profiles), not just when calling
    // writeText. Guard the whole access.
    try {
      const cb = navigator.clipboard;
      if (cb && typeof cb.writeText === "function") {
        cb.writeText(url).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          fallbackCopy(url);
        });
      } else {
        fallbackCopy(url);
      }
    } catch {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (text: string) => {
    // Old-school document.execCommand fallback for Safari restricted modes
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: just prompt
      window.prompt("Copy this link:", text);
    }
  };
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-cs-orange hover:underline"
      title="Copy shareable profile link"
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
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
