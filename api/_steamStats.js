import { SUPPORTED_MAPS } from './_mapPool.js';

// Shared Steam lifetime-stat transform used by authenticated and public
//profile endpoints. Keeping the weapon/map logic in one place prevents the
// two API responses from drifting.

export const STEAM_WEAPONS = [
     ["ak47", "AK-47"],
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
];

export function transformSteamStats(rawStats) {
    if (!rawStats) return null;
    const map = {};
    for (const s of rawStats) map[s.name] = s.value;

    const totalKills = map.total_kills || 0;
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
  };
}