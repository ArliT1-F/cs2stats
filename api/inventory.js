// Fetches the logged-in user's CS2 inventory from Steam Community + bulk prices
// from the cached price database.
//
// IMPORTANT NOTES on the Steam Community inventory endpoint:
//   - Endpoint: https://steamcommunity.com/inventory/{steamid}/730/2
//   - `count` param: 2000 max, but Steam often returns far fewer per page
//     (sometimes ~75 even when you ask for 2000). Don't trust the page size.
//   - Pagination: `more_items: 1` + `last_assetid` in the response means
//     more pages exist. Pass `last_assetid` as `start_assetid` to get the next.
//   - `total_inventory_count` tells you the real total — use it to verify
//     completeness and as a stopping condition.
//   - Rate limit: roughly 5–10 requests per minute per IP. Heavily enforced.
//
// IMPORTANT NOTES on item categorization:
//   - Steam tags use the prefix `CSGO_Type_*`, not `Type_*` (common mistake).
//   - Item type internal_names: CSGO_Type_Pistol, CSGO_Type_Rifle, CSGO_Type_SMG,
//     CSGO_Type_SniperRifle, CSGO_Type_Shotgun, CSGO_Type_Machinegun,
//     CSGO_Type_Knife, CSGO_Type_Hands (gloves), CSGO_Type_WeaponCase,
//     CSGO_Type_Collectible, CSGO_Type_Sticker, CSGO_Type_Spray, etc.

import { getPricesBulk, getCacheStatus } from "./_priceCache.js";

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

// --- Steam inventory fetch (with proper pagination) ----------------------
async function fetchInventory(steamId) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
    "X-Requested-With": "XMLHttpRequest",
  };

  // Steam caps `count` at 2000 for the inventory endpoint, but in practice
  // returns fewer items per response (sometimes ~75 even with count=2000).
  // We always request the max and rely on `more_items` + `last_assetid` for
  // pagination, with `total_inventory_count` as a sanity check.
  const PER_PAGE = 2000;
  const MAX_PAGES = 30; // safety cap; most inventories <30k items
  const SOFT_DELAY_MS = 1500; // generous between pages to avoid 429
  const RETRY_DELAY_MS = 5000;

  const assets = [];
  const descMap = new Map();
  const seenAssetIds = new Set();
  const diagnostics = {
    totalInventoryCount: null,
    pagesFetched: 0,
    pagesAttempted: 0,
    httpStatuses: [],
    rateLimitHits: 0,
    consecutiveRetries: 0,
    perPageCounts: [],
    duplicatesSkipped: 0,
    lastError: null,
    stoppedReason: null,
  };

  let lastAssetId = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    diagnostics.pagesAttempted++;
    const params = new URLSearchParams({ l: "english", count: String(PER_PAGE) });
    if (lastAssetId) params.set("start_assetid", lastAssetId);

    const url = `https://steamcommunity.com/inventory/${steamId}/730/2?${params}`;
    let r;
    try {
      r = await fetch(url, { headers });
    } catch (e) {
      diagnostics.lastError = String(e);
      diagnostics.stoppedReason = "fetch_error";
      break;
    }
    diagnostics.httpStatuses.push(r.status);

    if (r.status === 403) {
      return { error: "private_inventory", diagnostics };
    }
    if (r.status === 429) {
      diagnostics.rateLimitHits++;
      // Retry once after a longer wait — Steam often unblocks quickly
      if (diagnostics.consecutiveRetries < 1) {
        diagnostics.consecutiveRetries++;
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        page--; // retry same page
        continue;
      }
      // Give up but keep what we have
      if (assets.length === 0) return { error: "rate_limited", diagnostics };
      diagnostics.stoppedReason = "rate_limited";
      break;
    }
    diagnostics.consecutiveRetries = 0;

    if (!r.ok) {
      if (assets.length === 0) return { error: `inventory_${r.status}`, diagnostics };
      diagnostics.stoppedReason = `http_${r.status}`;
      break;
    }

    let j;
    try { j = await r.json(); } catch (e) {
      diagnostics.lastError = `parse: ${e}`;
      diagnostics.stoppedReason = "parse_error";
      break;
    }
    if (!j || j.success === false) {
      if (assets.length === 0) return { error: "empty_inventory", diagnostics };
      diagnostics.stoppedReason = "success_false";
      break;
    }

    if (typeof j.total_inventory_count === "number") {
      diagnostics.totalInventoryCount = j.total_inventory_count;
    }

    // Collect assets, dedupe by asset id (defensive — Steam rarely duplicates
    // but we've seen it on retries).
    let pageAssetCount = 0;
    if (Array.isArray(j.assets)) {
      for (const a of j.assets) {
        if (seenAssetIds.has(a.assetid)) {
          diagnostics.duplicatesSkipped++;
          continue;
        }
        seenAssetIds.add(a.assetid);
        assets.push(a);
        pageAssetCount++;
      }
    }
    if (Array.isArray(j.descriptions)) {
      for (const d of j.descriptions) {
        descMap.set(`${d.classid}_${d.instanceid}`, d);
      }
    }
    diagnostics.pagesFetched++;
    diagnostics.perPageCounts.push(pageAssetCount);

    // Decide whether to continue pagination
    const hasMore = j.more_items === 1 || j.more_items === true;
    const haveAll = diagnostics.totalInventoryCount !== null
      && assets.length >= diagnostics.totalInventoryCount;
    const noProgress = pageAssetCount === 0; // safety: if Steam stopped giving items

    if (haveAll) {
      diagnostics.stoppedReason = "complete";
      break;
    }
    if (!hasMore && !noProgress) {
      diagnostics.stoppedReason = "no_more_items_flag";
      break;
    }
    if (noProgress && !hasMore) {
      diagnostics.stoppedReason = "no_progress";
      break;
    }
    if (!j.last_assetid) {
      diagnostics.stoppedReason = "no_last_assetid";
      break;
    }
    if (j.last_assetid === lastAssetId) {
      // Same cursor as before — would loop forever. Stop.
      diagnostics.stoppedReason = "cursor_unchanged";
      break;
    }
    lastAssetId = j.last_assetid;

    // Generous delay between pages to avoid the 429 cliff
    await new Promise((res) => setTimeout(res, SOFT_DELAY_MS));
  }

  if (assets.length === 0) {
    return { error: "empty_inventory", diagnostics };
  }
  // Partial = we have items but didn't reach total_inventory_count
  const partial = diagnostics.totalInventoryCount !== null
    && assets.length < diagnostics.totalInventoryCount;
  return {
    data: { assets, descriptions: Array.from(descMap.values()) },
    partial,
    diagnostics,
  };
}

