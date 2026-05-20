import { useMemo, useState } from "react";
import type { FaceitMatch } from "../lib/demoData";
import {
  SAMPLE_PARSED_DEMO,
  findDemoPlayer,
  type DemoKillEvent,
  type DemoPlayerState,
  type ParsedDemoMatch,
} from "../lib/parsedDemo";

export function DemosSection({ matches }: { matches: FaceitMatch[] | undefined }) {
  const parsedDemo = SAMPLE_PARSED_DEMO;
  const [selectedKillId, setSelectedKillId] = useState(parsedDemo.kills[0]?.id || "");
  const selectedKill = useMemo(
    () => parsedDemo.kills.find((event) => event.id === selectedKillId) || parsedDemo.kills[0],
    [parsedDemo.kills, selectedKillId]
  );
  const matchesWithDemos = (matches || []).filter(
    (match) => match.demoUrl || match.demoResourceUrl || match.demoUnavailableReason
  );

  if (!selectedKill) {
    return (
      <div className="border border-dashed border-cs-border bg-cs-panel/50 p-8 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">// NO PARSED DEMO DATA</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// 2D DEMO PARSER MVP</div>
              <h3 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white">
                Parsed Demo Replay
              </h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                This is the browser viewer we need for csstats.gg-style analysis. The map uses
                parsed demo events: player positions, facing direction, names, teams, weapons,
                kill timing, and special kill flags. Real matches will populate this same schema
                once the external parser worker is connected.
              </p>
            </div>
            <div className="border border-cs-blue/30 bg-cs-blue/10 px-3 py-2 text-right clip-corner">
              <div className="font-mono text-[10px] uppercase tracking-widest text-cs-blue">Sample data</div>
              <div className="font-display text-lg font-black text-white">{parsedDemo.map.displayName}</div>
              <div className="font-mono text-xs text-slate-400">
                {parsedDemo.score.t} T - {parsedDemo.score.ct} CT
              </div>
            </div>
          </div>
        </div>

        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// DATA PIPELINE</div>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2"><span className="font-mono text-cs-orange/70">1.</span><span>Fetch or upload a .dem file.</span></li>
            <li className="flex gap-2"><span className="font-mono text-cs-orange/70">2.</span><span>Parse it in a background worker.</span></li>
            <li className="flex gap-2"><span className="font-mono text-cs-orange/70">3.</span><span>Store normalized events.</span></li>
            <li className="flex gap-2"><span className="font-mono text-cs-orange/70">4.</span><span>Render them here as a 2D replay.</span></li>
          </ol>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-lg font-bold uppercase tracking-wide text-white">
                Round {selectedKill.round} kill at {formatClock(selectedKill.timeSeconds)}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                tick {selectedKill.tick} / {parsedDemo.tickRate} tick
              </div>
            </div>
            <KillBadges event={selectedKill} />
          </div>
          <DemoMap match={parsedDemo} event={selectedKill} />
        </div>

        <div className="space-y-5">
          <KillFeed
            match={parsedDemo}
            selectedKillId={selectedKill.id}
            onSelect={setSelectedKillId}
          />
          <EventDetails match={parsedDemo} event={selectedKill} />
        </div>
      </div>

      <AvailableDemos matches={matchesWithDemos} />

      <div className="border border-cs-orange/30 bg-cs-orange/5 p-4 clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// WHAT IS STILL EXTERNAL</div>
        <p className="mt-2 text-sm text-slate-300">
          Browser rendering is in place, but real Valve/FACEIT demo ingestion needs a long-running
          worker outside Vercel. See <span className="font-mono text-cs-blue">docs/demo-parsing.md</span>
          for the auth-code, Steam bot, storage, queue, and parser steps.
        </p>
      </div>
    </div>
  );
}

function DemoMap({ match, event }: { match: ParsedDemoMatch; event: DemoKillEvent }) {
  const attacker = findDemoPlayer(match, event.attackerSteamId);
  const victim = findDemoPlayer(match, event.victimSteamId);

  return (
    <div className="relative aspect-square overflow-hidden border border-cs-border bg-[#101722] clip-corner">
      <MapBackdrop name={match.map.displayName} />
      <KillTrace attacker={event.attacker} victim={event.victim} />
      {event.snapshot.map((state) => {
        const player = findDemoPlayer(match, state.steamId);
        if (!player) return null;
        return <PlayerMarker key={state.steamId} playerName={player.name} team={player.team} color={player.color} state={state} />;
      })}
      <MapLabel x={48} y={50} label="MID" />
      <MapLabel x={76} y={50} label="A" />
      <MapLabel x={67} y={78} label="B" />
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2 bg-cs-bg/80 px-3 py-2 text-xs backdrop-blur clip-corner">
        <span className="font-mono uppercase tracking-widest text-slate-500">Kill vector</span>
        <span className="font-display font-bold text-cs-orange">{attacker?.name || "Attacker"}</span>
        <span className="text-slate-500">with</span>
        <span className="font-mono text-white">{event.weapon}</span>
        <span className="text-slate-500">on</span>
        <span className="font-display font-bold text-cs-blue">{victim?.name || "Victim"}</span>
      </div>
    </div>
  );
}

function MapBackdrop({ name }: { name: string }) {
  return (
    <>
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage:
          "linear-gradient(rgba(79,179,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(79,179,255,0.10) 1px, transparent 1px)",
        backgroundSize: "8.333% 8.333%",
      }} />
      <div className="absolute left-[12%] top-[62%] h-[28%] w-[26%] border border-cs-orange/30 bg-cs-orange/5" />
      <div className="absolute left-[57%] top-[25%] h-[35%] w-[28%] border border-cs-blue/30 bg-cs-blue/5" />
      <div className="absolute left-[42%] top-[39%] h-[12%] w-[26%] rotate-[-18deg] border border-slate-500/20 bg-slate-500/10" />
      <div className="absolute right-4 top-4 font-display text-4xl font-black uppercase tracking-tighter text-white/5">
        {name}
      </div>
    </>
  );
}

