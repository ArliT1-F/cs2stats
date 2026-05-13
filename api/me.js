// Returns the currently logged-in Steam user (from cookie) + their CS2 stats.
// Uses Steam Web API and Faceit API. Requires env vars STEAM_API_KEY and FACEIT_API_KEY.
// If keys are missing or stats are private, returns demo data with a `demoReason`
// explaining why so the UI can show a helpful message.

import { generateDemoStats } from "./_demoData.js";

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
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`;
  const r = await fetch(url);
  if (!r.ok) return { error: `steam_profile_${r.status}` };
  const j = await r.json();
  return { player: j?.response?.players?.[0] || null };
}

async function fetchCs2Stats(steamId, key) {
  // appid 730 = CS:GO/CS2
  const url = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${key}&steamid=${steamId}`;
  const r = await fetch(url);
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
    const r = await fetch(
      `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!r.ok) return null;
    const player = await r.json();
    const statsResp = await fetch(
      `https://open.faceit.com/data/v4/players/${player.player_id}/stats/cs2`,
      { headers: { Authorization: `Bearer ${key}` } }
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
  const mvps = map.total_mvps || 0;
  const timePlayed = map.total_time_played || 0;
  const moneyEarned = map.total_money_earned || 0;
  const planted = map.total_planted_bombs || 0;
  const defused = map.total_defused_bombs || 0;

  // If everything is zero, the account never played CS2
  if (totalKills === 0 && totalDeaths === 0 && rounds === 0) return null;

  const weaponNames = [
    "ak47","m4a1","awp","glock","hkp2000","usp_silencer","deagle","p250",
    "famas","galilar","sg556","aug","ssg08","mp9","mp7","ump45","mac10",
    "p90","bizon","nova","xm1014","sawedoff","mag7","negev","m249","scar20","g3sg1","knife"
  ];
  const weapons = weaponNames
    .map((w) => ({
      name: w.toUpperCase().replace("_SILENCER", " (S)"),
      kills: map[`total_kills_${w}`] || 0,
      shots: map[`total_shots_${w}`] || 0,
      hits: map[`total_hits_${w}`] || 0,
    }))
    .filter((w) => w.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  const mapNames = [
    "cs_assault","cs_italy","cs_militia","cs_office",
    "de_aztec","de_cbble","de_dust","de_dust2","de_inferno","de_nuke",
    "de_train","de_mirage","de_vertigo","de_ancient","de_anubis","de_overpass"
  ];
  const maps = mapNames
    .map((m) => ({
      name: m.replace(/^(de|cs)_/, "").toUpperCase(),
      wins: map[`total_wins_map_${m}`] || 0,
      rounds: map[`total_rounds_map_${m}`] || 0,
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

const REASON_MESSAGES = {
  no_steam_key: "The site owner hasn't configured a STEAM_API_KEY environment variable on Vercel.",
  private_profile: "Your Steam profile's 'Game details' privacy is set to Private or Friends Only. Set it to Public on your Steam profile to see real stats.",
  no_cs2_stats: "Steam returned no CS2 stats for this account. Make sure you've played CS2 on this Steam account at least once.",
  empty_stats: "Steam returned an empty stats response. Your account may not have played CS2.",
  steam_api_error: "Steam's API returned an error. The STEAM_API_KEY may be invalid or rate-limited.",
};

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const steamId = cookies.steamid;
  if (!steamId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const STEAM_KEY = process.env.STEAM_API_KEY;
  const FACEIT_KEY = process.env.FACEIT_API_KEY;

  let profile = null;
  let stats = null;
  let faceit = null;
  let demoReason = null;
  let debug = {
    hasSteamKey: !!STEAM_KEY,
    hasFaceitKey: !!FACEIT_KEY,
    steamId,
  };

  if (!STEAM_KEY) {
    demoReason = "no_steam_key";
  } else {
    const profileResp = await fetchSteamProfile(steamId, STEAM_KEY);
    if (profileResp.error) {
      debug.profileError = profileResp.error;
      demoReason = "steam_api_error";
    } else {
      profile = profileResp.player;
    }

    const statsResp = await fetchCs2Stats(steamId, STEAM_KEY);
    if (statsResp.error) {
      debug.statsError = statsResp.error;
      demoReason = statsResp.error;
    } else {
      const transformed = transformSteamStats(statsResp.stats);
      if (transformed) {
        stats = transformed;
      } else {
        demoReason = "no_cs2_stats";
      }
    }
  }

  if (FACEIT_KEY) {
    faceit = await fetchFaceit(steamId, FACEIT_KEY);
  }

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

  res.setHeader("Cache-Control", "private, max-age=60");
  res.json({
    profile,
    stats,
    faceit,
    usedDemo: !!demoReason,
    demoReason,
    demoMessage: demoReason ? REASON_MESSAGES[demoReason] || "Unknown reason" : null,
    debug,
  });
}