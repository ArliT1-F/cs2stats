<<<<<<< HEAD
import { SUPPORTED_MAPS } from './_mapPool.js';

// Shared Steam lifetime-stat transform used by authenticated and public
//profile endpoints. Keeping the weapon/map logic in one place prevents the
// two API responses from drifting.

export const STEAM_WEAPONS = [
     ["ak47", "AK-47"],
=======
// Shared Steam CS2 stats transformation — single source of truth for
// /api/me, /api/me-basic, and /api/profile/[steamid].

import { SUPPORTED_MAPS } from "./_mapPool.js";

/** @typedef {{ name: string, key: string, kills: number, shots: number, hits: number, pctOfKills?: number, noAccuracy?: boolean }} WeaponStat */

/**
 * [steam_stat_key, display_name]
 * `m4a1` = M4A4 in Valve's legacy schema; M4A1-S uses `m4a1_silencer`.
 */
export const WEAPON_DEFINITIONS = [
  ["ak47", "AK-47"],
>>>>>>> 5712691 (feat: enhance dashboard and stats components with new features and UI improvements)
  ["m4a1", "M4A4"],
  ["m4a1_silencer", "M4A1-S"],
  ["awp", "AWP"],
  ["glock", "Glock-18"],
  ["hkp2000", "P2000"],
  ["usp_silencer", "USP-S"],
  ["deagle", "Desert Eagle"],
  ["p250", "P250"],
  ["fiveseven", "Five-SeveN"],
  ["elite", "Dual Berettas"],
  ["tec9", "Tec-9"],
  ["cz75a", "CZ75-Auto"],
  ["revolver", "R8 Revolver"],
  ["famas", "FAMAS"],
  ["galilar", "Galil AR"],
  ["sg556", "SG 553"],
  ["aug", "AUG"],
  ["ssg08", "SSG 08"],
  ["scar20", "SCAR-20"],
  ["g3sg1", "G3SG1"],
  ["mp9", "MP9"],
  ["mp7", "MP7"],
  ["mp5sd", "MP5-SD"],
  ["ump45", "UMP-45"],
  ["mac10", "MAC-10"],
  ["p90", "P90"],
  ["bizon", "PP-Bizon"],
  ["nova", "Nova"],
  ["xm1014", "XM1014"],
  ["sawedoff", "Sawed-Off"],
  ["mag7", "MAG-7"],
  ["negev", "Negev"],
  ["m249", "M249"],
  ["knife", "Knife"],
  ["taser", "Zeus x27"],
  ["hegrenade", "HE Grenade"],
  ["molotov", "Molotov"],
<<<<<<< HEAD
];

export function transformSteamStats(rawStats) {
    if (!rawStats) return null;
    const map = {};
    for (const s of rawStats) map[s.name] = s.value;

    const totalKills = map.total_kills || 0;
=======
  ["flashbang", "Flashbang"],
  ["smokegrenade", "Smoke"],
  ["incgrenade", "Incendiary"],
  ["decoy", "Decoy"],
];

const NO_ACCURACY_KEYS = new Set([
  "knife",
  "taser",
  "hegrenade",
  "molotov",
  "flashbang",
  "smokegrenade",
  "incgrenade",
  "decoy",
]);

const KNIFE_STAT_PREFIX = "total_kills_knife";

/**
 * Resolve lifetime knife kills without double-counting aggregate + per-skin keys.
 * Excludes knife-fight / wingman-only keys (e.g. total_kills_knife_fight).
 */
export function resolveKnifeKills(map, totalKills = 0) {
  const canonical = map.total_kills_knife ?? 0;

  const skinKeys = Object.keys(map).filter(
    (k) =>
      k.startsWith(`${KNIFE_STAT_PREFIX}_`) &&
      k !== "total_kills_knife_fight" &&
      !k.includes("_fight")
  );
  const skinSum = skinKeys.reduce((s, k) => s + (map[k] || 0), 0);

  let kills = 0;
  let source = "none";

  if (canonical > 0 && skinSum > 0) {
    // Parent stat should be >= sum of children; if not, trust the smaller believable total.
    if (canonical >= skinSum) {
      kills = canonical;
      source = "total_kills_knife";
    } else {
      kills = skinSum;
      source = "knife_skins_sum";
    }
  } else if (canonical > 0) {
    kills = canonical;
    source = "total_kills_knife";
  } else if (skinSum > 0) {
    kills = skinSum;
    source = "knife_skins_sum";
  }

  // Valve occasionally returns knife > total_kills when stats are stale — cap to lifetime kills.
  if (totalKills > 0 && kills > totalKills) {
    kills = skinSum > 0 && skinSum <= totalKills ? skinSum : Math.min(kills, totalKills);
    source += "_capped";
  }

  return { kills, source, skinKeys };
}

function buildWeapons(map, totalKills) {
  const knife = resolveKnifeKills(map, totalKills);

  const weapons = WEAPON_DEFINITIONS.map(([key, displayName]) => {
    let kills = map[`total_kills_${key}`] || 0;
    if (key === "knife") kills = knife.kills;

    return {
      name: displayName,
      key,
      kills,
      shots: map[`total_shots_${key}`] || 0,
      hits: map[`total_hits_${key}`] || 0,
      noAccuracy: NO_ACCURACY_KEYS.has(key),
    };
  }).filter((w) => w.kills > 0);

  // Optional: knife-fight as separate row when present (not merged into Knife).
  const knifeFight = map.total_kills_knife_fight || 0;
  if (knifeFight > 0) {
    weapons.push({
      name: "Knife Fight",
      key: "knife_fight",
      kills: knifeFight,
      shots: 0,
      hits: 0,
      noAccuracy: true,
    });
  }

  const weaponKillsSum = weapons.reduce((s, w) => s + w.kills, 0);

  const enriched = weapons
    .map((w) => ({
      ...w,
      pctOfKills: totalKills > 0 ? +((w.kills / totalKills) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.kills - a.kills);

  return {
    weapons: enriched,
    meta: {
      weaponKillsSum,
      totalKills,
      knifeSource: knife.source,
      knifeKills: knife.kills,
      // Per-weapon kills can exceed total_kills (environment, unknown weapons) but not by huge margins.
      weaponSumRatio: totalKills > 0 ? +(weaponKillsSum / totalKills).toFixed(3) : null,
    },
  };
}

/**
 * @param {{ name: string, value: number }[]} rawStats
 */
export function transformSteamStats(rawStats) {
  if (!rawStats) return null;
  const map = {};
  for (const s of rawStats) map[s.name] = s.value;

  const totalKills = map.total_kills || 0;
>>>>>>> 5712691 (feat: enhance dashboard and stats components with new features and UI improvements)
  const totalDeaths = map.total_deaths || 0;
  const totalShots = map.total_shots_fired || 0;
  const totalHits = map.total_shots_hit || 0;
  const headshots = map.total_kills_headshot || 0;
  const wins = map.total_wins || 0;
  const rounds = map.total_rounds_played || 0;
  const mvps = map.total_mvps || 0;
  const timePlayed = map.total_time_played || 0;
  const moneyEarned = map.total_money_earned || 0;
  const planted = map.total_planted_bombs || 0;
  const defused = map.total_defused_bombs || 0;

<<<<<<< HEAD
  // If everything is zero, the account never played CS2.
  if (totalKills === 0 && totalDeaths === 0 && rounds === 0) return null;

  const weapons = STEAM_WEAPONS
    .map(([key, displayName]) => ({
      name: displayName,
      key,
      kills: map[`total_kills_${key}`] || 0,
      shots: map[`total_shots_${key}`] || 0,
      hits: map[`total_hits_${key}`] || 0,
    }))
    .filter((w) => w.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  // Only include maps from the current CS2 Active Duty + Reserve pool.
  const maps = SUPPORTED_MAPS
    .map((m) => ({
      name: m.name,
      pool: m.pool,
      wins: map[`total_wins_map_${m.id}`] || 0,
      rounds: map[`total_rounds_map_${m.id}`] || 0,
    }))
=======
  if (totalKills === 0 && totalDeaths === 0 && rounds === 0) return null;

  const { weapons, meta } = buildWeapons(map, totalKills);

  const maps = SUPPORTED_MAPS.map((m) => ({
    name: m.name,
    pool: m.pool,
    wins: map[`total_wins_map_${m.id}`] || 0,
    rounds: map[`total_rounds_map_${m.id}`] || 0,
  }))
>>>>>>> 5712691 (feat: enhance dashboard and stats components with new features and UI improvements)
    .filter((m) => m.rounds > 0)
    .map((m) => ({ ...m, winRate: m.rounds ? (m.wins / m.rounds) * 100 : 0 }))
    .sort((a, b) => b.rounds - a.rounds);

  return {
    overview: {
      kills: totalKills,
      deaths: totalDeaths,
      kd: totalDeaths ? +(totalKills / totalDeaths).toFixed(2) : totalKills,
      accuracy: totalShots ? +((totalHits / totalShots) * 100).toFixed(2) : 0,
      headshotPct: totalKills ? +((headshots / totalKills) * 100).toFixed(2) : 0,
      wins,
      rounds,
      winRate: rounds ? +((wins / rounds) * 100).toFixed(2) : 0,
      mvps,
      hoursPlayed: +(timePlayed / 3600).toFixed(1),
      moneyEarned,
      bombsPlanted: planted,
      bombsDefused: defused,
    },
    weapons,
    maps,
<<<<<<< HEAD
  };
}
=======
    meta,
  };
}

/** Audit helper for /api/debug */
export function auditWeaponStats(rawStats) {
  const map = {};
  for (const s of rawStats || []) map[s.name] = s.value;
  const totalKills = map.total_kills || 0;
  const knife = resolveKnifeKills(map, totalKills);
  const { weapons, meta } = buildWeapons(map, totalKills);
  const knifeRelated = Object.entries(map)
    .filter(([k]) => k.includes("knife"))
    .map(([name, value]) => ({ name, value }));
  return { totalKills, knife, knifeRelated, meta, topWeapons: weapons.slice(0, 5) };
}
>>>>>>> 5712691 (feat: enhance dashboard and stats components with new features and UI improvements)