function PlayerMarker({
  playerName,
  team,
  color,
  state,
}: {
  playerName: string;
  team: "T" | "CT";
  color: string;
  state: DemoPlayerState;
}) {
  return (
    <div
      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition ${
        state.alive ? "opacity-100" : "opacity-35 grayscale"
      }`}
      style={{ left: `${state.x}%`, top: `${state.y}%` }}
      title={`${playerName} - ${state.weapon} - ${state.hp} HP`}
    >
      <div
        className="absolute left-1/2 top-1/2 h-7 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded-full"
        style={{ backgroundColor: color, transform: `translate(-50%, -100%) rotate(${state.yawDeg}deg)` }}
      />
      <div
        className={`relative flex h-7 w-7 items-center justify-center rounded-full border-2 bg-cs-bg font-display text-[10px] font-black ${
          team === "T" ? "border-cs-orange text-cs-orange" : "border-cs-blue text-cs-blue"
        }`}
        style={{ boxShadow: `0 0 18px ${color}55` }}
      >
        {team}
      </div>
      <div className="absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap bg-cs-bg/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-200">
        {playerName}
      </div>
    </div>
  );
}

function KillTrace({ attacker, victim }: { attacker: DemoPlayerState; victim: DemoPlayerState }) {
  const dx = victim.x - attacker.x;
  const dy = victim.y - attacker.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      className="absolute z-10 h-0.5 origin-left bg-cs-red shadow-[0_0_14px_rgba(239,68,68,0.7)]"
      style={{
        left: `${attacker.x}%`,
        top: `${attacker.y}%`,
        width: `${length}%`,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );
}

function MapLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 font-display text-xs font-black uppercase tracking-widest text-white/15"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {label}
    </div>
  );
}

function KillFeed({
  match,
  selectedKillId,
  onSelect,
}: {
  match: ParsedDemoMatch;
  selectedKillId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">// KILL FEED</div>
      <div className="space-y-2">
        {match.kills.map((event) => {
          const attacker = findDemoPlayer(match, event.attackerSteamId);
          const victim = findDemoPlayer(match, event.victimSteamId);
          const selected = event.id === selectedKillId;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelect(event.id)}
              className={`w-full border px-3 py-2 text-left transition clip-corner ${
                selected
                  ? "border-cs-orange bg-cs-orange/10"
                  : "border-cs-border bg-cs-bg hover:border-cs-blue/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  R{event.round} {formatClock(event.timeSeconds)}
                </div>
                <div className="font-mono text-[10px] text-slate-500">tick {event.tick}</div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-display font-bold text-cs-orange">{attacker?.name || "Attacker"}</span>
                <span className="font-mono text-xs text-white">{event.weapon}</span>
                <span className="text-slate-500">killed</span>
                <span className="font-display font-bold text-cs-blue">{victim?.name || "Victim"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventDetails({ match, event }: { match: ParsedDemoMatch; event: DemoKillEvent }) {
  const attacker = findDemoPlayer(match, event.attackerSteamId);
  const victim = findDemoPlayer(match, event.victimSteamId);
  const assister = event.assisterSteamId ? findDemoPlayer(match, event.assisterSteamId) : null;

  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">// EVENT DETAILS</div>
      <div className="grid gap-3 text-sm">
        <DetailRow label="Attacker" value={`${attacker?.name || "Unknown"} (${event.attacker.hp} HP, ${event.attacker.weapon})`} />
        <DetailRow label="Victim" value={`${victim?.name || "Unknown"} (${event.victim.weapon})`} />
        <DetailRow label="Assist" value={assister?.name || "None"} />
        <DetailRow label="Attacker position" value={`${event.attacker.x.toFixed(1)}, ${event.attacker.y.toFixed(1)} / yaw ${event.attacker.yawDeg}deg`} />
        <DetailRow label="Victim position" value={`${event.victim.x.toFixed(1)}, ${event.victim.y.toFixed(1)} / yaw ${event.victim.yawDeg}deg`} />
      </div>
      <div className="mt-4">
        <KillBadges event={event} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-cs-border/50 pb-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-right text-slate-200">{value}</span>
    </div>
  );
}

function KillBadges({ event }: { event: DemoKillEvent }) {
  const badges = [
    event.headshot ? "HS" : null,
    event.throughSmoke ? "Smoke" : null,
    event.wallbang ? "Wallbang" : null,
    event.blind ? "Blind" : null,
  ].filter(Boolean);

  if (badges.length === 0) {
    return <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Clean kill</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span key={badge} className="border border-cs-orange/40 bg-cs-orange/10 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-cs-orange">
          {badge}
        </span>
      ))}
    </div>
  );
}

