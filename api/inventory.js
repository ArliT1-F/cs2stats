// Steam CS2 inventory fetcher.
//
// SINGLE-PAGE MODE (recommended): the client paginates by calling this endpoint
// repeatedly with ?cursor=<assetid>. Each call does ONE Steam request and
// returns ONE page. Avoids Vercel function timeouts entirely.
//
//   GET /api/inventory                           → first page + categorized
//   GET /api/inventory?cursor=<lastAssetId>      → next page
//   Response: { assets, descriptions (raw), totalInventoryCount, more, nextCursor, ... }
//
// FULL MODE (legacy): if the client passes ?full=1, we paginate server-side
// like before, with an internal time budget that respects the function limit.
//
// CATEGORIZATION + PRICING happen client-side in single-page mode (so each
// response is small and fast). In full mode they happen server-side.

import { getPricesBulk, getCacheStatus } from "./_priceCache.js";
import { getAuthenticatedSteamId } from "./_auth.js";

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "X-Requested-With": "XMLHttpRequest",
};

// --- Single Steam page fetch ---------------------------------------------
// Includes automatic retry-with-backoff for soft Steam failures:
//   - 429 (rate limit): retry up to 2x with exponential backoff
//   - 200 with empty `assets` despite total_inventory_count > 0:
//     Steam sometimes ships a degraded response. Retry once.
//
// IMPORTANT: `count` is capped at 2000 in practice. Steam's docs say 5000 is
// the max, but since late 2022 the actual server-side limit is 2000 — anything
// larger returns HTTP 400. Using 2000 is the well-known safe value (used by
// node-steamcommunity, steam-inventory-api, and most third-party libs).
async function fetchOnePage(steamId, startAssetId, count = 2000) {
  const params = new URLSearchParams({ l: "english", count: String(count) });
  if (startAssetId) params.set("start_assetid", startAssetId);

  const url = `https://steamcommunity.com/inventory/${steamId}/730/2?${params}`;
  const headers = {
    ...COMMON_HEADERS,
    Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
  };

  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 2s, 4s
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }

    let r;
    try { r = await fetch(url, { headers }); }
    catch (e) { lastError = { error: "fetch_error", detail: String(e) }; continue; }

    if (r.status === 403) return { error: "private_inventory", status: 403 };
    if (r.status === 429) {
      lastError = { error: "rate_limited", status: 429 };
      continue; // retry with backoff
    }
    if (!r.ok) {
      lastError = { error: `http_${r.status}`, status: r.status };
      // Retry on 5xx; give up on other 4xx
      if (r.status >= 500) continue;
      return lastError;
    }

    let j;
    try { j = await r.json(); }
    catch (e) { lastError = { error: "parse_error", detail: String(e) }; continue; }

    if (!j || j.success === false) {
      lastError = { error: "steam_failure" };
      continue;
    }

    // Sanity check: if Steam claims items exist but didn't ship any, retry.
    // This is the "degraded empty response" we've observed when soft-rate-limited.
    const assetCount = Array.isArray(j.assets) ? j.assets.length : 0;
    if (assetCount === 0 && typeof j.total_inventory_count === "number" && j.total_inventory_count > 0 && !startAssetId) {
      lastError = { error: "degraded_response", totalInventoryCount: j.total_inventory_count };
      continue; // retry — Steam should give us the real data on the next attempt
    }

    return { data: j, attempt };
  }

  return lastError || { error: "unknown_failure" };
}

// --- Item categorization ------------------------------------------------
const NAME_PATTERNS = {
  Rifle:  ["AK-47","M4A4","M4A1-S","AUG","SG 553","FAMAS","Galil AR"],
  Sniper: ["AWP","SSG 08","SCAR-20","G3SG1"],
  Pistol: ["Desert Eagle","USP-S","Glock-18","P2000","P250","Five-SeveN","CZ75-Auto","Tec-9","Dual Berettas","R8 Revolver"],
  SMG:    ["MP9","MP7","MP5-SD","UMP-45","P90","PP-Bizon","MAC-10"],
  Heavy:  ["Nova","XM1014","Sawed-Off","MAG-7","M249","Negev"],
};