// --- Item categorization ------------------------------------------------
// PRIMARY signal: Steam's `tags` array. Internal names use `CSGO_Type_*` prefix.
// SECONDARY signal: market_hash_name pattern matching as a fallback.

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

  // PRIMARY: Steam's Type tag — most reliable, language-independent
  const typeTag = tags.find((t) => t.category === "Type")?.internal_name || "";
  switch (typeTag) {
    case "CSGO_Type_Pistol":      return "Pistol";
    case "CSGO_Type_SMG":         return "SMG";
    case "CSGO_Type_Rifle":       return "Rifle";
    case "CSGO_Type_SniperRifle": return "Sniper";
    case "CSGO_Type_Shotgun":     return "Heavy";   // Nova, XM1014, Sawed-Off, MAG-7
    case "CSGO_Type_Machinegun":  return "Heavy";   // M249, Negev
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

  // Knife shortcut: Steam prefixes ALL knife skins with ★
  if (name.startsWith("★")) return "Knife";

  // SECONDARY: Weapon tag → category mapping
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

  // TERTIARY: pure name-pattern matching
  for (const [cat, weapons] of Object.entries(NAME_PATTERNS)) {
    for (const w of weapons) if (name.includes(w)) return cat;
  }

  return "Other";
}

function extractWeaponName(marketHashName) {
  // "AK-47 | Asiimov (Field-Tested)" → "AK-47"
  // "★ StatTrak™ Karambit | Fade (FN)" → "Karambit"
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
  "AK-47": "ak47",
  "M4A4": "m4a1",
  "M4A1-S": "m4a1_silencer",
  "AWP": "awp",
  "AUG": "aug",
  "SG 553": "sg556",
  "FAMAS": "famas",
  "Galil AR": "galilar",
  "SSG 08": "ssg08",
  "SCAR-20": "scar20",
  "G3SG1": "g3sg1",
  "Desert Eagle": "deagle",
  "Glock-18": "glock",
  "USP-S": "usp_silencer",
  "P2000": "hkp2000",
  "P250": "p250",
  "Five-SeveN": "fiveseven",
  "Tec-9": "tec9",
  "CZ75-Auto": "cz75a",
  "R8 Revolver": "revolver",
  "Dual Berettas": "elite",
  "MP9": "mp9",
  "MP7": "mp7",
  "MP5-SD": "mp5sd",
  "UMP-45": "ump45",
  "P90": "p90",
  "PP-Bizon": "bizon",
  "MAC-10": "mac10",
  "Nova": "nova",
  "XM1014": "xm1014",
  "Sawed-Off": "sawedoff",
  "MAG-7": "mag7",
  "M249": "m249",
  "Negev": "negev",
  "Zeus x27": "taser",
};

