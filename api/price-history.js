// Lightweight historical price endpoint. Pulls from csgotrader.app's
// prices_v6.json which includes BUFF163 historical points (24h, 7d, 30d, 90d).
//
// Not a full time-series — csgotrader exposes 4 snapshots, not daily candles.
// That's enough for a 4-point sparkline that shows the recent trend.
//
// Cached in memory for 30 minutes per warm Lambda.

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache = { data: null, fetchedAt: 0, fetching: null };

async function loadDb() {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  if (cache.fetching) { await cache.fetching; return cache.data; }
  cache.fetching = (async () => {
    try {
      const r = await fetch("https://prices.csgotrader.app/latest/prices_v6.json", {
        headers: { "User-Agent": "CS2Tracker/1.0" },
      });
      if (!r.ok) throw new Error(`fetch_${r.status}`);
      cache.data = await r.json();
      cache.fetchedAt = Date.now();
    } catch (e) {
      cache.fetching = null;
      throw e;
    }
  })();
  try { await cache.fetching; } catch {}
  cache.fetching = null;
  return cache.data;
}

function extractHistory(entry) {
  // The prices_v6 entries vary by source. We try both BUFF163 and Steam shapes.
  // BUFF: entry.buff163 = { starting_at: { price, doppler? }, last_24h, last_7d, last_30d, last_90d }
  // Steam: entry.steam = { last_24h, last_7d, last_30d, last_90d }
  const src = entry?.buff163 || entry?.steam;
  if (!src) return null;
  const p24 = src.last_24h ?? src.starting_at?.price ?? null;
  const p7 = src.last_7d ?? null;
  const p30 = src.last_30d ?? null;
  const p90 = src.last_90d ?? null;
  const points = [p90, p30, p7, p24].filter((v) => Number.isFinite(+v)).map((v) => +v);
  if (points.length < 2) return null;
  const current = points[points.length - 1];
  const oldest = points[0];
  const change = oldest > 0 ? ((current - oldest) / oldest) * 100 : 0;
  return {
    points,           // [90d, 30d, 7d, 24h] → oldest to newest
    labels: ["90d", "30d", "7d", "24h"].slice(-points.length),
    current,
    oldest,
    changePercent: +change.toFixed(1),
  };
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const namesParam = url.searchParams.get("names") || "";
  const names = namesParam.split("|").map((n) => n.trim()).filter(Boolean).slice(0, 50);

  if (names.length === 0) return res.status(400).json({ error: "missing names" });

  let db;
  try { db = await loadDb(); }
  catch { return res.status(503).json({ error: "price_db_unavailable" }); }
  if (!db) return res.status(503).json({ error: "price_db_empty" });

  const result = {};
  for (const name of names) {
    const entry = db[name];
    if (!entry) continue;
    const hist = extractHistory(entry);
    if (hist) result[name] = hist;
  }

  res.setHeader("Cache-Control", "public, max-age=600");
  res.json({ result, count: Object.keys(result).length });
}
