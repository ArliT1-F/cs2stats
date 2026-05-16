// Public profile endpoint — anyone can view stats for any Steam user with a
// public profile, no authentication required. Powers /u/{steamid} routes,
// shareable links, and player comparison. Heavy in-memory caching since
// public profiles change slowly.

import { generateDemoStats } from "../_demoData.js";
import { transformSteamStats } from "../_steamStats.js";

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