// --- Main handler ----------------------------------------------------------
export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const steamId = cookies.steamid;
  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const priceSource = url.searchParams.get("source") || "buff163";
  const debug = url.searchParams.get("debug") === "1";

  const inv = await fetchInventory(steamId);
  if (inv.error) {
    return res.status(200).json({
      error: inv.error,
      message: invErrorMessage(inv.error),
      diagnostics: inv.diagnostics,
      categories: {},
    });
  }

  const data = inv.data;
  const assets = data.assets || [];
  const descriptions = data.descriptions || [];

  const descMap = {};
  for (const d of descriptions) {
    descMap[`${d.classid}_${d.instanceid}`] = d;
  }

  const items = [];
  const skipReasons = { no_description: 0 };
  const categoryCounts = {};

  for (const a of assets) {
    const desc = descMap[`${a.classid}_${a.instanceid}`];
    if (!desc) {
      skipReasons.no_description++;
      continue;
    }
    const cat = categorize(desc);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    const weaponName = extractWeaponName(desc.market_hash_name || "");

    items.push({
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
      category: cat,
      tradable: desc.tradable === 1,
      marketable: desc.marketable === 1,
      price: null,
    });
  }

  // BULK price lookup
  const allHashes = items.map((i) => i.marketHashName).filter(Boolean);
  const uniqueHashes = Array.from(new Set(allHashes));
  const prices = await getPricesBulk(uniqueHashes, priceSource);
  for (const it of items) {
    if (prices[it.marketHashName]) it.price = prices[it.marketHashName];
  }

  // Group by category
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
    categories[cat].totalValue = +categories[cat].totalValue.toFixed(2);
  }

  // Best skin per weapon (loadout proxy)
  const bestPerWeapon = {};
  for (const it of items) {
    if (!["Rifle","Sniper","Pistol","SMG","Heavy","Knife","Gloves"].includes(it.category)) continue;
    const key = it.weapon;
    const score = (x) => (x.price?.lowestPrice || 0) + (RARITY_RANK[x.rarity] || 0) * 0.5;
    if (!bestPerWeapon[key] || score(it) > score(bestPerWeapon[key])) {
      bestPerWeapon[key] = it;
    }
  }

  res.setHeader("Cache-Control", "private, max-age=300");
  const payload = {
    totalItems: items.length,
    totalInventoryCount: inv.diagnostics.totalInventoryCount,
    totalEstimatedValue: +totalEstimatedValue.toFixed(2),
    pricedCount: items.filter((i) => i.price).length,
    pricesIncluded: true,
    priceSource,
    currency: 1,
    partial: !!inv.partial,
    categories,
    bestPerWeapon,
  };
  if (debug) {
    payload.debug = {
      inventory: inv.diagnostics,
      skipReasons,
      categoryCounts,
      priceCache: getCacheStatus(),
      uniqueHashesQueried: uniqueHashes.length,
      pricesFound: Object.keys(prices).length,
      // Top 10 most-recent items for sanity-check
      sampleItems: items.slice(0, 10).map((i) => ({
        name: i.marketHashName,
        category: i.category,
        weapon: i.weapon,
        rarity: i.rarity,
        hasPrice: !!i.price,
      })),
    };
  }
  res.json(payload);
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
