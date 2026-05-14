import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { InventoryResponse, SkinItem } from "../lib/skinsTypes";
import { useCurrency } from "../lib/currency";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CS2 Skin Inventory display.
//
// Architecture choice: this file uses a SHELL + INNER pattern to guarantee
// the Rules of Hooks are never violated. The shell only fetches data and
// decides between three states (loading / error / loaded). Each state renders
// a different stateless component. No hooks live in any conditional path,
// because each state is its own component instance.
//
// This avoids React error #310 ("Rendered more hooks than during the previous
// render") which previously bit us when hooks were placed mid-function below
// early returns.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LOADOUT_OVERRIDE_KEY = "cs2tracker:loadout_overrides";

function safeGetOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOADOUT_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function safeSetOverride(weapon: string, assetId: string | null) {
  try {
    const all = safeGetOverrides();
    if (assetId === null) delete all[weapon];
    else all[weapon] = assetId;
    localStorage.setItem(LOADOUT_OVERRIDE_KEY, JSON.stringify(all));
  } catch {}
}

const CATEGORY_ORDER = [
  "Knife", "Gloves", "Rifle", "Sniper", "Pistol", "SMG", "Heavy",
  "Agent", "Sticker", "Patch", "Charm", "Music Kit", "Graffiti",
  "Case", "Tool", "Collectible", "Other",
];
const CATEGORY_LABELS: Record<string, string> = {
  Knife: "Knives", Gloves: "Gloves", Rifle: "Rifles", Sniper: "Snipers",
  Pistol: "Pistols", SMG: "SMGs", Heavy: "Heavy", Agent: "Agents",
  Sticker: "Stickers", Patch: "Patches", Charm: "Charms",
  "Music Kit": "Music Kits", Graffiti: "Graffiti",
  Case: "Cases", Tool: "Tools / Keys", Collectible: "Collectibles",
  Other: "Other",
};

type PriceSource = "buff163" | "steam";

