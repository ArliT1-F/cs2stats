// Fetches the logged-in user's CS2 inventory from Steam Community + bulk prices
// from the cached BUFF163 price database.
//
// IMPORTANT NOTES:
//   - Valve does NOT expose "currently equipped loadout" via any public API.
//     We show all skins grouped by weapon category and highlight the most
//     valuable per slot as a sensible loadout proxy.
//   - Steam paginates inventories. We loop with start_assetid until done.
//   - Prices come from a bulk JSON dump (csgotrader.app's BUFF163 mirror)
//     cached in memory for 30 minutes. Far faster + more complete than calling
//     Steam Market priceoverview per item.

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

// --- Steam inventory fetch (with pagination) ------------------------------
// Returns { data: { assets, descriptions }, partial: bool, pagesFetched, ... }
async function fetchInventory(steamId) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: `https://steamcommunity.com/profiles/${steamId}/inventory/`,
  };

  const PER_PAGE = 1000;
  const MAX_PAGES = 8; // up to 8000 items
  const assets = [];
  const descMap = new Map();
  const diagnostics = {
    pagesFetched: 0,
    pagesAttempted: 0,
    httpStatuses: [],
    rateLimitHits: 0,
    lastError: null,
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
      break;
    }
    diagnostics.httpStatuses.push(r.status);

    if (r.status === 403) {
      return { error: "private_inventory", diagnostics };
    }
    if (r.status === 429) {
      diagnostics.rateLimitHits++;
      // If we already have items, return them as partial; otherwise hard fail
      if (assets.length === 0) return { error: "rate_limited", diagnostics };
      break;
    }
    if (!r.ok) {
      if (assets.length === 0) return { error: `inventory_${r.status}`, diagnostics };
      break;
    }

    let j;
    try { j = await r.json(); } catch (e) {
      diagnostics.lastError = `parse: ${e}`;
      break;
    }
    if (!j || j.success === false) {
      if (assets.length === 0) return { error: "empty_inventory", diagnostics };
      break;
    }

    if (Array.isArray(j.assets)) {
      for (const a of j.assets) assets.push(a);
    }
    if (Array.isArray(j.descriptions)) {
      for (const d of j.descriptions) {
        descMap.set(`${d.classid}_${d.instanceid}`, d);
      }
    }
    diagnostics.pagesFetched++;

    // Stop if no more pages
    if (!j.more_items || !j.last_assetid || j.last_assetid === lastAssetId) break;
    lastAssetId = j.last_assetid;
    // Brief delay between pages
    await new Promise((r) => setTimeout(r, 300));
  }

  if (assets.length === 0) {
    return { error: "empty_inventory", diagnostics };
  }
  return {
    data: { assets, descriptions: Array.from(descMap.values()) },
    partial: diagnostics.rateLimitHits > 0 || diagnostics.lastError !== null,
    diagnostics,
  };
}

// --- Item categorization (CS2 weapon families) ---------------------------
// We detect categories from BOTH the `tags` array (most reliable) AND the
// market_hash_name as a fallback.

const NAME_PATTERNS = {
  Rifle: ["AK-47","M4A4","M4A1-S","AUG","SG 553","FAMAS","Galil AR"],
  Sniper: ["AWP","SSG 08","SCAR-20","G3SG1"],
  Pistol: ["Desert Eagle","USP-S","Glock-18","P2000","P250","Five-SeveN","CZ75-Auto","Tec-9","Dual Berettas","R8 Revolver"],
  SMG: ["MP9","MP7","MP5-SD","UMP-45","P90","PP-Bizon","MAC-10"],
  Heavy: ["Nova","XM1014","Sawed-Off","MAG-7","M249","Negev"],
};

function categorize(item) {
  const name = item.market_hash_name || item.name || "";
  const type = (item.type || "").toLowerCase();
  const tags = item.tags || [];

  // Detect category from tags first (most reliable across languages)
  const typeTag = tags.find((t) => t.category === "Type")?.internal_name || "";
  const weaponTag = tags.find((t) => t.category === "Weapon")?.internal_name || "";

  if (typeTag === "Type_Hands" || type.includes("gloves") || type.includes("hand wraps")) return "Gloves";
  if (typeTag === "Type_Knife" || type.includes("knife") || name.startsWith("★")) return "Knife";
  if (typeTag === "Type_CustomPlayer" || type.includes("agent")) return "Agent";
  if (typeTag === "Type_WeaponCase" || type.includes("case")) return "Case";
  if (typeTag === "Type_Sticker" || type.includes("sticker")) return "Sticker";
  if (typeTag === "Type_Spray" || type.includes("graffiti")) return "Graffiti";
  if (typeTag === "Type_MusicKit" || type.includes("music kit")) return "Music Kit";
  if (typeTag === "Type_Patch" || type.includes("patch")) return "Patch";
  if (typeTag === "Type_Tool" || type.includes("key") || type.includes("tool") || type.includes("pass")) return "Tool";
  if (typeTag === "Type_Pin" || type.includes("collectible") || type.includes("pin") || type.includes("coin")) return "Collectible";
  if (typeTag === "Type_Charm" || type.includes("charm") || type.includes("keychain")) return "Charm";

  // Use weapon tag if present
  if (weaponTag) {
    const w = weaponTag.replace(/^weapon_/, "");
    if (["ak47","m4a1","m4a1_silencer","aug","sg556","famas","galilar"].includes(w)) return "Rifle";
    if (["awp","ssg08","scar20","g3sg1"].includes(w)) return "Sniper";
    if (["deagle","glock","hkp2000","usp_silencer","p250","fiveseven","tec9","cz75a","revolver","elite"].includes(w)) return "Pistol";
    if (["mp9","mp7","mp5sd","ump45","p90","bizon","mac10"].includes(w)) return "SMG";
    if (["nova","xm1014","sawedoff","mag7","m249","negev"].includes(w)) return "Heavy";
  }

  // Fall back to name-pattern matching
  for (const [cat, weapons] of Object.entries(NAME_PATTERNS)) {
    for (const w of weapons) {
      if (name.includes(w)) return cat;
    }
  }
  return "Other";
}

function extractWeaponName(marketHashName) {
  // "AK-47 | Asiimov (Field-Tested)" → "AK-47"
  // "★ Karambit | Doppler (Factory New)" → "Karambit"
  // "★ StatTrak™ Karambit | Fade" → "Karambit"
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

// --- Internal weapon-key lookup from market_hash_name ---------------------
// Maps a display name like "AK-47" → "ak47", "M4A1-S" → "m4a1_silencer"
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
  const priceSource = url.searchParams.get("source") || "buff163"; // buff163 | steam
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

  // Build items. Don't filter anything that has a description — let users see
  // their full inventory.
  const items = [];
  const skipReasons = { no_description: 0 };

  for (const a of assets) {
    const desc = descMap[`${a.classid}_${a.instanceid}`];
    if (!desc) {
      skipReasons.no_description++;
      continue;
    }
    const cat = categorize(desc);
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

  // BULK price lookup — single in-memory map lookup per item
  const allHashes = items
    .filter((i) => i.marketable)
    .map((i) => i.marketHashName)
    .filter(Boolean);
  const uniqueHashes = Array.from(new Set(allHashes));
  const prices = await getPricesBulk(uniqueHashes, priceSource);
  for (const it of items) {
    if (prices[it.marketHashName]) it.price = prices[it.marketHashName];
  }

  // Group into categories
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

  // Pick highest-value skin per weapon (loadout proxy)
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
      priceCache: getCacheStatus(),
      uniqueHashesQueried: uniqueHashes.length,
      pricesFound: Object.keys(prices).length,
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
