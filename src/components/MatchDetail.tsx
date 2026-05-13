import type { FaceitMatch, FaceitMatchPlayer, FaceitMatchTeam } from "../lib/demoData";
import { getMapBanner, faceitLevelColor } from "../lib/mapPool";

// CS2-style detailed match view with map banner header, two team scoreboards,
// and per-player kills/deaths/assists/ADR/HS%. Modeled after FACEIT's match room.

export function MatchDetail({ match, onClose }: { match: FaceitMatch; onClose?: () => void }) {
  const banner = getMapBanner(match.map);
  const [teamA, teamB] = match.teams.length >= 2 ? match.teams : [match.teams[0], match.teams[0]];

  return (
    <div className="overflow-hidden border border-cs-border bg-cs-bg clip-corner">
      {/* MAP BANNER WITH SCOREBOARD HEADER */}
      <div className="relative h-56 sm:h-64 md:h-72 w-full overflow-hidden">
        <img
          src={banner}
          alt={`${match.map} map banner`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        {/* Dark overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-cs-bg/30 via-cs-bg/60 to-cs-bg" />
        <div className="absolute inset-0 bg-gradient-to-r from-cs-bg/70 via-transparent to-cs-bg/70" />

        {/* Map name + competition (top) */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cs-orange">// {match.competition}</div>
            <div className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-white text-glow sm:text-4xl">
              {match.map}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="border border-white/20 bg-cs-bg/60 px-3 py-1 font-mono text-xs uppercase tracking-widest text-slate-300 backdrop-blur transition hover:border-cs-orange hover:text-cs-orange"
            >
              ✕ Close
            </button>
          )}
        </div>

        {/* Teams + score (center) */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
            <TeamHeader team={teamA} align="right" />
            <ScoreDisplay teamA={teamA} teamB={teamB} />
            <TeamHeader team={teamB} align="left" />
          </div>
        </div>

        {/* Half-time scores strip (bottom) */}
        {(teamA.firstHalfScore !== null || teamA.overtimeScore !== null) && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-cs-bg/70 px-4 py-1.5 backdrop-blur">
            <HalfTimeStrip teamA={teamA} teamB={teamB} />
          </div>
        )}
      </div>

      {/* ROUND-BY-ROUND TIMELINE */}
      {match.roundResultsRaw && (
        <RoundTimeline
          rawRounds={match.roundResultsRaw}
          teamA={teamA}
          teamB={teamB}
        />
      )}

      {/* "Stats unavailable" notice for older matches */}
      {match.statsAvailable === false && (
        <div className="mx-3 mt-3 border border-slate-600/40 bg-slate-700/10 p-3 text-sm text-slate-400 sm:mx-5">
          <div className="font-display font-bold uppercase tracking-wider text-slate-300">
            Detailed stats no longer available
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500">
            // FACEIT prunes per-match stats after ~6 months. Roster &amp; scores still shown above.
          </div>
        </div>
      )}

      {/* SCOREBOARDS */}
      <div className="grid gap-1 p-3 sm:p-5 md:grid-cols-2">
        <TeamScoreboard team={teamA} />
        <TeamScoreboard team={teamB} />
      </div>

      {/* FOOTER: links */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cs-border bg-cs-panel/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          MATCH ID: {match.matchId}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {match.demoUrl && (
            <a
              href={match.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-cs-blue/60 bg-cs-blue/10 px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-blue transition hover:bg-cs-blue/20"
            >
              ↓ Demo (.dem)
            </a>
          )}
          <a
            href={match.matchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-cs-orange px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110"
          >
            FACEIT Match Room ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function TeamHeader({ team, align }: { team: FaceitMatchTeam; align: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
      {team.avatar ? (
        <img
          src={team.avatar}
          alt={`${team.name} logo`}
          className={`h-12 w-12 sm:h-16 sm:w-16 border-2 ${team.won ? "border-emerald-400" : "border-cs-red/70"} object-cover bg-cs-bg`}
        />
      ) : (
        <div className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center border-2 ${team.won ? "border-emerald-400 text-emerald-400" : "border-cs-red/70 text-cs-red"} font-display text-2xl font-black bg-cs-bg`}>
          {team.name?.charAt(0) || "?"}
        </div>
      )}
      <div className="min-w-0">
        <div className={`font-mono text-[10px] uppercase tracking-widest ${team.won ? "text-emerald-400" : "text-cs-red"}`}>
          {team.won ? "VICTORY" : team.won === false ? "DEFEAT" : "—"}
        </div>
        <div className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-white truncate max-w-[150px] sm:max-w-[220px]">
          {team.name}
        </div>
      </div>
    </div>
  );
}

function ScoreDisplay({ teamA, teamB }: { teamA: FaceitMatchTeam; teamB: FaceitMatchTeam }) {
  return (
    <div className="flex items-center gap-2 border border-white/10 bg-cs-bg/70 px-4 py-2 backdrop-blur">
      <div className={`font-display text-4xl sm:text-5xl font-black ${teamA.won ? "text-emerald-400" : "text-slate-300"}`}>
        {teamA.score ?? "—"}
      </div>
      <div className="font-display text-2xl text-slate-600">:</div>
      <div className={`font-display text-4xl sm:text-5xl font-black ${teamB.won ? "text-emerald-400" : "text-slate-300"}`}>
        {teamB.score ?? "—"}
      </div>
    </div>
  );
}

// Round-by-round timeline. FACEIT exposes results as a comma-separated string
// (e.g. "1,1,0,1,0,1,0,0,1,1,1,1") where 1 = team1 wins, 0 = team2 wins.
// We render one square per round, color-coded by which team won.
function RoundTimeline({
  rawRounds,
  teamA,
  teamB,
}: {
  rawRounds: string;
  teamA: FaceitMatchTeam;
  teamB: FaceitMatchTeam;
}) {
  const rounds = rawRounds.split(/[,\s]+/).filter((r) => r === "0" || r === "1");
  if (rounds.length === 0) return null;

  // CS2 standard: rounds 1-12 are first half (team1 = CT typically), rounds 13-24 second half (sides swap).
  // We just visualize who won each round with team's accent color.
  const aColor = teamA.won ? "bg-emerald-500" : "bg-cs-red";
  const bColor = teamB.won ? "bg-emerald-500" : "bg-cs-red";
  const aColorMuted = teamA.won ? "bg-emerald-500/40" : "bg-cs-red/40";
  const bColorMuted = teamB.won ? "bg-emerald-500/40" : "bg-cs-red/40";

  return (
    <div className="border-y border-cs-border bg-cs-bg/40 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-500">
        <span>// ROUND TIMELINE ({rounds.length} rounds)</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-3 ${aColor}`} />
            <span className="truncate text-slate-300 max-w-[100px]">{teamA.name}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`h-2 w-3 ${bColor}`} />
            <span className="truncate text-slate-300 max-w-[100px]">{teamB.name}</span>
          </span>
        </div>
      </div>
      <div className="flex gap-0.5 overflow-x-auto">
        {rounds.map((r, i) => {
          // Mark half-time visually with a slightly different style
          const isHalfTime = i === 11; // round 12 → 13 boundary
          const isOvertime = i >= 24;
          const won = r === "1";
          const winnerColor = won
            ? (isOvertime ? aColor + " ring-1 ring-cs-orange" : aColor)
            : (isOvertime ? bColor + " ring-1 ring-cs-orange" : bColor);
          // Use full color for the actual winner, muted for visual rhythm
          const baseClass = (i % 2 === 0 ? winnerColor : (won ? aColorMuted : bColorMuted));
          return (
            <div
              key={i}
              className={`relative h-6 w-3 flex-shrink-0 ${baseClass}`}
              title={`Round ${i + 1}: ${won ? teamA.name : teamB.name} won`}
            >
              {isHalfTime && (
                <span className="absolute -right-0.5 top-0 h-full w-px bg-cs-orange" title="Half-time" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-slate-600">
        <span>R1</span>
        <span>HALFTIME ↑</span>
        <span>R{rounds.length}</span>
      </div>
    </div>
  );
}

function HalfTimeStrip({ teamA, teamB }: { teamA: FaceitMatchTeam; teamB: FaceitMatchTeam }) {
  const cell = (label: string, a: number | null, b: number | null) =>
    a !== null && b !== null ? (
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{a}</span>
        <span className="text-slate-600">:</span>
        <span className="text-white">{b}</span>
      </div>
    ) : null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
      {cell("1st Half", teamA.firstHalfScore, teamB.firstHalfScore)}
      {cell("2nd Half", teamA.secondHalfScore, teamB.secondHalfScore)}
      {cell("OT", teamA.overtimeScore, teamB.overtimeScore)}
    </div>
  );
}

function TeamScoreboard({ team }: { team: FaceitMatchTeam }) {
  return (
    <div className={`overflow-hidden border ${team.won ? "border-emerald-500/30" : "border-cs-red/30"} bg-cs-panel`}>
      {/* Team strip */}
      <div className={`flex items-center justify-between gap-2 px-3 py-2 ${team.won ? "bg-emerald-500/10" : "bg-cs-red/10"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {team.avatar && (
            <img src={team.avatar} alt="" className="h-6 w-6 border border-white/10 object-cover" />
          )}
          <div className="font-display text-sm font-bold uppercase tracking-wide text-white truncate">
            {team.name}
          </div>
        </div>
        <div className={`font-display text-lg font-black ${team.won ? "text-emerald-400" : "text-cs-red"}`}>
          {team.score ?? "—"}
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[1fr_28px_28px_28px_36px_36px_30px] gap-1 border-b border-cs-border px-2 py-1.5 font-mono text-[9px] uppercase tracking-widest text-slate-500 sm:grid-cols-[1fr_36px_36px_36px_44px_44px_38px]">
        <div>Player</div>
        <div className="text-right">K</div>
        <div className="text-right">D</div>
        <div className="text-right">A</div>
        <div className="text-right">K/D</div>
        <div className="text-right">ADR</div>
        <div className="text-right">HS%</div>
      </div>

      {/* Players */}
      <div className="divide-y divide-cs-border/40">
        {team.players.map((p) => (
          <PlayerRow key={p.playerId} player={p} />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: FaceitMatchPlayer }) {
  const lvlColor = faceitLevelColor(player.skillLevel);
  return (
    <div
      className={`grid grid-cols-[1fr_28px_28px_28px_36px_36px_30px] items-center gap-1 px-2 py-2 sm:grid-cols-[1fr_36px_36px_36px_44px_44px_38px] ${
        player.isMe ? "bg-cs-orange/10" : "hover:bg-cs-bg/40"
      }`}
    >
      {/* Player cell */}
      <div className="flex items-center gap-2 min-w-0">
        {/* FACEIT level badge */}
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center border font-display text-[10px] font-black"
          style={{ borderColor: lvlColor, color: lvlColor }}
          title={`FACEIT Level ${player.skillLevel ?? "?"} · ${player.elo ?? "?"} ELO`}
        >
          {player.skillLevel ?? "?"}
        </div>
        {player.avatar && (
          <img
            src={player.avatar}
            alt=""
            className="hidden h-6 w-6 flex-shrink-0 border border-cs-border object-cover bg-cs-bg sm:block"
            loading="lazy"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate font-display text-xs font-bold ${player.isMe ? "text-cs-orange" : "text-white"}`}>
            {player.nickname}
            {player.isMe && <span className="ml-1 font-mono text-[9px] text-cs-orange">★</span>}
          </div>
          {player.elo !== null && player.elo !== undefined && (
            <div className="hidden font-mono text-[9px] text-slate-500 sm:block">
              {player.elo} ELO
            </div>
          )}
        </div>
      </div>

      <div className="text-right font-mono text-xs text-cs-orange">{player.kills ?? "—"}</div>
      <div className="text-right font-mono text-xs text-cs-red">{player.deaths ?? "—"}</div>
      <div className="text-right font-mono text-xs text-cs-blue">{player.assists ?? "—"}</div>
      <div className={`text-right font-mono text-xs ${(player.kdRatio || 0) >= 1.2 ? "text-emerald-400" : (player.kdRatio || 0) >= 0.9 ? "text-slate-300" : "text-slate-500"}`}>
        {player.kdRatio != null ? player.kdRatio.toFixed(2) : "—"}
      </div>
      <div className="text-right font-mono text-xs text-slate-300">{player.adr ?? "—"}</div>
      <div className="text-right font-mono text-xs text-slate-400">{player.headshotsPct != null ? `${player.headshotsPct}%` : "—"}</div>
    </div>
  );
}
