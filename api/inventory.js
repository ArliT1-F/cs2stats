// Fetches the logged-in user's CS2 inventory from Steam Community + market prices.
//
// IMPORTANT: Valve does NOT expose "currently equipped loadout" via any public API.
// We fetch the full inventory and group by weapon category so users can see all
// their skins. Highest-value skin per weapon slot is highlighted as their
// "best skin" for that weapon (a sensible loadout proxy).
//
// Rate limits:
//   - Inventory endpoint: ~5 req/min per IP
//   - Market priceoverview: ~20 req/min per IP
// We cache aggressively and fetch prices in batches with retry/backoff.

function parseCookies(req) {
  const header = req.headers.cookie || "";
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
}

// --- Steam inventory fetch -------------------------------------------------
async function fetchInventory(steamId) {
  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=2000`;
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CS2Tracker/1.0)",
      Accept: "application/json",
    },
  });
  if (r.status === 403) return { error: "private_inventory" };
  if (r.status === 429) return { error: "rate_limited" };
  if (!r.ok) return { error: `inventory_${r.status}` };
  const j = await r.json();
  if (!j || j.success === false) return { error: "empty_inventory" };
  return { data: j };
}

// --- Steam Market price lookup --------------------------------------------
const priceCache = new Map(); // in-memory cache (per warm Lambda)
async function fetchMarketPrice(marketHashName, currency = 1) {
  const cacheKey = `${currency}:${marketHashName}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey);

  const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=${currency}&market_hash_name=${encodeURIComponent(marketHashName)}`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CS2Tracker/1.0)" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.success) return null;
    const result = {
      lowestPrice: parsePrice(j.lowest_price),
      medianPrice: parsePrice(j.median_price),
      volume: j.volume ? parseInt(j.volume.replace(/,/g, ""), 10) : null,
      raw: j.lowest_price || j.median_price || null,
    };
    priceCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

function parsePrice(p) {
  if (!p) return null;
  const m = p.match(/[\d,.]+/);
  if (!m) return null;
  // Steam returns "$12.34" or "1.234,56€" — be lenient
  const cleaned = m[0].replace(/,/g, ".");
  const parts = cleaned.split(".");
  const last = parts.pop();
  const intPart = parts.join("");
  const num = parseFloat(`${intPart}.${last}`);
  return Number.isFinite(num) ? num : null;
}

// --- Item categorization (CS2 weapon families) ---------------------------
const WEAPON_CATEGORIES = {
  // Heavy / SMG / Rifle / Sniper / Pistol / Knife / Glove tags
  Rifle: ["AK-47","M4A4","M4A1-S","AUG","SG 553","FAMAS","Galil AR"],
  Sniper: ["AWP","SSG 08","SCAR-20","G3SG1"],
  Pistol: ["Desert Eagle","USP-S","Glock-18","P2000","P250","Five-SeveN","CZ75-Auto","Tec-9","Dual Berettas","R8 Revolver"],
  SMG: ["MP9","MP7","MP5-SD","UMP-45","P90","PP-Bizon","MAC-10"],
  Heavy: ["Nova","XM1014","Sawed-Off","MAG-7","M249","Negev"],
  Knife: ["Knife","★"],
  Gloves: ["Gloves","Hand Wraps","Driver Gloves","Sport Gloves","Specialist Gloves","Moto Gloves","Bloodhound Gloves","Hydra Gloves","Broken Fang Gloves"],
  Agent: ["Agent"],
  Sticker: ["Sticker"],
  Other: [],
};

function categorize(item) {
  const name = item.market_hash_name || item.name || "";
  if (name.startsWith("★")) return "Knife"; // CS2 prefixes knives with ★
  if (item.type?.toLowerCase().includes("gloves")) return "Gloves";
  if (item.type?.toLowerCase().includes("knife")) return "Knife";
  if (item.type?.toLowerCase().includes("agent")) return "Agent";
  if (item.type?.toLowerCase().includes("sticker")) return "Sticker";
  if (item.type?.toLowerCase().includes("graffiti")) return "Other";
  if (item.type?.toLowerCase().includes("music kit")) return "Other";
  if (item.type?.toLowerCase().includes("case")) return "Other";

  for (const [cat, weapons] of Object.entries(WEAPON_CATEGORIES)) {
    for (const w of weapons) {
      if (name.includes(w)) return cat;
    }
  }
  return "Other";
}

function extractWeaponName(marketHashName) {
  // "AK-47 | Asiimov (Field-Tested)" → "AK-47"
  // "★ Karambit | Doppler (Factory New)" → "Karambit"
  const cleaned = marketHashName.replace(/^StatTrak™\s*/, "").replace(/^★\s*/, "").replace(/^Souvenir\s*/, "");
  const idx = cleaned.indexOf("|");
  return idx >= 0 ? cleaned.slice(0, idx).trim() : cleaned.trim();
}

function extractSkinName(marketHashName) {
  const idx = marketHashName.indexOf("|");
  if (idx < 0) return null;
  return marketHashName.slice(idx + 1).replace(/\(.*?\)/, "").trim();
}

function extractWear(marketHashName) {
  const m = marketHashName.match(/\((.*?)\)$/);
  return m ? m[1] : null;
}

// --- Main handler ----------------------------------------------------------
export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const steamId = cookies.steamid;
  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  // Optional: ?fetchPrices=true (default false to keep request fast).
  // Pricing for 100+ items is slow + rate-limited, so we make it opt-in
  // and prioritize the most valuable-looking items first.
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fetchPrices = url.searchParams.get("prices") === "1";
  const currency = parseInt(url.searchParams.get("currency") || "1", 10); // 1=USD, 3=EUR
  const maxPriceFetch = parseInt(url.searchParams.get("maxPrices") || "20", 10);

  const inv = await fetchInventory(steamId);
  if (inv.error) {
    return res.status(200).json({
      error: inv.error,
      message: invErrorMessage(inv.error),
      categories: {},
    });
  }

  const data = inv.data;
  const assets = data.assets || [];
  const descriptions = data.descriptions || [];

  // Build a lookup table by classid_instanceid → description
  const descMap = {};
  for (const d of descriptions) {
    descMap[`${d.classid}_${d.instanceid}`] = d;
  }

  // Merge assets with descriptions
  const items = [];
  for (const a of assets) {
    const desc = descMap[`${a.classid}_${a.instanceid}`];
    if (!desc) continue;
    if (desc.tradable === 0 && desc.marketable === 0) {
      // Skip non-marketable junk (graffiti charges, etc.) unless it's a knife/gloves
      const cat = categorize(desc);
      if (!["Knife", "Gloves"].includes(cat)) continue;
    }
    const cat = categorize(desc);
    items.push({
      assetId: a.assetid,
      classId: a.classid,
      instanceId: a.instanceid,
      name: desc.name || desc.market_hash_name,
      marketHashName: desc.market_hash_name,
      weapon: extractWeaponName(desc.market_hash_name || ""),
      skin: extractSkinName(desc.market_hash_name || ""),
      wear: extractWear(desc.market_hash_name || ""),
      iconUrl: desc.icon_url
        ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}/256fx256f`
        : null,
      iconUrlLarge: desc.icon_url_large
        ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url_large}/512fx512f`
        : null,
      rarityColor: desc.name_color ? `#${desc.name_color}` : null,
      rarity: (desc.tags || []).find((t) => t.category === "Rarity")?.localized_tag_name || null,
      type: desc.type || null,
      stattrak: (desc.market_hash_name || "").includes("StatTrak"),
      souvenir: (desc.market_hash_name || "").includes("Souvenir"),
      category: cat,
      tradable: desc.tradable === 1,
      marketable: desc.marketable === 1,
      price: null,
    });
  }

  // Optionally fetch market prices for the top N items most likely to be valuable.
  // Heuristic: knives, gloves, then any item with "covert"/"classified" rarity.
  if (fetchPrices && items.length > 0) {
    const priority = items.slice().sort((a, b) => {
      const score = (it) =>
        (it.category === "Knife" ? 100 : 0) +
        (it.category === "Gloves" ? 90 : 0) +
        (it.rarity === "Covert" ? 50 : 0) +
        (it.rarity === "Classified" ? 30 : 0) +
        (it.stattrak ? 10 : 0);
      return score(b) - score(a);
    });
    const toFetch = priority.slice(0, maxPriceFetch);

    // Sequential to respect rate limits
    for (const it of toFetch) {
      if (!it.marketable) continue;
      const p = await fetchMarketPrice(it.marketHashName, currency);
      if (p) it.price = p;
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  // Group into categories with totals
  const categories = {};
  let totalEstimatedValue = 0;
  for (const it of items) {
    if (!categories[it.category]) {
      categories[it.category] = { items: [], totalValue: 0, count: 0 };
    }
    categories[it.category].items.push(it);
    categories[it.category].count++;
    if (it.price?.lowestPrice) {
      categories[it.category].totalValue += it.price.lowestPrice;
      totalEstimatedValue += it.price.lowestPrice;
    }
  }

  // Sort each category: knives/gloves by price desc, others by rarity rank
  const RARITY_RANK = {
    "Contraband": 8, "Covert": 7, "Classified": 6, "Restricted": 5,
    "Mil-Spec Grade": 4, "Industrial Grade": 3, "Consumer Grade": 2,
    "Extraordinary": 9, "★": 10,
  };
  for (const cat of Object.keys(categories)) {
    categories[cat].items.sort((a, b) => {
      const pa = a.price?.lowestPrice || 0;
      const pb = b.price?.lowestPrice || 0;
      if (pb !== pa) return pb - pa;
      return (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0);
    });
  }

  // Pick "best skin per weapon" (a loadout proxy since Valve hides the real loadout)
  const bestPerWeapon = {};
  for (const it of items) {
    if (!["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(it.category)) continue;
    const key = it.weapon;
    const score = (x) => (x.price?.lowestPrice || 0) + (RARITY_RANK[x.rarity] || 0) * 0.5;
    if (!bestPerWeapon[key] || score(it) > score(bestPerWeapon[key])) {
      bestPerWeapon[key] = it;
    }
  }

  res.setHeader("Cache-Control", "private, max-age=300"); // 5 min cache
  res.json({
    totalItems: items.length,
    totalEstimatedValue: +totalEstimatedValue.toFixed(2),
    pricesIncluded: fetchPrices,
    pricedCount: items.filter((i) => i.price).length,
    currency,
    categories,
    bestPerWeapon,
  });
}

function invErrorMessage(code) {
  switch (code) {
    case "private_inventory":
      return "Your Steam inventory is set to private. Open Steam → Profile → Privacy Settings → set 'Inventory' to PUBLIC.";
    case "rate_limited":
      return "Steam is rate-limiting inventory requests. Try again in a minute.";
    case "empty_inventory":
      return "No CS2 inventory found for this account.";
    default:
      return `Steam returned an error (${code}). Try again later.`;
  }
}
