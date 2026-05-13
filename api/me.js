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
    // We fetch 50 history items so the activity heatmap / hour-of-day stats have
    // enough data to be meaningful. Only the 10 most recent get full stats
    // detail (those power Match History UI). The rest are kept lightweight
    // (just timestamps + map + score + ELO change for activity charts).
    const [statsResp, historyResp] = await Promise.all([
      fetch(`https://open.faceit.com/data/v4/players/${pid}/stats/cs2`, { headers }),
      fetch(`https://open.faceit.com/data/v4/players/${pid}/history?game=cs2&offset=0&limit=50`, { headers }),
    ]);

    const stats = statsResp.ok ? await statsResp.json() : null;
    const historyJson = historyResp.ok ? await historyResp.json() : null;
    const allHistoryItems = historyJson?.items || [];

    // First 10: full match detail with stats, teams & rosters
    const detailedSrc = allHistoryItems.slice(0, 10);
    const enrichedMatches = await Promise.all(
      detailedSrc.map((m) => fetchFullMatch(m, pid, headers))
    );

    // Remaining: lightweight summary used for activity charts
    const lightHistory = allHistoryItems.slice(10).map((m) => ({
      matchId: m.match_id,
      finishedAt: m.finished_at || m.started_at,
      startedAt: m.started_at,
      competition: m.competition_name || "FACEIT",
      // Determine win/loss without fetching stats: check `results.winner`
      won: m.results?.winner && m.teams
        ? Object.entries(m.teams).some(
            ([fid, t]) => fid === m.results.winner && t.players?.some((p) => p.player_id === pid)
          )
        : null,
      map: m.voting?.map?.pick?.[0] || null,
    }));

    return {
      player,
      stats,
      matches: enrichedMatches,
      historyLight: lightHistory,
      // Pass through the raw lifetime blob so the UI can extract any field
      // FACEIT exposes (Win Rate %, ADR, K/R, Entry Success, Flash %, etc.)
      lifetimeRaw: stats?.lifetime || null,
    };
  } catch {
    return null;
  }
}

async function fetchFullMatch(match, playerId, headers) {
  const [detailResp, statsResp] = await Promise.all([
    fetch(`https://open.faceit.com/data/v4/matches/${match.match_id}`, { headers }).catch(() => null),
    fetch(`https://open.faceit.com/data/v4/matches/${match.match_id}/stats`, { headers }).catch(() => null),
  ]);
  const detail = detailResp?.ok ? await detailResp.json() : null;
  const statsJson = statsResp?.ok ? await statsResp.json() : null;
  return summarizeMatch(match, playerId, detail, statsJson);
}

function buildPlayerLookup(detail) {
  // detail.teams = { faction1: { roster: [{player_id, nickname, avatar, game_skill_level, ...}] }, faction2: ... }
  const lookup = {};
  if (!detail?.teams) return lookup;
  for (const [factionId, t] of Object.entries(detail.teams)) {
    const roster = t.roster || [];
    for (const p of roster) {
      lookup[p.player_id] = {
        nickname: p.nickname,
        avatar: p.avatar || null,
        country: p.country || null,
        skillLevel: p.game_skill_level || p.skill_level || null,
        elo: p.elo || null,
        factionId,
        factionName: t.name || (factionId === "faction1" ? "Team A" : "Team B"),
        factionAvatar: t.avatar || null,
      };
    }
  }
  return lookup;
}

