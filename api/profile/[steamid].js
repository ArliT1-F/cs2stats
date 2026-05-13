// Public profile endpoint — anyone can view stats for any Steam user with a
// public profile, no authentication required. Powers /u/{steamid} routes,
// shareable links, and player comparison. Heavy in-memory caching since
// public profiles change slowly.

import { generateDemoStats } from "../_demoData.js";
import { SUPPORTED_MAPS } from "../_mapPool.js";

// 5-minute in-memory cache per warm Lambda
const profileCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchSteamProfile(steamId, key) {
  const r = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j?.response?.players?.[0] || null;
}

async function fetchCs2Stats(steamId, key) {
  const r = await fetch(
    `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${key}&steamid=${steamId}`
  );
  if (r.status === 403) return { error: "private_profile" };
  if (r.status === 400) return { error: "no_cs2_stats" };
  if (!r.ok) return { error: `steam_stats_${r.status}` };
  const j = await r.json();
  const stats = j?.playerstats?.stats;
  if (!stats || stats.length === 0) return { error: "empty_stats" };
  return { stats };
}

async function fetchFaceit(steamId, key) {
  try {
    const headers = { Authorization: `Bearer ${key}` };
    const r = await fetch(
      `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
      { headers }
    );
    if (!r.ok) return null;
    const player = await r.json();
    const statsResp = await fetch(
      `https://open.faceit.com/data/v4/players/${player.player_id}/stats/cs2`,
      { headers }
    );
    const stats = statsResp.ok ? await statsResp.json() : null;
    return { player, stats };
  } catch {
    return null;
  }
}

function transformSteamStats(rawStats) {
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
  if (totalKills === 0 && totalDeaths === 0 && rounds === 0) return null;

  const weaponNames = [
    ["ak47","AK-47"],["m4a1","M4A4"],["m4a1_silencer","M4A1-S"],["awp","AWP"],
    ["glock","Glock-18"],["hkp2000","P2000"],["usp_silencer","USP-S"],
    ["deagle","Desert Eagle"],["p250","P250"],["fiveseven","Five-SeveN"],
    ["elite","Dual Berettas"],["tec9","Tec-9"],["cz75a","CZ75-Auto"],
    ["revolver","R8 Revolver"],["famas","FAMAS"],["galilar","Galil AR"],
    ["sg556","SG 553"],["aug","AUG"],["ssg08","SSG 08"],["scar20","SCAR-20"],
    ["g3sg1","G3SG1"],["mp9","MP9"],["mp7","MP7"],["mp5sd","MP5-SD"],
    ["ump45","UMP-45"],["mac10","MAC-10"],["p90","P90"],["bizon","PP-Bizon"],
    ["nova","Nova"],["xm1014","XM1014"],["sawedoff","Sawed-Off"],["mag7","MAG-7"],
    ["negev","Negev"],["m249","M249"],["knife","Knife"],["taser","Zeus x27"],
  ];
  const weapons = weaponNames
    .map(([key, name]) => ({
      name, key,
      kills: map[`total_kills_${key}`] || 0,
      shots: map[`total_shots_${key}`] || 0,
      hits: map[`total_hits_${key}`] || 0,
    }))
    .filter((w) => w.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  const maps = SUPPORTED_MAPS
    .map((m) => ({
      name: m.name, pool: m.pool,
      wins: map[`total_wins_map_${m.id}`] || 0,
      rounds: map[`total_rounds_map_${m.id}`] || 0,
    }))
    .filter((m) => m.rounds > 0)
    .map((m) => ({ ...m, winRate: m.rounds ? (m.wins / m.rounds) * 100 : 0 }))
    .sort((a, b) => b.rounds - a.rounds);

  return {
    overview: {
      kills: totalKills, deaths: totalDeaths,
      kd: totalDeaths ? +(totalKills / totalDeaths).toFixed(2) : totalKills,
      accuracy: totalShots ? +((totalHits / totalShots) * 100).toFixed(2) : 0,
      headshotPct: totalKills ? +((headshots / totalKills) * 100).toFixed(2) : 0,
      wins, rounds,
      winRate: rounds ? +((wins / rounds) * 100).toFixed(2) : 0,
      mvps: map.total_mvps || 0,
      hoursPlayed: +((map.total_time_played || 0) / 3600).toFixed(1),
      moneyEarned: map.total_money_earned || 0,
      bombsPlanted: map.total_planted_bombs || 0,
      bombsDefused: map.total_defused_bombs || 0,
    },
    weapons, maps,
  };
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // Vercel routes /api/profile/[steamid] → req.query.steamid (or last path segment)
  const pathParts = url.pathname.split("/").filter(Boolean);
  const steamId = req.query?.steamid || pathParts[pathParts.length - 1];

  if (!/^7656119\d{10}$/.test(steamId)) {
    return res.status(400).json({ error: "invalid_steamid" });
  }

  // Cache hit?
  const cached = profileCache.get(steamId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json({ ...cached.data, cached: true, cachedAgeMs: Date.now() - cached.fetchedAt });
  }

  const STEAM_KEY = process.env.STEAM_API_KEY;
  const FACEIT_KEY = process.env.FACEIT_API_KEY;

  let profile = null;
  let stats = null;
  let faceit = null;
  let demoReason = null;

  if (STEAM_KEY) {
    profile = await fetchSteamProfile(steamId, STEAM_KEY);
    const statsResp = await fetchCs2Stats(steamId, STEAM_KEY);
    if (statsResp.error) demoReason = statsResp.error;
    else stats = transformSteamStats(statsResp.stats);
  } else {
    demoReason = "no_steam_key";
  }

  if (FACEIT_KEY) faceit = await fetchFaceit(steamId, FACEIT_KEY);

  if (!stats) {
    stats = generateDemoStats(steamId);
  }
  if (!profile) {
    profile = {
      steamid: steamId,
      personaname: `Player_${steamId.slice(-4)}`,
      avatarfull: `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    };
  }

  const data = {
    profile, stats, faceit,
    usedDemo: !!demoReason,
    demoReason,
    isPublicView: true,
  };

  profileCache.set(steamId, { fetchedAt: Date.now(), data });
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json(data);
}