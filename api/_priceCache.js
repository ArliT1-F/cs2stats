// Cached CS2 skin price database.
//
// Source: prices.csgotrader.app/latest/buff163.json — a free, auth-less JSON
// dump of every CS2 skin's price (BUFF163 reference prices). Updated daily.
//
// Strategy:
//   1. On first request, fetch the entire price dump (~2 MB JSON, ~15k items)
//   2. Cache in module scope for the lifetime of the warm Lambda (~5-15 min)
//   3. Subsequent requests are instant (no Steam Market round-trip needed)
//   4. Refresh after CACHE_TTL ms
//
// This avoids:
//   - Steam Market rate limits (only ~20 req/min per IP, would take 50+ minutes
//     to price a 1000-item inventory)
//   - Inconsistent per-item failures
//   - Slow inventory page loads
//
// Trade-off: BUFF163 prices are ~10-30% lower than Steam Market (BUFF is the
// Asian secondary market, Steam adds a 15% fee). We label this clearly in the
// UI so users understand. For Steam Market prices specifically, set the
// `?source=steam` query param to fall back to live Steam Market lookups.

const PRICE_SOURCES = {
  buff163: "https://prices.csgotrader.app/latest/buff163.json",
  steam: "https://prices.csgotrader.app/latest/steam.json",
  csgotrader: "https://prices.csgotrader.app/latest/prices_v6.json",
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// In-memory cache (per warm Lambda instance)
let cache = {
  source: null,
  data: null,         // { "AK-47 | Asiimov (Field-Tested)": { starting_at: { price: 92.55 } }, ... }
  fetchedAt: 0,
  fetching: null,     // Promise<void> if a fetch is in flight
};

async function loadPriceDb(source = "buff163") {
  // Return cached if still valid AND same source
  const now = Date.now();
  if (cache.data && cache.source === source && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  // Coalesce concurrent calls
  if (cache.fetching) {
    await cache.fetching;
    return cache.data;
  }

  cache.fetching = (async () => {
    const url = PRICE_SOURCES[source] || PRICE_SOURCES.buff163;
    const r = await fetch(url, {
      headers: { "User-Agent": "CS2Tracker/1.0" },
    });
    if (!r.ok) {
      cache.fetching = null;
      throw new Error(`Price DB fetch failed: ${r.status}`);
    }
    const j = await r.json();
    cache.source = source;
    cache.data = j;
    cache.fetchedAt = Date.now();
    cache.fetching = null;
  })();

  try { await cache.fetching; } catch { cache.fetching = null; }
  return cache.data;
}

// Look up a single market_hash_name. Returns { lowestPrice, source, raw }
// or null if not in the price DB.
//
// BUFF163 dump format: { "<market_hash_name>": { starting_at: { price: 1.23 }, highest_order: { price: 1.20 } } }
// Steam dump format:   { "<market_hash_name>": { last_24h: 1.23, last_7d: 1.20, last_30d: 1.18, last_90d: 1.15 } }
export async function getPrice(marketHashName, source = "buff163") {
  if (!marketHashName) return null;
  try {
    const db = await loadPriceDb(source);
    if (!db) return null;
    const entry = db[marketHashName];
    if (!entry) return null;

    let lowestPrice = null;
    if (source === "buff163") {
      // BUFF: prefer "starting_at" (lowest sell), fallback to "highest_order" (highest buy)
      lowestPrice = entry.starting_at?.price ?? entry.highest_order?.price ?? null;
    } else if (source === "steam") {
      // Steam: prefer most recent average
      lowestPrice = entry.last_24h ?? entry.last_7d ?? entry.last_30d ?? entry.last_90d ?? null;
    } else {
      // csgotrader format varies — try common keys
      lowestPrice = entry.steam?.last_24h ?? entry.bymykel?.price ?? entry.skinport?.suggested_price ?? null;
    }

    if (lowestPrice === null || lowestPrice === undefined) return null;
    const numPrice = parseFloat(lowestPrice);
    if (!Number.isFinite(numPrice)) return null;

    return {
      lowestPrice: numPrice,
      medianPrice: numPrice,
      volume: null,
      source,
      raw: `$${numPrice.toFixed(2)}`,
    };
  } catch {
    return null;
  }
}

// Bulk-price an array of items. Much faster than individual lookups since the
// DB is loaded once and shared across all items in the request.
export async function getPricesBulk(marketHashNames, source = "buff163") {
  const result = {};
  try {
    const db = await loadPriceDb(source);
    if (!db) return result;
    for (const name of marketHashNames) {
      if (!name) continue;
      const entry = db[name];
      if (!entry) continue;

      let lowestPrice = null;
      if (source === "buff163") {
        lowestPrice = entry.starting_at?.price ?? entry.highest_order?.price ?? null;
      } else if (source === "steam") {
        lowestPrice = entry.last_24h ?? entry.last_7d ?? entry.last_30d ?? entry.last_90d ?? null;
      }
      if (lowestPrice === null || lowestPrice === undefined) continue;
      const numPrice = parseFloat(lowestPrice);
      if (!Number.isFinite(numPrice)) continue;

      result[name] = {
        lowestPrice: numPrice,
        medianPrice: numPrice,
        volume: null,
        source,
        raw: `$${numPrice.toFixed(2)}`,
      };
    }
  } catch {
    // Return whatever we got
  }
  return result;
}

// Diagnostic info about the cache
export function getCacheStatus() {
  return {
    loaded: !!cache.data,
    source: cache.source,
    itemCount: cache.data ? Object.keys(cache.data).length : 0,
    fetchedAt: cache.fetchedAt,
    ageMs: cache.fetchedAt ? Date.now() - cache.fetchedAt : null,
    ttlMs: CACHE_TTL_MS,
  };
}