import { useMemo, useState } from "react";
import type { FaceitMatch } from "../lib/demoData";
import { SAMPLE_PARSED_DEMO } from "../lib/parseDemo";


export function DemosSection({ matches }: { matches: FaceitMatch[] | undefined }) {
  const parsedDemo = SAMPLE_PARSED_DEMO;
  const selectedKill = parsedDemo.kills[0];
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
              <div className="border border-cs-blue/30 bg-cs-blue/10 px-3 py-2 text-right clip-corner">
              <div className="font-mono text-[10px] uppercase tracking-widest text-cs-blue">Sample data</div>
              <div className="font-display text-lg font-black text-white">{parsedDemo.map.displayName}</div>
              <div className="font-mono text-xs text-slate-400">
                {parsedDemo.score.t} T - {parsedDemo.score.ct} CT
              </div>
            </div>
          </div>
        </div>
        </div>

        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// HOW TO WATCH</div>
          <ol className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="font-mono text-cs-orange/70">1.</span>
              <span>Download the <span className="font-mono text-cs-orange">.dem</span> file below</span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-cs-orange/70">2.</span>
              <span>Place it in <span className="font-mono text-xs text-cs-blue break-all">…/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/replays/</span></span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-cs-orange/70">3.</span>
              <span>Launch CS2 → Watch → Your Replays</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Demos list */}
      {matchesWithDemos.length > 0 ? (
        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
              // AVAILABLE DEMOS ({matchesWithDemos.length})
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {matchesWithDemos.map((m) => (
              <DemoCard key={m.matchId} match={m} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-cs-border bg-cs-panel/50 p-8 text-center clip-corner">
          <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
            // NO DEMOS AVAILABLE YET
          </div>
          <p className="mt-2 text-sm text-slate-400">
            FACEIT keeps demos for ~30 days. Play a recent FACEIT match and the demo
            will appear here automatically.
          </p>
          <p className="mt-1 font-mono text-[11px] text-slate-600">
            Steam matchmaking demos must be downloaded from the in-game Watch menu — they
            are not exposed via the Steam API.
          </p>
        </div>
      )}

      {/* Pro tip card */}
      <div className="border border-cs-blue/30 bg-cs-blue/5 p-4 clip-corner">
        <div className="flex gap-3">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-blue">// PRO TIP</div>
          <p className="text-sm text-slate-300">
            For browser-based demo viewing, check out{" "}
            <a
              href="https://csstats.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cs-blue underline-offset-2 hover:underline"
            >
              csstats.gg
            </a>{" "}
            or{" "}
            <a
              href="https://leetify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cs-blue underline-offset-2 hover:underline"
            >
              Leetify
            </a>{" "}
            — they parse demos server-side into 2D heatmaps and round timelines (still
            not MP4, but viewable in-browser).
          </p>
        </div>
      </div>
    </div>
  );
}

function DemoCard({ match }: { match: FaceitMatch }) {
  return (
    <div
      className={`border bg-cs-bg p-4 clip-corner ${
        match.won ? "border-emerald-500/30" : "border-cs-red/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold uppercase tracking-tight text-white">
            {match.map}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {match.competition}
          </div>
        </div>
        <div
          className={`flex h-8 w-8 items-center justify-center font-display text-sm font-black ${
            match.won
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-cs-red/20 text-cs-red"
          }`}
        >
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
        {match.demoUrl && (
          <a
            href={match.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-cs-orange px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download .dem
          </a>
        )}
        <a
          href={match.matchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-cs-border px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:border-cs-blue hover:text-cs-blue"
        >
          View in FACEIT room ↗
        </a>
      </div>
    </div>
  );
}
