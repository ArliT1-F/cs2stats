import { useState, useEffect, useMemo } from "react";
import { generateDemoFriends, type FriendEntry } from "../lib/demoData";

type Source = "steam" | "faceit";

interface FriendsSearchProps {
  isDemo?: boolean;
  compact?: boolean;
}

export function FriendsSearch({ isDemo = false, compact = false }: FriendsSearchProps) {
  const [source, setSource] = useState<Source>("steam");
  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      if (isDemo) {
        const demo = generateDemoFriends(source);
        if (!cancelled) {
          setFriends(demo);
          setTotal(demo.length);
          setTruncated(false);
          setLoading(false);
        }
        return;
      }

      try {
        const r = await fetch(`/api/friends?source=${source}`, { credentials: "include" });
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setFriends([]);
          setTotal(0);
          setError(j.message || j.error || "Failed to load friends");
          return;
        }
        setFriends(j.friends || []);
        setTotal(j.total ?? j.friends?.length ?? 0);
        setTruncated(!!j.truncated);
      } catch {
        if (!cancelled) {
          setFriends([]);
          setError("Network error loading friends");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [source, isDemo]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter((f) => f.personaName.toLowerCase().includes(needle));
  }, [friends, q]);

  const goToProfile = (steamId: string) => {
    window.location.href = `/u/${steamId}`;
  };

  return (
    <div className="border border-cs-border bg-cs-panel">
      <div className={`flex flex-col border-b border-cs-border sm:flex-row sm:items-center sm:justify-between ${compact ? "gap-2 px-3 py-2" : "gap-3 p-4"}`}>
        {!compact && (
          <div>
            <div className="font-display text-lg font-bold uppercase tracking-wider text-white">Friends</div>
            <div className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
              Search your {source === "steam" ? "Steam" : "FACEIT"} friends and view their stats
            </div>
          </div>
        )}
        <SourceTabs source={source} onChange={setSource} compact={compact} />
      </div>

      <div className={`border-b border-cs-border ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Filter ${total || "…"} friends by name…`}
            className="w-full border border-cs-border bg-cs-bg px-3 py-2 pl-8 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cs-orange focus:outline-none"
          />
        </div>
        {!loading && !error && (
          <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            {filtered.length} of {total} friends
            {truncated && " · showing first 80 on FACEIT"}
          </div>
        )}
      </div>

      <FriendsList
        loading={loading}
        error={error}
        friends={filtered}
        query={q}
        source={source}
        onSelect={goToProfile}
        compact={compact}
      />
    </div>
  );
}

function SourceTabs({ source, onChange, compact }: { source: Source; onChange: (s: Source) => void; compact?: boolean }) {
  return (
    <div className="flex border border-cs-border">
      {(["steam", "faceit"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`${compact ? "px-3 py-1" : "px-4 py-2"} font-display text-xs font-bold uppercase tracking-wider transition ${
            source === s
              ? s === "steam"
                ? "bg-cs-blue text-cs-bg"
                : "bg-cs-orange text-cs-bg"
              : "bg-cs-bg text-slate-400 hover:text-white"
          }`}
        >
          {s === "steam" ? "Steam" : "FACEIT"}
        </button>
      ))}
    </div>
  );
}

function FriendsList({
  loading,
  error,
  friends,
  query,
  source,
  onSelect,
  compact,
}: {
  loading: boolean;
  error: string | null;
  friends: FriendEntry[];
  query: string;
  source: Source;
  onSelect: (steamId: string) => void;
  compact?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-10">
        <div className="h-6 w-6 animate-spin border-2 border-cs-orange border-t-transparent" />
        <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
          Loading {source} friends…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="font-display text-sm font-bold uppercase tracking-wider text-cs-red">
          Could not load friends
        </div>
        <p className="mt-2 text-sm text-slate-400">{error}</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-8 text-center font-mono text-sm text-slate-500">
        {query ? `No friends matching "${query}"` : "No friends found"}
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto ${compact ? "max-h-[240px]" : "max-h-[420px]"}`}>
      {friends.map((f) => {
        const canView = !!f.steamId;
        return (
          <button
            key={`${source}-${f.steamId || f.faceitId}`}
            type="button"
            onClick={() => f.steamId && onSelect(f.steamId)}
            disabled={!canView}
            className="flex w-full items-center gap-3 border-b border-cs-border/50 p-3 text-left transition hover:bg-cs-bg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {f.avatar ? (
              <img src={f.avatar} alt="" className="h-10 w-10 flex-shrink-0 border border-cs-border object-cover" />
            ) : (
              <div className="h-10 w-10 flex-shrink-0 border border-cs-border bg-cs-bg" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-display text-base font-bold text-white">{f.personaName}</span>
                {f.online && (
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" title="Online" />
                )}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                {source === "steam" ? "STEAM" : "FACEIT"}
                {f.country && ` · ${f.country.toUpperCase()}`}
                {f.faceitLevel != null && ` · LVL ${f.faceitLevel}`}
                {f.faceitElo != null && ` · ${f.faceitElo} ELO`}
                {!canView && " · No linked Steam ID"}
              </div>
            </div>
            {canView ? (
              <span className="font-mono text-[10px] text-cs-orange">VIEW STATS →</span>
            ) : (
              <span className="font-mono text-[10px] text-slate-600">N/A</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
