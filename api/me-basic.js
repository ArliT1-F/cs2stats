// Lightweight `/api/me` companion — returns ONLY the Steam profile + CS2
// lifetime stats. No FACEIT calls (those are slow and shouldn't block the
// initial render).
//
// Pair this with /api/me-faceit which the frontend fetches in parallel
// for streaming-progressive UI loading.

import { generateDemoStats } from "./_demoData.js";
import { transformSteamStats } from "./_steamStats.js";
import { getAuthenticatedSteamId } from "./_auth.js";

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

const REASONS = {
  no_steam_key: "The site owner hasn't configured a STEAM_API_KEY environment variable on Vercel.",
  private_profile: "Your Steam profile's 'Game details' privacy is set to Private. Set it to Public to see real stats.",
  no_cs2_stats: "Steam returned no CS2 stats for this account. Make sure you've played CS2 at least once.",
  empty_stats: "Steam returned an empty stats response.",
  steam_api_error: "Steam's API returned an error.",
};

export default async function handler(req, res) {
  const steamId = getAuthenticatedSteamId(req);
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