function categorize(item) {
  const name = item.market_hash_name || item.name || "";
  const tags = item.tags || [];

  const typeTag = tags.find((t) => t.category === "Type")?.internal_name || "";
  switch (typeTag) {
    case "CSGO_Type_Pistol":      return "Pistol";
    case "CSGO_Type_SMG":         return "SMG";
    case "CSGO_Type_Rifle":       return "Rifle";
    case "CSGO_Type_SniperRifle": return "Sniper";
    case "CSGO_Type_Shotgun":     return "Heavy";
    case "CSGO_Type_Machinegun":  return "Heavy";
    case "CSGO_Type_Knife":       return "Knife";
    case "CSGO_Type_Hands":       return "Gloves";
    case "CSGO_Type_WeaponCase":  return "Case";
    case "CSGO_Type_Sticker":     return "Sticker";
    case "CSGO_Type_Spray":       return "Graffiti";
    case "CSGO_Type_MusicKit":    return "Music Kit";
    case "CSGO_Type_Patch":       return "Patch";
    case "CSGO_Type_Tool":        return "Tool";
    case "CSGO_Type_Collectible": return "Collectible";
    case "CSGO_Type_CustomPlayer":return "Agent";
    case "CSGO_Type_Pin":         return "Collectible";
    case "CSGO_Type_Charm":       return "Charm";
    case "CSGO_Type_Keychain":    return "Charm";
  }

  if (name.startsWith("★")) return "Knife";

  const weaponTag = tags.find((t) => t.category === "Weapon")?.internal_name || "";
  if (weaponTag) {
    const w = weaponTag.replace(/^weapon_/, "");
    if (["ak47","m4a1","m4a1_silencer","aug","sg556","famas","galilar"].includes(w)) return "Rifle";
    if (["awp","ssg08","scar20","g3sg1"].includes(w)) return "Sniper";
    if (["deagle","glock","hkp2000","usp_silencer","p250","fiveseven","tec9","cz75a","revolver","elite"].includes(w)) return "Pistol";
    if (["mp9","mp7","mp5sd","ump45","p90","bizon","mac10"].includes(w)) return "SMG";
    if (["nova","xm1014","sawedoff","mag7","m249","negev"].includes(w)) return "Heavy";
    if (w.startsWith("knife")) return "Knife";
  }

  for (const [cat, weapons] of Object.entries(NAME_PATTERNS)) {
    for (const w of weapons) if (name.includes(w)) return cat;
  }
  return "Other";
}