function AvailableDemos({ matches }: { matches: FaceitMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="border border-dashed border-cs-border bg-cs-panel/50 p-6 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">// NO FACEIT DEMOS AVAILABLE YET</div>
        <p className="mt-2 text-sm text-slate-400">
          FACEIT keeps demo downloads for a limited time. Real parsed replays will appear here
          after the parser worker stores processed match events.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
          // RAW FACEIT DEMOS ({matches.length})
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((match) => (
          <DemoDownloadCard key={match.matchId} match={match} />
        ))}
      </div>
    </div>
  );
}

function DemoDownloadCard({ match }: { match: FaceitMatch }) {
  return (
    <div className={`border bg-cs-bg p-4 clip-corner ${match.won ? "border-emerald-500/30" : "border-cs-red/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold uppercase tracking-tight text-white">{match.map}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{match.competition}</div>
        </div>
        <div className={`flex h-8 w-8 items-center justify-center font-display text-sm font-black ${
          match.won ? "bg-emerald-500/20 text-emerald-400" : "bg-cs-red/20 text-cs-red"
        }`}>
          {match.won ? "W" : "L"}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="font-mono text-slate-400">{match.score}</div>
        {match.kills !== null && (
          <div className="font-mono text-xs text-slate-500">
            <span className="text-cs-orange">{match.kills}</span>/
            <span className="text-cs-red">{match.deaths}</span>/
            <span className="text-cs-blue">{match.assists}</span>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {match.demoUrl ? (
          <a
            href={match.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-cs-orange px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110"
          >
            Download .dem
          </a>
        ) : match.demoUnavailableReason ? (
          <div className="border border-cs-orange/30 bg-cs-orange/10 px-3 py-2 text-xs text-slate-300">
            <div className="font-display font-bold uppercase tracking-wider text-cs-orange">
              Signed download required
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              FACEIT returned a private resource URL. The worker needs FACEIT Downloads API
              access to turn it into a temporary signed URL.
            </p>
          </div>
        ) : null}
        {match.demoResourceUrl && !match.demoUrl && (
          <div className="break-all border border-cs-border bg-cs-panel/60 px-2 py-1.5 font-mono text-[10px] text-slate-500">
            resource: {match.demoResourceUrl}
          </div>
        )}
        <a
          href={match.matchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-cs-border px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-cs-blue hover:text-cs-blue"
        >
          View FACEIT room
        </a>
      </div>
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
