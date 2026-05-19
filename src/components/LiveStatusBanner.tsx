import { useEffect, useState } from "react";

// Polls /api/live every 30 seconds. When the user is currently in CS2,
// shows a pulsing "LIVE NOW" banner at the top of the dashboard with a
// soft animation. Doesn't render anything when offline / not in game.
//
// LIMITATION: Steam doesn't expose live in-match data (round, score, side).
// The banner can confirm "in-game" + show server IP + game time, but for
// real round-by-round data the user must install GSI (future feature).

interface LiveStatus {
  isLive?: boolean;
  personaState?: string;
  currentGame?: string | null;
  gameServerIp?: string | null;
  hasGSI?: boolean;
  error?: string;
}

export function LiveStatusBanner({ steamId, isDemo }: { steamId: string; isDemo: boolean }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    if (isDemo) {
      // Demo: fake "live" 50% of the time so users see the banner
      const fakeLive = Math.random() > 0.5;
      setStatus({
        isLive: fakeLive,
        personaState: "Online",
        currentGame: fakeLive ? "Counter-Strike 2" : null,
        gameServerIp: fakeLive ? "146.66.155.97:27015" : null,
        hasGSI: false,
      });
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch("/api/live", { credentials: "include" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setStatus(j);
      } catch {
        // Silent — live status is best-effort
      }
    };
    poll();
    const interval = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [steamId, isDemo]);

  if (!status?.isLive) return null;

  return (
    <div className="relative overflow-hidden border border-emerald-500/60 bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent clip-corner">
      {/* Animated pulse stripe */}
      <div className="absolute left-0 top-0 h-full w-1 bg-emerald-400">
        <div className="h-full w-full animate-pulse bg-emerald-300" />
      </div>
      <div className="relative flex items-center gap-4 p-4">
        <div className="relative flex h-3 w-3 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm font-bold uppercase tracking-widest text-emerald-300">
            ● LIVE NOW — Currently in {status.currentGame}
          </div>
          {status.gameServerIp && (
            <div className="mt-0.5 font-mono text-[11px] text-slate-300 truncate">
              Server: {status.gameServerIp}
            </div>
          )}
          {!status.hasGSI && (
            <div className="mt-1 font-mono text-[10px] text-slate-500">
              // Live round/score data requires Game State Integration (coming soon).
              For now, only "in-game" status is available via Steam's public API.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