// ─────────────────────────────────────────────────────────────────────────
// SHELL — handles fetching and decides which sub-view to render.
// All hooks live here. No conditional hooks.
// ─────────────────────────────────────────────────────────────────────────
// Reshape: aggregates `items[]` from many single-page responses into the
// InventoryResponse shape that InventoryView expects.
const RARITY_RANK: Record<string, number> = {
  "Contraband": 8, "Covert": 7, "Classified": 6, "Restricted": 5,
  "Mil-Spec Grade": 4, "Industrial Grade": 3, "Consumer Grade": 2,
  "Extraordinary": 9, "★": 10,
};
function aggregateInto(items: SkinItem[], totalInventoryCount: number | null, partial: boolean, priceSource: string): InventoryResponse {
  const categories: Record<string, { items: SkinItem[]; totalValue: number; count: number }> = {};
  let totalEstimatedValue = 0;
  for (const it of items) {
    if (!categories[it.category]) categories[it.category] = { items: [], totalValue: 0, count: 0 };
    categories[it.category].items.push(it);
    categories[it.category].count++;
    if (it.price?.lowestPrice) {
      categories[it.category].totalValue += it.price.lowestPrice;
      totalEstimatedValue += it.price.lowestPrice;
    }
  }
  for (const cat of Object.keys(categories)) {
    categories[cat].items.sort((a, b) => {
      const pa = a.price?.lowestPrice || 0;
      const pb = b.price?.lowestPrice || 0;
      if (pb !== pa) return pb - pa;
      return (RARITY_RANK[b.rarity || ""] || 0) - (RARITY_RANK[a.rarity || ""] || 0);
    });
    categories[cat].totalValue = +categories[cat].totalValue.toFixed(2);
  }

  const bestPerWeapon: Record<string, SkinItem> = {};
  for (const it of items) {
    if (!["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(it.category)) continue;
    const score = (x: SkinItem) => (x.price?.lowestPrice || 0) + (RARITY_RANK[x.rarity || ""] || 0) * 0.5;
    if (!bestPerWeapon[it.weapon] || score(it) > score(bestPerWeapon[it.weapon])) {
      bestPerWeapon[it.weapon] = it;
    }
  }

  return {
    totalItems: items.length,
    totalInventoryCount,
    totalEstimatedValue: +totalEstimatedValue.toFixed(2),
    pricedCount: items.filter((i) => i.price).length,
    pricesIncluded: true,
    priceSource,
    currency: 1,
    partial,
    categories,
    bestPerWeapon,
  };
}

export function SkinsSection({ isDemo }: { isDemo: boolean }) {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);   // initial load (no data yet)
  const [loadingMore, setLoadingMore] = useState(false); // background pagination
  const [progress, setProgress] = useState<{ loaded: number; total: number | null }>({ loaded: 0, total: null });
  const [error, setError] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<PriceSource>("buff163");

  // Single shared abort controller so we can cancel pagination when source changes
  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(async (source: PriceSource) => {
    if (isDemo) {
      setData(generateDemoInventory());
      setLoading(false);
      setLoadingMore(false);
      setProgress({ loaded: 0, total: null });
      return;
    }
    // Cancel any in-flight pagination from a previous load
    abortRef.current.cancelled = true;
    const myToken = { cancelled: false };
    abortRef.current = myToken;

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setData(null);
    setProgress({ loaded: 0, total: null });

    const allItems: SkinItem[] = [];
    const seenAssetIds = new Set<string>();
    let cursor: string | null = null;
    let totalInv: number | null = null;
    let pagesFetched = 0;
    const MAX_PAGES = 30;

    try {
      do {
        const url = `/api/inventory?source=${source}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
        const r = await fetch(url, { credentials: "include" });
        if (myToken.cancelled) return;

        if (!r.ok) {
          setError(r.status === 401 ? "Sign in with Steam to see your inventory" : `Error ${r.status}`);
          break;
        }
        const j: {
          items?: SkinItem[];
          totalInventoryCount?: number | null;
          more?: boolean;
          nextCursor?: string | null;
          error?: string;
          message?: string;
        } = await r.json();
        if (myToken.cancelled) return;

        if (j.error) {
          setError(j.message || j.error);
          break;
        }
        if (j.totalInventoryCount != null) totalInv = j.totalInventoryCount;
        for (const it of (j.items || [])) {
          if (seenAssetIds.has(it.assetId)) continue;
          seenAssetIds.add(it.assetId);
          allItems.push(it);
        }
        pagesFetched++;
        // Update display progressively after each page
        setData(aggregateInto(allItems, totalInv, j.more === true, source));
        setProgress({ loaded: allItems.length, total: totalInv });
        // First page → flip from "loading" to "loaded but loadingMore"
        if (loading) setLoading(false);
        if (j.more && j.nextCursor) {
          setLoadingMore(true);
          cursor = j.nextCursor;
          // Brief delay between pages to be polite
          await new Promise((r) => setTimeout(r, 400));
        } else {
          cursor = null;
        }
      } while (cursor && pagesFetched < MAX_PAGES);
      if (myToken.cancelled) return;
      // Final settle: mark partial=false now that the loop ended cleanly
      if (allItems.length > 0) {
        setData(aggregateInto(allItems, totalInv, false, source));
      } else if (!error) {
        // Distinguish "truly empty inventory" from "Steam returned a degraded
        // empty response" (the latter is almost always a soft rate limit).
        // Total >0 but items 0 = Steam knows the inventory has items but
        // didn't ship them in this response → retry will likely succeed.
        if (totalInv && totalInv > 0) {
          setError(
            `Steam returned an empty response despite this account having ${totalInv} items. ` +
            `This usually means Steam is soft-rate-limiting our IP. ` +
            `Wait 30-60 seconds and click "Retry" below.`
          );
        } else {
          setError("No CS2 inventory items found for this account.");
        }
      }
    } catch (e) {
      if (myToken.cancelled) return;
      if (allItems.length === 0) {
        setError("Failed to load inventory: " + String(e));
      }
      // Otherwise keep what we have, mark partial
      if (allItems.length > 0) {
        setData(aggregateInto(allItems, totalInv, true, source));
      }
    } finally {
      if (!myToken.cancelled) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  useEffect(() => { load(priceSource); }, [load, priceSource]);

  // Cleanup: cancel any pagination on unmount
  useEffect(() => {
    return () => { abortRef.current.cancelled = true; };
  }, []);

  // Defensively pick a sub-view. None of these branches use hooks.
  if (loading && !data) return <LoadingView />;
  if (error && !data?.categories) return <ErrorView message={error} onRetry={() => load(priceSource)} />;
  if (!data || !data.categories) return null;

  return (
    <InventoryView
      data={data}
      priceSource={priceSource}
      onPriceSourceChange={setPriceSource}
      loadingMore={loadingMore}
      progress={progress}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LOADING VIEW
// ─────────────────────────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="flex h-48 items-center justify-center border border-cs-border bg-cs-panel clip-corner">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin border-2 border-cs-orange border-t-transparent" />
        <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// FETCHING INVENTORY + PRICES</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ERROR VIEW
// ─────────────────────────────────────────────────────────────────────────
function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-cs-border bg-cs-panel p-6 text-center clip-corner">
      <div className="font-mono text-xs uppercase tracking-widest text-cs-red">// {message}</div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg hover:brightness-110"
          >
            ↻ Retry
          </button>
        )}
        {message.toLowerCase().includes("private") && (
          <a
            href="https://steamcommunity.com/my/edit/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-cs-orange/60 px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-orange"
          >
            Open Steam Privacy Settings ↗
          </a>
        )}
        <a
          href="/api/inventory?debug=1"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-cs-blue hover:underline"
        >
          /api/inventory?debug=1 ↗
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// INVENTORY VIEW — only mounted when `data` is non-null. All hooks here
// can safely assume `data.categories` exists.
// ─────────────────────────────────────────────────────────────────────────
function InventoryView({
  data,
  priceSource,
  onPriceSourceChange,
  loadingMore,
  progress,
}: {
  data: InventoryResponse;
  priceSource: PriceSource;
  onPriceSourceChange: (s: PriceSource) => void;
  loadingMore?: boolean;
  progress?: { loaded: number; total: number | null };
}) {
  // ━━━ ALL HOOKS — TOP, UNCONDITIONAL ━━━
  const [activeCategory, setActiveCategory] = useState<string>("Knife");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const { format: formatTotal } = useCurrency();

  useEffect(() => { setOverrides(safeGetOverrides()); }, []);

  // Memoize derived values so unnecessary re-renders don't recompute
  const categoriesPresent = useMemo(
    () => CATEGORY_ORDER.filter((c) => (data.categories[c]?.items?.length ?? 0) > 0),
    [data]
  );

  // Determine which category to show
  const currentCategory = data.categories[activeCategory]
    ? activeCategory
    : (categoriesPresent[0] || "Other");

  const cat = data.categories[currentCategory];

  // Compute the loadout (memoized for perf)
  const best = useMemo(() => {
    const allItemsByAssetId = new Map<string, SkinItem>();
    for (const c of Object.values(data.categories)) {
      for (const it of (c.items || [])) allItemsByAssetId.set(it.assetId, it);
    }
    const effectiveLoadout: Record<string, SkinItem> = { ...(data.bestPerWeapon || {}) };
    for (const [weapon, assetId] of Object.entries(overrides)) {
      const overrideItem = allItemsByAssetId.get(assetId);
      if (overrideItem) effectiveLoadout[weapon] = overrideItem;
    }
    return Object.values(effectiveLoadout).sort(
      (a, b) => (b.price?.lowestPrice || 0) - (a.price?.lowestPrice || 0)
    );
  }, [data, overrides]);

  const handleEquip = (item: SkinItem) => {
    const isCurrentlyEquipped = overrides[item.weapon] === item.assetId;
    safeSetOverride(item.weapon, isCurrentlyEquipped ? null : item.assetId);
    setOverrides(safeGetOverrides());
  };

  const sourceLabel = priceSource === "buff163" ? "BUFF163" : "Steam Market";

  return (
    <div className="space-y-5">
      {/* Top bar: summary + price-source toggle */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Items Loaded"
          value={
            data.totalInventoryCount && data.totalInventoryCount !== data.totalItems
              ? `${(data.totalItems ?? 0).toLocaleString()} / ${data.totalInventoryCount.toLocaleString()}`
              : (data.totalItems ?? 0).toLocaleString()
          }
          accent={data.partial ? "text-cs-orange" : undefined}
        />
        <SummaryCard label="Categories" value={categoriesPresent.length} />
        <SummaryCard
          label="Priced"
          value={`${data.pricedCount ?? 0} / ${data.totalItems ?? 0}`}
        />
        <SummaryCard
          label={`Total Value (${sourceLabel})`}
          value={data.totalEstimatedValue ? formatTotal(data.totalEstimatedValue) : "—"}
          accent="text-emerald-400"
        />
        <div className="border border-cs-border bg-cs-panel p-3 clip-corner">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">Price source</div>
          <div className="flex">
            <PriceSourceBtn active={priceSource === "buff163"} onClick={() => onPriceSourceChange("buff163")}>
              BUFF163
            </PriceSourceBtn>
            <PriceSourceBtn active={priceSource === "steam"} onClick={() => onPriceSourceChange("steam")}>
              Steam
            </PriceSourceBtn>
          </div>
        </div>
      </div>

      {/* Background pagination indicator (active while streaming pages from Steam) */}
      {loadingMore && (
        <div className="flex items-center gap-3 border border-cs-orange/40 bg-cs-orange/10 p-3 clip-corner">
          <div className="h-4 w-4 flex-shrink-0 animate-spin border-2 border-cs-orange border-t-transparent rounded-full" />
          <div className="flex-1 text-sm">
            <div className="font-display font-bold uppercase tracking-wider text-cs-orange">
              Loading more items… ({progress?.loaded ?? 0}{progress?.total ? ` / ${progress.total}` : ""})
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Steam serves inventories in pages — fetching the rest in the background. Items appear progressively.
            </div>
          </div>
        </div>
      )}

      {/* Final partial-inventory warning (only when streaming finished without all items) */}
      {data.partial && !loadingMore && (
        <div className="border border-cs-orange/40 bg-cs-orange/10 p-3 text-sm clip-corner">
          <div className="font-display font-bold uppercase tracking-wider text-cs-orange">
            ⚠ Partial inventory ({data.totalItems} of {data.totalInventoryCount} items loaded)
          </div>
          <div className="mt-1 text-slate-300">
            Steam rate-limited the fetch before all pages could be retrieved.
            Wait ~60 seconds and refresh — the next attempt usually completes.
          </div>
        </div>
      )}

      {/* Honest disclosure about prices */}
      <div className="border border-cs-blue/30 bg-cs-blue/5 p-3 font-mono text-[11px] text-slate-400 clip-corner">
        // Prices from <span className="text-cs-blue font-bold">{sourceLabel}</span>, cached server-side and refreshed every 30 minutes.
        {priceSource === "buff163" ? " BUFF163 prices are typically 10-30% lower than Steam Market (no Steam fee)." : " Steam Market prices include the 15% Valve fee."}
      </div>

      {/* Per-category breakdown — helps diagnose "missing items" issues by
          showing exactly how many items landed in each category. Should
          sum to data.totalItems. If it does and items are still "missing",
          the issue is mis-categorization (item is somewhere unexpected). */}
      <details className="border border-cs-border bg-cs-panel p-3 clip-corner">
        <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-widest text-slate-500 hover:text-cs-orange">
          // CATEGORY BREAKDOWN ({data.totalItems} total items in {categoriesPresent.length} categories) — click to expand
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(data.categories).sort((a, b) => b[1].count - a[1].count).map(([cat, info]) => (
            <div key={cat} className="flex items-center justify-between border border-cs-border/50 bg-cs-bg/50 px-2 py-1 font-mono text-[11px]">
              <span className="text-slate-400">{cat}</span>
              <span className="font-bold text-cs-orange">{info.count}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 font-mono text-[10px] text-slate-600">
          Sum: {Object.values(data.categories).reduce((s, c) => s + c.count, 0)} ·
          Expected: {data.totalInventoryCount ?? "?"} ·
          Loaded: {data.totalItems}
          {data.totalInventoryCount && (data.totalItems ?? 0) < data.totalInventoryCount && (
            <span className="ml-2 text-cs-red">⚠ {data.totalInventoryCount - (data.totalItems ?? 0)} items unaccounted for</span>
          )}
        </div>
      </details>

      {/* Best loadout per weapon */}
      {best.length > 0 && (
        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="mb-4">
            <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// LOADOUT (BEST PER WEAPON)</div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Highest-value skin per slot · Valve doesn't expose true equipped loadout
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {best.slice(0, 12).map((item) => (
              <SkinCard
                key={`loadout-${item.assetId}`}
                item={item}
                compact
                isEquipped={overrides[item.weapon] === item.assetId}
                onEquip={() => handleEquip(item)}
              />
            ))}
          </div>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-widest text-slate-600">
            // Click EQUIP on any skin below to override the auto-detected best.
            Choices saved locally on this device.
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-1 border border-cs-border bg-cs-panel p-1 clip-corner">
        {categoriesPresent.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
              currentCategory === c
                ? "bg-cs-orange text-cs-bg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {CATEGORY_LABELS[c] || c}
            <span className="ml-1.5 font-mono text-[10px] opacity-70">{data.categories[c]?.count ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Category contents */}
      {cat && cat.items && cat.items.length > 0 ? (
        <div>
          {(cat.totalValue ?? 0) > 0 && (
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-500">
              Category total: <span className="text-emerald-400">{formatTotal(cat.totalValue)}</span>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cat.items.map((item) => {
              const canEquip = ["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(item.category);
              return (
                <SkinCard
                  key={`cat-${currentCategory}-${item.assetId}`}
                  item={item}
                  isEquipped={overrides[item.weapon] === item.assetId}
                  onEquip={canEquip ? () => handleEquip(item) : undefined}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-cs-border bg-cs-panel p-4 text-center font-mono text-xs text-slate-500 clip-corner">
          // No items in this category
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PRESENTATIONAL COMPONENTS — no state, no early returns, only useCurrency
// ─────────────────────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean | string }) {
  const cls = accent === true ? "text-cs-orange" : typeof accent === "string" ? accent : "text-white";
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function PriceSourceBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1 font-display text-xs font-bold uppercase tracking-wider transition ${
        active ? "bg-cs-orange text-cs-bg" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SkinCard({ item, compact, isEquipped, onEquip }: {
  item: SkinItem;
  compact?: boolean;
  isEquipped?: boolean;
  onEquip?: () => void;
}) {
  // useCurrency is the only hook here. Always called. Never conditional.
  const { format } = useCurrency();
  const rarityHex = item.rarityColor || "#94a3b8";
  const priceText = item.price?.lowestPrice != null
    ? format(item.price.lowestPrice)
    : null;

  return (
    <a
      href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden border bg-cs-panel transition hover:bg-cs-bg"
      style={{ borderColor: `${rarityHex}40` }}
    >
      <div className="h-1 w-full" style={{ background: rarityHex }} />

      <div className="absolute right-2 top-3 z-10 flex flex-col gap-1">
        {isEquipped && (
          <span className="bg-emerald-500 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-cs-bg" title="Marked as equipped">★ EQUIP</span>
        )}
        {item.stattrak && (
          <span className="bg-orange-500 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-white">ST</span>
        )}
        {item.souvenir && (
          <span className="bg-amber-400 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-amber-900">SOUV</span>
        )}
        {!item.tradable && (
          <span className="bg-cs-red/70 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-white" title="Not tradable">🔒</span>
        )}
        {onEquip && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEquip(); }}
            className={`px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest transition ${
              isEquipped
                ? "bg-slate-600 text-white hover:bg-slate-500"
                : "bg-cs-orange/80 text-cs-bg hover:bg-cs-orange"
            }`}
            title={isEquipped ? "Unmark as equipped" : "Mark as equipped"}
          >
            {isEquipped ? "UNEQUIP" : "EQUIP"}
          </button>
        )}
      </div>

      <div className={`relative flex items-center justify-center bg-gradient-to-b from-cs-bg/40 to-cs-bg/0 ${compact ? "h-24" : "h-32"}`}>
        {item.iconUrl ? (
          <img
            src={item.iconUrlLarge || item.iconUrl}
            alt={item.name || ""}
            className="max-h-full max-w-full object-contain transition group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="font-mono text-xs text-slate-500">no image</div>
        )}
        <div className="absolute inset-x-4 bottom-0 h-12 opacity-30 blur-2xl" style={{ background: rarityHex }} />
      </div>

      <div className="p-3">
        <div className="truncate font-display text-sm font-bold uppercase tracking-tight text-white">{item.weapon || "—"}</div>
        <div className="truncate font-mono text-[11px] text-slate-400">{item.skin || "—"}</div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            {item.wear && (
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{abbreviateWear(item.wear)}</div>
            )}
            {item.rarity && (
              <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: rarityHex }}>{item.rarity}</div>
            )}
          </div>
          <div className="text-right">
            {priceText ? (
              <div className="font-display text-base font-bold text-emerald-400">{priceText}</div>
            ) : (
              <div className="font-mono text-[10px] uppercase text-slate-600">no price</div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function abbreviateWear(w: string): string {
  return ({
    "Factory New": "FN",
    "Minimal Wear": "MW",
    "Field-Tested": "FT",
    "Well-Worn": "WW",
    "Battle-Scarred": "BS",
  } as Record<string, string>)[w] || w;
}

// ─────────────────────────────────────────────────────────────────────────
// DEMO INVENTORY — used when `isDemo === true`
// ─────────────────────────────────────────────────────────────────────────
function generateDemoInventory(): InventoryResponse {
  const items: SkinItem[] = [
    mkItem("★ Karambit | Doppler", "Knife", "Karambit", "Doppler", "Factory New", "#8650AC", "★ Covert", true, false, "$1,247.83", 1247.83),
    mkItem("★ Sport Gloves | Pandora's Box", "Gloves", "Sport Gloves", "Pandora's Box", "Field-Tested", "#8650AC", "★ Extraordinary", false, false, "$842.10", 842.10),
    mkItem("AK-47 | Asiimov", "Rifle", "AK-47", "Asiimov", "Field-Tested", "#EB4B4B", "Covert", true, false, "$92.55", 92.55),
    mkItem("AWP | Dragon Lore", "Sniper", "AWP", "Dragon Lore", "Minimal Wear", "#EB4B4B", "Covert", false, false, "$8,450.00", 8450),
    mkItem("M4A4 | Howl", "Rifle", "M4A4", "Howl", "Minimal Wear", "#E4AE39", "★ Contraband", false, false, "$4,200.00", 4200),
    mkItem("Desert Eagle | Blaze", "Pistol", "Desert Eagle", "Blaze", "Factory New", "#EB4B4B", "Covert", false, false, "$385.00", 385),
    mkItem("USP-S | Kill Confirmed", "Pistol", "USP-S", "Kill Confirmed", "Field-Tested", "#EB4B4B", "Covert", false, false, "$78.20", 78.20),
    mkItem("Glock-18 | Fade", "Pistol", "Glock-18", "Fade", "Factory New", "#D32CE6", "Classified", false, false, "$520.00", 520),
    mkItem("M4A1-S | Hot Rod", "Rifle", "M4A1-S", "Hot Rod", "Factory New", "#D32CE6", "Classified", false, false, "$165.40", 165.40),
    mkItem("AWP | Asiimov", "Sniper", "AWP", "Asiimov", "Field-Tested", "#EB4B4B", "Covert", true, false, "$112.30", 112.30),
    mkItem("MP9 | Bulldozer", "SMG", "MP9", "Bulldozer", "Factory New", "#8847FF", "Restricted", false, false, "$24.50", 24.50),
    mkItem("P90 | Asiimov", "SMG", "P90", "Asiimov", "Field-Tested", "#EB4B4B", "Covert", false, false, "$48.10", 48.10),
    mkItem("Nova | Hyper Beast", "Heavy", "Nova", "Hyper Beast", "Minimal Wear", "#D32CE6", "Classified", false, false, "$11.20", 11.20),
    mkItem("FAMAS | Roll Cage", "Rifle", "FAMAS", "Roll Cage", "Field-Tested", "#8847FF", "Restricted", false, false, "$5.80", 5.80),
    mkItem("Galil AR | Cerberus", "Rifle", "Galil AR", "Cerberus", "Factory New", "#D32CE6", "Classified", false, false, "$14.30", 14.30),
    mkItem("Five-SeveN | Case Hardened", "Pistol", "Five-SeveN", "Case Hardened", "Factory New", "#8847FF", "Restricted", false, false, "$28.40", 28.40),
    mkItem("Sticker | Natus Vincere | Stockholm 2021", "Sticker", "Sticker", null, null, "#EB4B4B", "Foil", false, false, "$3.20", 3.20),
    mkItem("Special Agent Ava | FBI", "Agent", "Special Agent Ava", null, null, "#D32CE6", "Master Agent", false, false, "$32.80", 32.80),
  ];

  const categories: Record<string, { items: SkinItem[]; totalValue: number; count: number }> = {};
  let total = 0;
  for (const it of items) {
    if (!categories[it.category]) categories[it.category] = { items: [], totalValue: 0, count: 0 };
    categories[it.category].items.push(it);
    categories[it.category].count++;
    if (it.price?.lowestPrice) {
      categories[it.category].totalValue += it.price.lowestPrice;
      total += it.price.lowestPrice;
    }
  }

  const bestPerWeapon: Record<string, SkinItem> = {};
  for (const it of items) {
    if (!["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(it.category)) continue;
    if (!bestPerWeapon[it.weapon] || (it.price?.lowestPrice || 0) > (bestPerWeapon[it.weapon].price?.lowestPrice || 0)) {
      bestPerWeapon[it.weapon] = it;
    }
  }

  return {
    totalItems: items.length,
    totalEstimatedValue: +total.toFixed(2),
    pricesIncluded: true,
    pricedCount: items.filter((i) => i.price).length,
    currency: 1,
    priceSource: "buff163",
    categories,
    bestPerWeapon,
  };
}

function mkItem(
  hashName: string, category: string, weapon: string, skin: string | null,
  wear: string | null, rarityColor: string, rarity: string,
  stattrak: boolean, souvenir: boolean, raw: string, price: number
): SkinItem {
  return {
    assetId: `demo-${Math.random().toString(36).slice(2, 9)}`,
    classId: "0", instanceId: "0",
    name: hashName, marketHashName: hashName,
    weapon,
    weaponKey: null,
    skin, wear,
    iconUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(weapon + skin)}&backgroundColor=11172a`,
    iconUrlLarge: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(weapon + skin)}&backgroundColor=11172a&size=256`,
    rarityColor, rarity, type: null,
    stattrak, souvenir, category,
    tradable: true, marketable: true,
    price: { lowestPrice: price, medianPrice: price, volume: Math.floor(Math.random() * 500), source: "demo", raw },
  };
}
