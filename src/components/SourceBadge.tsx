// Visual badge that clearly labels which data source a section is using.
// "STEAM" = lifetime stats from Steam Web API (Premier + Casual + Deathmatch combined — Steam doesn't separate)
// "FACEIT" = competitive matchmaking stats from FACEIT Data API only
// These should NEVER be mixed in the same chart/table.

export function SourceBadge({ source }: { source: "steam" | "faceit" }) {
  if (source === "steam") {
    return (
      <span className="inline-flex items-center gap-1.5 border border-cs-blue/40 bg-cs-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cs-blue">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5 0 11.4l6.4 2.7c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3v.2c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4l-4.6-1.9C2.4 21 6.8 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0z" />
        </svg>
        STEAM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border border-cs-orange/40 bg-cs-orange/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cs-orange">
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M2 4l3 16h14l3-16H2zm10 13l-5-9h10l-5 9z" />
      </svg>
      FACEIT
    </span>
  );
}
