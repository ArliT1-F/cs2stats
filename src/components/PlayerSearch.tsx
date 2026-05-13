import { useState, useRef, useEffect } from "react";

interface SearchResult {
  type: "steam" | "faceit";
  steamId: string | null;
  faceitId?: string;
  personaName: string;
  avatar: string | null;
  country: string | null;
  faceitLevel?: number | null;
  faceitElo?: number | null;
}

// Compact header search bar. Accepts SteamID, vanity URL, or FACEIT nickname.
// Results redirect to /u/{steamid} (the public profile route).

export function PlayerSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        if (r.ok) {
          const j = await r.json();
          setResults(j.results || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close on click-outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const goToProfile = (steamId: string) => {
    window.location.href = `/u/${steamId}`;
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs sm:max-w-sm">
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search SteamID, vanity, or FACEIT name…"
          className="w-full border border-cs-border bg-cs-panel px-3 py-1.5 pl-8 font-mono text-xs text-white placeholder:text-slate-600 focus:border-cs-orange focus:outline-none"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin border border-cs-orange border-t-transparent rounded-full" />
        )}
      </div>

      {open && results && (
        <div className="absolute right-0 top-full z-50 mt-1 w-full min-w-[280px] border border-cs-border bg-cs-panel shadow-2xl">
          {results.length === 0 && !loading && (
            <div className="p-3 text-center font-mono text-[11px] text-slate-500">
              No results for "{q}"
            </div>
          )}
          {results.map((r, i) => {
            const target = r.steamId;
            return (
              <button
                key={`${r.type}-${r.steamId || r.faceitId || i}`}
                onClick={() => target && goToProfile(target)}
                disabled={!target}
                className="flex w-full items-center gap-3 border-b border-cs-border/50 p-2 text-left transition hover:bg-cs-bg disabled:opacity-50"
              >
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="h-8 w-8 flex-shrink-0 border border-cs-border object-cover" />
                ) : (
                  <div className="h-8 w-8 flex-shrink-0 border border-cs-border bg-cs-bg" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold text-white">{r.personaName}</div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {r.type === "steam" ? "STEAM" : "FACEIT"}
                    {r.country && ` · ${r.country.toUpperCase()}`}
                    {r.faceitLevel && ` · LVL ${r.faceitLevel}`}
                    {r.faceitElo && ` · ${r.faceitElo} ELO`}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-cs-orange">→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}