function extractWeaponName(marketHashName) {
  const cleaned = marketHashName
    .replace(/^StatTrak™\s*/i, "")
    .replace(/^★\s*StatTrak™\s*/i, "")
    .replace(/^★\s*/, "")
    .replace(/^Souvenir\s*/i, "");
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

const WEAPON_NAME_TO_KEY = {
  "AK-47": "ak47", "M4A4": "m4a1", "M4A1-S": "m4a1_silencer", "AWP": "awp",
  "AUG": "aug", "SG 553": "sg556", "FAMAS": "famas", "Galil AR": "galilar",
  "SSG 08": "ssg08", "SCAR-20": "scar20", "G3SG1": "g3sg1",
  "Desert Eagle": "deagle", "Glock-18": "glock", "USP-S": "usp_silencer",
  "P2000": "hkp2000", "P250": "p250", "Five-SeveN": "fiveseven",
  "Tec-9": "tec9", "CZ75-Auto": "cz75a", "R8 Revolver": "revolver",
  "Dual Berettas": "elite", "MP9": "mp9", "MP7": "mp7", "MP5-SD": "mp5sd",
  "UMP-45": "ump45", "P90": "p90", "PP-Bizon": "bizon", "MAC-10": "mac10",
  "Nova": "nova", "XM1014": "xm1014", "Sawed-Off": "sawedoff", "MAG-7": "mag7",
  "M249": "m249", "Negev": "negev", "Zeus x27": "taser",
};

// Convert a Steam asset+description pair into our SkinItem shape
function toSkinItem(a, desc) {
  const weaponName = extractWeaponName(desc.market_hash_name || "");
  return {
    assetId: a.assetid,
    classId: a.classid,
    instanceId: a.instanceid,
    name: desc.name || desc.market_hash_name,
    marketHashName: desc.market_hash_name,
    weapon: weaponName,
    weaponKey: WEAPON_NAME_TO_KEY[weaponName] || null,
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
    category: categorize(desc),
    tradable: desc.tradable === 1,
    marketable: desc.marketable === 1,
    price: null,
  };
}

function buildItems(rawAssets, rawDescriptions) {
  // Steam's `descriptions` array deduplicates by classid+instanceid.
  // 3-tier matching strategy ensures no asset is ever silently dropped:
  //   1. Exact match on classid+instanceid (works for ~95% of items)
  //   2. Class-only match (catches items with unique paint seeds where
  //      asset.instanceid doesn't appear in descriptions array)
  //   3. Synthetic placeholder (for the rare case where Steam serves an
  //      asset whose classid isn't in the descriptions array at all)
  const descByPair = {};
  const descByClass = {};
  for (const d of rawDescriptions) {
    descByPair[`${d.classid}_${d.instanceid}`] = d;
    if (!(d.classid in descByClass)) descByClass[d.classid] = d;
  }

  const items = [];
  const orphanedAssets = [];
  let matchedExact = 0;
  let matchedByClass = 0;
  let synthesized = 0;

  for (const a of rawAssets) {
    let desc = descByPair[`${a.classid}_${a.instanceid}`];
    if (desc) {
      matchedExact++;
    } else {
      desc = descByClass[a.classid];
      if (desc) matchedByClass++;
    }
    if (!desc) {
      // Asset has no matching description in this response at all. Rather
      // than silently dropping it, synthesize a minimal placeholder so the
      // user at least sees that something is in their inventory.
      synthesized++;
      orphanedAssets.push({
        assetid: a.assetid,
        classid: a.classid,
        instanceid: a.instanceid,
      });
      desc = {
        classid: a.classid,
        instanceid: a.instanceid,
        name: `Unknown Item (classid ${a.classid})`,
        market_hash_name: `Unknown Item ${a.classid}`,
        type: "Unknown",
        tradable: 0,
        marketable: 0,
        tags: [],
        name_color: "94a3b8",
      };
    }
    items.push(toSkinItem(a, desc));
  }

  return {
    items,
    diagnostics: { matchedExact, matchedByClass, synthesized, orphanedAssets },
  };
}

const RARITY_RANK = {
  "Contraband": 8, "Covert": 7, "Classified": 6, "Restricted": 5,
  "Mil-Spec Grade": 4, "Industrial Grade": 3, "Consumer Grade": 2,
  "Extraordinary": 9, "★": 10,
};

function categorizeAndAttachPrices(items, prices) {
  const categories = {};
  let totalEstimatedValue = 0;
  for (const it of items) {
    if (prices[it.marketHashName]) it.price = prices[it.marketHashName];
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
  for (const cat of Object.keys(categories)) {
    categories[cat].items.sort((a, b) => {
      const pa = a.price?.lowestPrice || 0;
      const pb = b.price?.lowestPrice || 0;
      if (pb !== pa) return pb - pa;
      return (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0);
    });
    categories[cat].totalValue = +categories[cat].totalValue.toFixed(2);
  }
  return { categories, totalEstimatedValue };
}

function computeBestPerWeapon(items) {
  const bestPerWeapon = {};
  for (const it of items) {
    if (!["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(it.category)) continue;
    const score = (x) => (x.price?.lowestPrice || 0) + (RARITY_RANK[x.rarity] || 0) * 0.5;
    if (!bestPerWeapon[it.weapon] || score(it) > score(bestPerWeapon[it.weapon])) {
      bestPerWeapon[it.weapon] = it;
    }
  }
  return bestPerWeapon;
}

function invErrorMessage(code) {
  switch (code) {
    case "private_inventory":
      return "Your Steam inventory is set to private. Open Steam → Profile → Privacy Settings → set 'Inventory' to PUBLIC.";
    case "rate_limited":
      return "Steam is rate-limiting inventory requests. Try again in a minute.";
    case "empty_inventory":
    case "steam_failure":
      return "No CS2 inventory found for this account.";
    default:
      return `Steam returned an error (${code}). Try again later.`;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const steamId = getAuthenticatedSteamId(req);
  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const priceSource = url.searchParams.get("source") || "buff163";
  const cursor = url.searchParams.get("cursor") || null;
  const fullMode = url.searchParams.get("full") === "1";
  const debug = url.searchParams.get("debug") === "1";

  // ── SINGLE-PAGE MODE (default) ───────────────────────────────────────
  // Client calls this repeatedly with ?cursor= until more=false.
  if (!fullMode) {
    const page = await fetchOnePage(steamId, cursor);
    if (page.error) {
      return res.status(200).json({
        error: page.error,
        message: invErrorMessage(page.error),
        items: [],
        more: false,
        nextCursor: null,
      });
    }
    const j = page.data;
    const rawAssets = Array.isArray(j.assets) ? j.assets : [];
    const rawDescriptions = Array.isArray(j.descriptions) ? j.descriptions : [];
    const built = buildItems(rawAssets, rawDescriptions);
    const items = built.items;

    // Bulk-price just this page
    const hashes = Array.from(new Set(items.map((i) => i.marketHashName).filter(Boolean)));
    const prices = await getPricesBulk(hashes, priceSource);
    for (const it of items) {
      if (prices[it.marketHashName]) it.price = prices[it.marketHashName];
    }

    const more = j.more_items === 1 || j.more_items === true;
    const nextCursor = (more && j.last_assetid) ? j.last_assetid : null;

    res.setHeader("Cache-Control", "private, max-age=60");
    const payload = {
      items,
      pageItemCount: items.length,
      rawAssetCount: rawAssets.length,
      rawDescriptionCount: rawDescriptions.length,
      totalInventoryCount: typeof j.total_inventory_count === "number" ? j.total_inventory_count : null,
      more,
      nextCursor,
      priceSource,
    };
    if (debug) {
      payload.debug = built.diagnostics;
    }
    res.json(payload);
    return;
  }

  // ── FULL MODE (legacy: server paginates with time budget) ────────────
  // Used as fallback or for scripts that prefer a single response.
  const PER_PAGE = 2000; // Steam server-side cap; >2000 returns HTTP 400
  const MAX_PAGES = 12;
  const TIME_BUDGET_MS = 50_000; // leave headroom under the 60s function limit
  const startTs = Date.now();

  const allAssets = [];
  const allDescMap = new Map();
  const seen = new Set();
  let curCursor = cursor;
  let totalInv = null;
  let stoppedReason = "complete";
  const perPageCounts = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    if (Date.now() - startTs > TIME_BUDGET_MS) {
      stoppedReason = "time_budget";
      break;
    }
    const result = await fetchOnePage(steamId, curCursor, PER_PAGE);
    if (result.error) {
      if (result.error === "rate_limited" && allAssets.length > 0) {
        stoppedReason = "rate_limited";
        break;
      }
      if (allAssets.length === 0) {
        return res.status(200).json({
          error: result.error,
          message: invErrorMessage(result.error),
          categories: {},
        });
      }
      stoppedReason = result.error;
      break;
    }
    const j = result.data;
    if (typeof j.total_inventory_count === "number") totalInv = j.total_inventory_count;
    let pageCount = 0;
    if (Array.isArray(j.assets)) {
      for (const a of j.assets) {
        if (seen.has(a.assetid)) continue;
        seen.add(a.assetid);
        allAssets.push(a);
        pageCount++;
      }
    }
    if (Array.isArray(j.descriptions)) {
      for (const d of j.descriptions) {
        allDescMap.set(`${d.classid}_${d.instanceid}`, d);
      }
    }
    perPageCounts.push(pageCount);
    if (totalInv !== null && allAssets.length >= totalInv) {
      stoppedReason = "complete";
      break;
    }
    const more = j.more_items === 1 || j.more_items === true;
    if (!more || !j.last_assetid || j.last_assetid === curCursor || pageCount === 0) {
      stoppedReason = more ? "no_progress" : "no_more_items_flag";
      break;
    }
    curCursor = j.last_assetid;
    // Brief delay only if we have more pages to fetch
    await new Promise((r) => setTimeout(r, 200));
  }

  const builtFull = buildItems(allAssets, Array.from(allDescMap.values()));
  const items = builtFull.items;
  const hashes = Array.from(new Set(items.map((i) => i.marketHashName).filter(Boolean)));
  const prices = await getPricesBulk(hashes, priceSource);
  const { categories, totalEstimatedValue } = categorizeAndAttachPrices(items, prices);
  const bestPerWeapon = computeBestPerWeapon(items);

  res.setHeader("Cache-Control", "private, max-age=300");
  const payload = {
    totalItems: items.length,
    totalInventoryCount: totalInv,
    totalEstimatedValue: +totalEstimatedValue.toFixed(2),
    pricedCount: items.filter((i) => i.price).length,
    pricesIncluded: true,
    priceSource,
    currency: 1,
    partial: totalInv !== null && items.length < totalInv,
    categories,
    bestPerWeapon,
  };
  if (debug) {
    payload.debug = {
      stoppedReason,
      perPageCounts,
      elapsedMs: Date.now() - startTs,
      priceCache: getCacheStatus(),
    };
  }
  res.json(payload);
}
