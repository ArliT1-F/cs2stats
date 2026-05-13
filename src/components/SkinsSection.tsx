import { useEffect, useState, useCallback } from "react";
import type { InventoryResponse, SkinItem } from "../lib/skinsTypes";

// Shows the user's CS2 skin inventory grouped by weapon category, with
// market prices fetched from Steam. Active loadout proxy: highest-value
// skin per weapon slot (Valve doesn't expose actual equipped loadout).

const CATEGORY_ORDER = ["Knife", "Gloves", "Rifle", "Sniper", "Pistol", "SMG", "Heavy", "Agent", "Sticker", "Other"];
const CATEGORY_LABELS: Record<string, string> = {
  Knife: "Knives", Gloves: "Gloves", Rifle: "Rifles", Sniper: "Snipers",
  Pistol: "Pistols", SMG: "SMGs", Heavy: "Heavy", Agent: "Agents",
  Sticker: "Stickers", Other: "Other",
};

export function SkinsSection({ isDemo }: { isDemo: boolean }) {
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [withPrices, setWithPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Knife");

  const load = useCallback(async (prices: boolean) => {
    if (isDemo) {
      setData(generateDemoInventory());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/inventory${prices ? "?prices=1&maxPrices=30" : ""}`, {
        credentials: "include",
      });
      if (!r.ok) {
        setError(r.status === 401 ? "Sign in with Steam to see your inventory" : `Error ${r.status}`);
        setLoading(false);
        return;
      }
      const j: InventoryResponse = await r.json();
      if (j.error) {
        setError(j.message || j.error);
      }
      setData(j);
    } catch (e) {
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => { load(false); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex h-48 items-center justify-center border border-cs-border bg-cs-panel clip-corner">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin border-2 border-cs-orange border-t-transparent" />
          <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// FETCHING INVENTORY</div>
        </div>
      </div>
    );
  }

  if (error && !data?.categories) {
    return (
      <div className="border border-cs-border bg-cs-panel p-6 text-center clip-corner">
        <div className="font-mono text-xs uppercase tracking-widest text-cs-red">// {error}</div>
        {error.includes("private") && (
          <div className="mt-3">
            <a
              href="https://steamcommunity.com/my/edit/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg"
            >
              Open Steam Privacy Settings ↗
            </a>
          </div>
        )}
      </div>
    );
  }

  if (!data || !data.categories) return null;

  const categoriesPresent = CATEGORY_ORDER.filter((c) => data.categories[c]?.items.length);
  const cat = data.categories[activeCategory] || (categoriesPresent[0] && data.categories[categoriesPresent[0]]);
  const currentCategory = data.categories[activeCategory] ? activeCategory : categoriesPresent[0];

  // Best loadout: top-valued items grouped by weapon
  const best = Object.values(data.bestPerWeapon || {}).sort((a, b) =>
    (b.price?.lowestPrice || 0) - (a.price?.lowestPrice || 0)
  );

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Items" value={data.totalItems?.toLocaleString() || "0"} />
        <SummaryCard label="Categories" value={categoriesPresent.length} />
        <SummaryCard
          label="Priced Items"
          value={`${data.pricedCount ?? 0} / ${data.totalItems ?? 0}`}
          accent
        />
        <SummaryCard
          label="Est. Total Value"
          value={data.totalEstimatedValue ? `$${data.totalEstimatedValue.toFixed(2)}` : "—"}
          accent="text-emerald-400"
        />
      </div>

      {/* Price-fetch CTA */}
      {!withPrices && !isDemo && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-cs-orange/40 bg-cs-orange/10 p-4 clip-corner">
          <div>
            <div className="font-display font-bold uppercase tracking-wider text-cs-orange">
              Market prices not loaded
            </div>
            <div className="text-sm text-slate-300">
              Fetching prices is rate-limited by Steam (~3 sec). We'll grab the top 30 most valuable items.
            </div>
          </div>
          <button
            onClick={() => { setWithPrices(true); load(true); }}
            disabled={loading}
            className="bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg disabled:opacity-50"
          >
            {loading ? "Loading…" : "Fetch Prices"}
          </button>
        </div>
      )}

      {/* Best loadout per weapon */}
      {best.length > 0 && (
        <div className="border border-cs-border bg-cs-panel p-5 clip-corner">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">// LOADOUT (BEST PER WEAPON)</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Highest-value skin per weapon slot · Valve doesn't expose true equipped loadout
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {best.slice(0, 12).map((item) => (
              <SkinCard key={item.assetId} item={item} compact />
            ))}
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
            <span className="ml-1.5 font-mono text-[10px] opacity-70">
              {data.categories[c].count}
            </span>
          </button>
        ))}
      </div>

      {/* Category contents */}
      {cat && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cat.items.map((item) => (
            <SkinCard key={item.assetId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean | string }) {
  const cls = accent === true ? "text-cs-orange" : typeof accent === "string" ? accent : "text-white";
  return (
    <div className="border border-cs-border bg-cs-panel p-4 clip-corner">
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function SkinCard({ item, compact }: { item: SkinItem; compact?: boolean }) {
  const rarityHex = item.rarityColor || "#94a3b8";
  return (
    <a
      href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.marketHashName)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden border bg-cs-panel transition hover:bg-cs-bg"
      style={{ borderColor: `${rarityHex}40` }}
    >
      {/* Rarity stripe */}
      <div className="h-1 w-full" style={{ background: rarityHex }} />

      {/* Top-right badges */}
      <div className="absolute right-2 top-3 z-10 flex flex-col gap-1">
        {item.stattrak && (
          <span className="bg-orange-500 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-white">
            ST
          </span>
        )}
        {item.souvenir && (
          <span className="bg-amber-400 px-1.5 py-0.5 font-display text-[9px] font-black uppercase tracking-widest text-amber-900">
            SOUV
          </span>
        )}
      </div>

      {/* Skin image */}
      <div className={`relative flex items-center justify-center bg-gradient-to-b from-cs-bg/40 to-cs-bg/0 ${compact ? "h-24" : "h-32"}`}>
        {item.iconUrl ? (
          <img
            src={item.iconUrlLarge || item.iconUrl}
            alt={item.name}
            className="max-h-full max-w-full object-contain transition group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="font-mono text-xs text-slate-500">no image</div>
        )}
        {/* Glow */}
        <div
          className="absolute inset-x-4 bottom-0 h-12 opacity-30 blur-2xl"
          style={{ background: rarityHex }}
        />
      </div>

      <div className="p-3">
        <div className="truncate font-display text-sm font-bold uppercase tracking-tight text-white">
          {item.weapon}
        </div>
        <div className="truncate font-mono text-[11px] text-slate-400">
          {item.skin || "—"}
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            {item.wear && (
              <div className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                {abbreviateWear(item.wear)}
              </div>
            )}
            {item.rarity && (
              <div
                className="font-mono text-[9px] uppercase tracking-widest"
                style={{ color: rarityHex }}
              >
                {item.rarity}
              </div>
            )}
          </div>
          <div className="text-right">
            {item.price?.lowestPrice ? (
              <>
                <div className="font-display text-base font-bold text-emerald-400">
                  {item.price.raw || `$${item.price.lowestPrice.toFixed(2)}`}
                </div>
                {item.price.volume && (
                  <div className="font-mono text-[9px] text-slate-500">
                    {item.price.volume} sold/24h
                  </div>
                )}
              </>
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

// --- Demo inventory generator ---
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
    weapon, skin, wear,
    iconUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(weapon + skin)}&backgroundColor=11172a`,
    iconUrlLarge: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(weapon + skin)}&backgroundColor=11172a&size=256`,
    rarityColor, rarity, type: null,
    stattrak, souvenir, category,
    tradable: true, marketable: true,
    price: { lowestPrice: price, medianPrice: price, volume: Math.floor(Math.random() * 500), raw },
  };
}
