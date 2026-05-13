// Lightweight `/api/me` companion — returns ONLY the Steam profile + CS2
// lifetime stats. No FACEIT calls (those are slow and shouldn't block the
// initial render).
//
// Pair this with /api/me-faceit which the frontend fetches in parallel
// for streaming-progressive UI loading.

import { generateDemoStats } from "./_demoData.js";
import { SUPPORTED_MAPS } from "./_mapPool.js";

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

async function fetchSteamProfile(steamId, key) {
  const r = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`
  );
  if (!r.ok) return { error: `steam_profile_${r.status}` };
  const j = await r.json();
  return { player: j?.response?.players?.[0] || null };
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

function transformSteamStats(rawStats) {
  if (!rawStats) return null;
  const map = {};
  for (const s of rawStats) map[s.name] = s.value;
  const totalKills = map.total_kills || 0;
  const totalDeaths = map.total_deaths || 0;
  if (totalKills === 0 && totalDeaths === 0 && (map.total_rounds_played || 0) === 0) return null;

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
      accuracy: (map.total_shots_fired || 0) ? +(((map.total_shots_hit || 0) / map.total_shots_fired) * 100).toFixed(2) : 0,
      headshotPct: totalKills ? +(((map.total_kills_headshot || 0) / totalKills) * 100).toFixed(2) : 0,
      wins: map.total_wins || 0, rounds: map.total_rounds_played || 0,
      winRate: (map.total_rounds_played || 0) ? +(((map.total_wins || 0) / map.total_rounds_played) * 100).toFixed(2) : 0,
      mvps: map.total_mvps || 0,
      hoursPlayed: +((map.total_time_played || 0) / 3600).toFixed(1),
      moneyEarned: map.total_money_earned || 0,
      bombsPlanted: map.total_planted_bombs || 0,
      bombsDefused: map.total_defused_bombs || 0,
    },
    weapons, maps,
  };
}

const REASONS = {
  no_steam_key: "The site owner hasn't configured a STEAM_API_KEY environment variable on Vercel.",
  private_profile: "Your Steam profile's 'Game details' privacy is set to Private. Set it to Public to see real stats.",
  no_cs2_stats: "Steam returned no CS2 stats for this account. Make sure you've played CS2 at least once.",
  empty_stats: "Steam returned an empty stats response.",
  steam_api_error: "Steam's API returned an error.",
};

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const steamId = cookies.steamid;
  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  const STEAM_KEY = process.env.STEAM_API_KEY;
  let profile = null, stats = null, demoReason = null;

  if (!STEAM_KEY) {
    demoReason = "no_steam_key";
  } else {
    const profileResp = await fetchSteamProfile(steamId, STEAM_KEY);
    profile = profileResp.player;
    const statsResp = await fetchCs2Stats(steamId, STEAM_KEY);
    if (statsResp.error) demoReason = statsResp.error;
    else {
      const transformed = transformSteamStats(statsResp.stats);
      if (transformed) stats = transformed;
      else demoReason = "no_cs2_stats";
    }
  }

  if (!stats) stats = generateDemoStats(steamId);
  if (!profile) {
    profile = {
      steamid: steamId,
      personaname: `Player_${steamId.slice(-4)}`,
      avatarfull: `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
      profileurl: `https://steamcommunity.com/profiles/${steamId}`,
    };
  }

  res.setHeader("Cache-Control", "private, max-age=60");
  res.json({
    profile, stats,
    usedDemo: !!demoReason,
    demoReason,
    demoMessage: demoReason ? REASONS[demoReason] || "Unknown reason" : null,
  });
}