function summarizeMatch(match, playerId, detail, statsJson) {
  const round = statsJson?.rounds?.[0];
  const map = round?.round_stats?.["Map"] || match.voting?.map?.pick?.[0] || "—";
  const winnerTeamId = round?.round_stats?.["Winner"];

  // Player roster lookup keyed by player_id with avatar + skill level + ELO
  const lookup = buildPlayerLookup(detail);

  // Build the two teams with full leaderboards
  const teams = [];
  if (round?.teams) {
    for (const t of round.teams) {
      const teamPlayers = (t.players || []).map((p) => {
        const meta = lookup[p.player_id] || {};
        const ps = p.player_stats || {};
        return {
          playerId: p.player_id,
          nickname: p.nickname || meta.nickname || "—",
          avatar: meta.avatar,
          country: meta.country,
          skillLevel: meta.skillLevel,
          elo: meta.elo,
          isMe: p.player_id === playerId,
          // CS2-style scoreboard stats
          kills: numOrNull(ps["Kills"]),
          deaths: numOrNull(ps["Deaths"]),
          assists: numOrNull(ps["Assists"]),
          kdRatio: numOrNull(ps["K/D Ratio"]),
          krRatio: numOrNull(ps["K/R Ratio"]),
          adr: numOrNull(ps["ADR"]) ?? numOrNull(ps["Damage"]) ?? null,
          headshots: numOrNull(ps["Headshots"]),
          headshotsPct: numOrNull(ps["Headshots %"]),
          mvps: numOrNull(ps["MVPs"]),
          tripleKills: numOrNull(ps["Triple Kills"]),
          quadroKills: numOrNull(ps["Quadro Kills"]),
          pentaKills: numOrNull(ps["Penta Kills"]),
          // Extended CS2 stats (FACEIT exposes when match has full match-stats)
          damage: numOrNull(ps["Damage"]),
          firstKills: numOrNull(ps["First Kills"]) ?? numOrNull(ps["Entry Count"]),
          firstDeaths: numOrNull(ps["First Deaths"]),
          entryCount: numOrNull(ps["Entry Count"]),
          entryWins: numOrNull(ps["Entry Wins"]),
          clutchKills: numOrNull(ps["Clutch Kills"]),
          oneVOneWins: numOrNull(ps["1v1 Wins"]) ?? numOrNull(ps["1v1Wins"]),
          oneVOneLosses: numOrNull(ps["1v1 Losses"]) ?? numOrNull(ps["1v1Losses"]),
          oneVTwoWins: numOrNull(ps["1v2 Wins"]) ?? numOrNull(ps["1v2Wins"]),
          oneVTwoLosses: numOrNull(ps["1v2 Losses"]) ?? numOrNull(ps["1v2Losses"]),
          flashesThrown: numOrNull(ps["Flashes Thrown"]) ?? numOrNull(ps["Flash Count"]),
          enemiesFlashed: numOrNull(ps["Enemies Flashed"]),
          flashSuccesses: numOrNull(ps["Flash Successes"]),
          utilityDamage: numOrNull(ps["Utility Damage"]),
          utilityCount: numOrNull(ps["Utility Count"]),
          heCount: numOrNull(ps["HE Count"]) ?? numOrNull(ps["HE Grenades"]),
          sniperKills: numOrNull(ps["Sniper Kills"]),
          pistolKills: numOrNull(ps["Pistol Kills"]),
          knifeKills: numOrNull(ps["Knife Kills"]),
          zeusKills: numOrNull(ps["Zeus Kills"]),
        };
      });
      // Sort scoreboard by kills desc (CS2 style)
      teamPlayers.sort((a, b) => (b.kills || 0) - (a.kills || 0));

      const factionId = teamPlayers[0]?.playerId
        ? lookup[teamPlayers[0].playerId]?.factionId
        : null;

      teams.push({
        teamId: t.team_id,
        name: t.team_stats?.["Team"] || lookup[teamPlayers[0]?.playerId]?.factionName || "Team",
        avatar: factionId ? Object.values(detail?.teams || {}).find((d) => d.faction_id === factionId)?.avatar
                          : null,
        score: numOrNull(t.team_stats?.["Final Score"]) ?? numOrNull(t.team_stats?.["Score"]) ?? null,
        won: t.team_stats?.["Team Win"] === "1" || t.team_id === winnerTeamId,
        firstHalfScore: numOrNull(t.team_stats?.["First Half Score"]),
        secondHalfScore: numOrNull(t.team_stats?.["Second Half Score"]),
        overtimeScore: numOrNull(t.team_stats?.["Overtime score"]),
        players: teamPlayers,
      });
    }
  }

  // Fallback when stats aren't available — use detail.teams for at least the roster
  if (teams.length === 0 && detail?.teams) {
    for (const [, t] of Object.entries(detail.teams)) {
      const players = (t.roster || []).map((p) => ({
        playerId: p.player_id,
        nickname: p.nickname,
        avatar: p.avatar,
        country: p.country,
        skillLevel: p.game_skill_level || p.skill_level,
        elo: p.elo,
        isMe: p.player_id === playerId,
        kills: null, deaths: null, assists: null, kdRatio: null,
        krRatio: null, adr: null, headshots: null, headshotsPct: null,
        mvps: null, tripleKills: null, quadroKills: null, pentaKills: null,
      }));
      teams.push({
        teamId: t.faction_id,
        name: t.name || "Team",
        avatar: t.avatar || null,
        score: null,
        won: null,
        firstHalfScore: null,
        secondHalfScore: null,
        overtimeScore: null,
        players,
      });
    }
  }

  // Find the player on either team for top-level summary
  let myTeam = null;
  let myStats = null;
  for (const t of teams) {
    const me = t.players.find((p) => p.isMe);
    if (me) {
      myTeam = t;
      myStats = me;
      break;
    }
  }
  const won = myTeam ? !!myTeam.won : null;
  const score = teams.length === 2
    ? `${teams[0].score ?? "—"} / ${teams[1].score ?? "—"}`
    : "—";

  // Total rounds played in the match (sum of both teams' scores)
  const totalRounds =
    teams.length === 2 && teams[0].score !== null && teams[1].score !== null
      ? (teams[0].score || 0) + (teams[1].score || 0)
      : null;

  return {
    matchId: match.match_id,
    map,
    score,
    won,
    finishedAt: match.finished_at || match.started_at,
    startedAt: match.started_at || null,
    competition: match.competition_name || detail?.competition_name || "FACEIT",
    matchUrl: `https://www.faceit.com/en/cs2/room/${match.match_id}`,
    demoUrl: match.demo_url?.[0] || detail?.demo_url?.[0] || null,
    teams,
    totalRounds,
    // Convenience: my own stats at top level (used in compact match list + aggregates)
    kills: myStats?.kills ?? null,
    deaths: myStats?.deaths ?? null,
    assists: myStats?.assists ?? null,
    kdRatio: myStats?.kdRatio ?? null,
    krRatio: myStats?.krRatio ?? null,
    adr: myStats?.adr ?? null,
    damage: myStats?.damage ?? null,
    headshots: myStats?.headshots ?? null,
    headshotsPct: myStats?.headshotsPct ?? null,
    mvps: myStats?.mvps ?? null,
    tripleKills: myStats?.tripleKills ?? null,
    quadroKills: myStats?.quadroKills ?? null,
    pentaKills: myStats?.pentaKills ?? null,
    firstKills: myStats?.firstKills ?? null,
    firstDeaths: myStats?.firstDeaths ?? null,
    entryCount: myStats?.entryCount ?? null,
    entryWins: myStats?.entryWins ?? null,
    clutchKills: myStats?.clutchKills ?? null,
    oneVOneWins: myStats?.oneVOneWins ?? null,
    oneVOneLosses: myStats?.oneVOneLosses ?? null,
    oneVTwoWins: myStats?.oneVTwoWins ?? null,
    oneVTwoLosses: myStats?.oneVTwoLosses ?? null,
    flashesThrown: myStats?.flashesThrown ?? null,
    enemiesFlashed: myStats?.enemiesFlashed ?? null,
    flashSuccesses: myStats?.flashSuccesses ?? null,
    utilityDamage: myStats?.utilityDamage ?? null,
    utilityCount: myStats?.utilityCount ?? null,
    heCount: myStats?.heCount ?? null,
    sniperKills: myStats?.sniperKills ?? null,
    pistolKills: myStats?.pistolKills ?? null,
    knifeKills: myStats?.knifeKills ?? null,
    zeusKills: myStats?.zeusKills ?? null,
  };
}

function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
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

  // [steam_stat_key, display_name]
  // NOTE: Steam's CS:GO/CS2 schema uses confusing legacy keys. `m4a1` actually
  // tracks the M4A4 (def_index 16). The M4A1-S has its own separate key.
  const weaponNames = [
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
  const weapons = weaponNames
    .map(([key, displayName]) => ({
      name: displayName,
      key, // Internal Steam key for icon lookup fallback
      kills: map[`total_kills_${key}`] || 0,
      shots: map[`total_shots_${key}`] || 0,
      hits: map[`total_hits_${key}`] || 0,
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
