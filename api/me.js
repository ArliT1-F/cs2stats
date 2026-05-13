// Returns the currently logged-in Steam user (from cookie) + their CS2 stats.
// Uses Steam Web API and Faceit API. Requires env vars STEAM_API_KEY and FACEIT_API_KEY.
// If keys are missing or stats are private, returns demo data with a `demoReason`
// explaining why so the UI can show a helpful message.

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
    const headers = { Authorization: `Bearer ${key}` };

    const r = await fetch(
      `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
      { headers }
    );
    if (!r.ok) return null;
    const player = await r.json();
    const pid = player.player_id;

    // Fetch lifetime stats (with per-map segments) and recent history in parallel.
    // The history endpoint returns 20 most recent CS2 matches.
    const [statsResp, historyResp] = await Promise.all([
      fetch(`https://open.faceit.com/data/v4/players/${pid}/stats/cs2`, { headers }),
      fetch(`https://open.faceit.com/data/v4/players/${pid}/history?game=cs2&offset=0&limit=20`, { headers }),
    ]);

    const stats = statsResp.ok ? await statsResp.json() : null;
    const historyJson = historyResp.ok ? await historyResp.json() : null;

    // For each recent match, fetch detailed stats so we can show K/D, score, etc.
    // We limit to the 10 most recent matches to stay within reasonable response time.
    const matches = (historyJson?.items || []).slice(0, 10);
    const enrichedMatches = await Promise.all(
      matches.map(async (m) => {
        try {
          const ms = await fetch(
            `https://open.faceit.com/data/v4/matches/${m.match_id}/stats`,
            { headers }
          );
          if (!ms.ok) return summarizeMatch(m, pid, null);
          const sj = await ms.json();
          return summarizeMatch(m, pid, sj);
        } catch {
          return summarizeMatch(m, pid, null);
        }
      })
    );

    return { player, stats, matches: enrichedMatches };
  } catch {
    return null;
  }
}

// Convert raw Faceit match + stats payloads into a flat shape the UI uses.
function summarizeMatch(match, playerId, statsJson) {
  const round = statsJson?.rounds?.[0];
  const map = round?.round_stats?.["Map"] || match.voting?.map?.pick?.[0] || "—";
  const score = round?.round_stats?.["Score"] || "—";
  const winnerTeamId = round?.round_stats?.["Winner"];

  // Find which team the player was on
  let myTeam = null;
  let myStats = null;
  let opponentName = "—";
  if (round?.teams) {
    for (const t of round.teams) {
      const me = t.players?.find((p) => p.player_id === playerId);
      if (me) {
        myTeam = t;
        myStats = me.player_stats || {};
      } else {
        opponentName = t.team_stats?.Team || opponentName;
      }
    }
  }

  // Fallback team info from match payload if stats aren't available
  if (!myTeam && match.teams) {
    for (const [, t] of Object.entries(match.teams)) {
      const me = t.players?.find((p) => p.player_id === playerId);
      if (me) myTeam = { team_id: t.team_id, nickname: t.nickname };
    }
  }

  const won = myTeam && winnerTeamId ? myTeam.team_id === winnerTeamId : null;

  return {
    matchId: match.match_id,
    map,
    score,
    won,
    finishedAt: match.finished_at || match.started_at,
    competition: match.competition_name || "FACEIT",
    matchUrl: `https://www.faceit.com/en/cs2/room/${match.match_id}`,
    demoUrl: match.demo_url?.[0] || null, // Faceit demo download URL (.dem.gz)
    // Per-player stats (only present if stats endpoint succeeded)
    kills: myStats?.["Kills"] ? +myStats["Kills"] : null,
    deaths: myStats?.["Deaths"] ? +myStats["Deaths"] : null,
    assists: myStats?.["Assists"] ? +myStats["Assists"] : null,
    kdRatio: myStats?.["K/D Ratio"] ? +myStats["K/D Ratio"] : null,
    krRatio: myStats?.["K/R Ratio"] ? +myStats["K/R Ratio"] : null,
    headshotsPct: myStats?.["Headshots %"] ? +myStats["Headshots %"] : null,
    mvps: myStats?.["MVPs"] ? +myStats["MVPs"] : null,
    tripleKills: myStats?.["Triple Kills"] ? +myStats["Triple Kills"] : null,
    quadroKills: myStats?.["Quadro Kills"] ? +myStats["Quadro Kills"] : null,
    pentaKills: myStats?.["Penta Kills"] ? +myStats["Penta Kills"] : null,
  };
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

  // Only include maps from the current CS2 Active Duty + Reserve pool.
  // Legacy CS:GO maps (assault, militia, dust, cbble, aztec) are filtered out
  // even though Steam still returns stats for them.
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
