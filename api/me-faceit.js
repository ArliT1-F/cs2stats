// FACEIT-only companion endpoint. The frontend fetches this in parallel with
// /api/me-basic so the FACEIT panel can stream in independently. Slower than
// the basic endpoint because it makes ~22 FACEIT API calls (player + stats +
// 50 history + 10 match details + 10 match stats).

import { getAuthenticatedSteamId } from "./_auth.js";

function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
}

function buildPlayerLookup(detail) {
  const lookup = {};
  if (!detail?.teams) return lookup;
  for (const [factionId, t] of Object.entries(detail.teams)) {
    for (const p of (t.roster || [])) {
      lookup[p.player_id] = {
        nickname: p.nickname,
        avatar: p.avatar || null,
        country: p.country || null,
        skillLevel: p.game_skill_level || p.skill_level || null,
        elo: p.elo || null,
        factionId,
        factionName: t.name || (factionId === "faction1" ? "Team A" : "Team B"),
      };
    }
  }
  return lookup;
}

function summarizeMatch(match, playerId, detail, statsJson, statsAvailable) {
  const round = statsJson?.rounds?.[0];
  const map = round?.round_stats?.["Map"] || match.voting?.map?.pick?.[0] || "—";
  const winnerTeamId = round?.round_stats?.["Winner"];
  const lookup = buildPlayerLookup(detail);

  const teams = [];
  if (round?.teams) {
    for (const t of round.teams) {
      const teamPlayers = (t.players || []).map((p) => {
        const meta = lookup[p.player_id] || {};
        const ps = p.player_stats || {};
        return {
          playerId: p.player_id, nickname: p.nickname || meta.nickname || "—",
          avatar: meta.avatar, country: meta.country,
          skillLevel: meta.skillLevel, elo: meta.elo,
          isMe: p.player_id === playerId,
          kills: numOrNull(ps["Kills"]), deaths: numOrNull(ps["Deaths"]),
          assists: numOrNull(ps["Assists"]),
          kdRatio: numOrNull(ps["K/D Ratio"]), krRatio: numOrNull(ps["K/R Ratio"]),
          adr: numOrNull(ps["ADR"]) ?? numOrNull(ps["Damage"]) ?? null,
          headshots: numOrNull(ps["Headshots"]), headshotsPct: numOrNull(ps["Headshots %"]),
          mvps: numOrNull(ps["MVPs"]),
          tripleKills: numOrNull(ps["Triple Kills"]),
          quadroKills: numOrNull(ps["Quadro Kills"]),
          pentaKills: numOrNull(ps["Penta Kills"]),
          damage: numOrNull(ps["Damage"]),
          firstKills: numOrNull(ps["First Kills"]),
          firstDeaths: numOrNull(ps["First Deaths"]),
          entryCount: numOrNull(ps["Entry Count"]),
          entryWins: numOrNull(ps["Entry Wins"]),
          clutchKills: numOrNull(ps["Clutch Kills"]),
          oneVOneWins: numOrNull(ps["1v1 Wins"]),
          oneVOneLosses: numOrNull(ps["1v1 Losses"]),
          oneVTwoWins: numOrNull(ps["1v2 Wins"]),
          oneVTwoLosses: numOrNull(ps["1v2 Losses"]),
          flashesThrown: numOrNull(ps["Flashes Thrown"]),
          enemiesFlashed: numOrNull(ps["Enemies Flashed"]),
          flashSuccesses: numOrNull(ps["Flash Successes"]),
          utilityDamage: numOrNull(ps["Utility Damage"]),
          utilityCount: numOrNull(ps["Utility Count"]),
          heCount: numOrNull(ps["HE Count"]),
          sniperKills: numOrNull(ps["Sniper Kills"]),
          pistolKills: numOrNull(ps["Pistol Kills"]),
          knifeKills: numOrNull(ps["Knife Kills"]),
          zeusKills: numOrNull(ps["Zeus Kills"]),
        };
      });
      teamPlayers.sort((a, b) => (b.kills || 0) - (a.kills || 0));
      teams.push({
        teamId: t.team_id,
        name: t.team_stats?.["Team"] || lookup[teamPlayers[0]?.playerId]?.factionName || "Team",
        avatar: null,
        score: numOrNull(t.team_stats?.["Final Score"]) ?? numOrNull(t.team_stats?.["Score"]) ?? null,
        won: t.team_stats?.["Team Win"] === "1" || t.team_id === winnerTeamId,
        firstHalfScore: numOrNull(t.team_stats?.["First Half Score"]),
        secondHalfScore: numOrNull(t.team_stats?.["Second Half Score"]),
        overtimeScore: numOrNull(t.team_stats?.["Overtime score"]),
        players: teamPlayers,
      });
    }
  }
  if (teams.length === 0 && detail?.teams) {
    for (const [, t] of Object.entries(detail.teams)) {
      teams.push({
        teamId: t.faction_id, name: t.name || "Team", avatar: t.avatar || null,
        score: null, won: null, firstHalfScore: null, secondHalfScore: null, overtimeScore: null,
        players: (t.roster || []).map((p) => ({
          playerId: p.player_id, nickname: p.nickname, avatar: p.avatar, country: p.country,
          skillLevel: p.game_skill_level || p.skill_level, elo: p.elo,
          isMe: p.player_id === playerId,
          kills: null, deaths: null, assists: null, kdRatio: null,
          krRatio: null, adr: null, headshots: null, headshotsPct: null,
          mvps: null, tripleKills: null, quadroKills: null, pentaKills: null,
        })),
      });
    }
  }

  let myStats = null;
  for (const t of teams) {
    const me = t.players.find((p) => p.isMe);
    if (me) { myStats = me; break; }
  }
  const totalRounds = teams.length === 2 && teams[0].score !== null && teams[1].score !== null
    ? (teams[0].score || 0) + (teams[1].score || 0) : null;

  return {
    matchId: match.match_id,
    map,
    score: teams.length === 2 ? `${teams[0].score ?? "—"} / ${teams[1].score ?? "—"}` : "—",
    won: myStats ? !!teams.find((t) => t.players.some((p) => p.isMe))?.won : null,
    finishedAt: match.finished_at || match.started_at,
    startedAt: match.started_at || null,
    competition: match.competition_name || detail?.competition_name || "FACEIT",
    matchUrl: `https://www.faceit.com/en/cs2/room/${match.match_id}`,
    demoUrl: match.demo_url?.[0] || detail?.demo_url?.[0] || null,
    eloChange: match?.elo_change ?? null,
    roundResultsRaw: round?.round_stats?.["Rounds"] || null,
    statsAvailable,
    teams, totalRounds,
    kills: myStats?.kills ?? null, deaths: myStats?.deaths ?? null,
    assists: myStats?.assists ?? null, kdRatio: myStats?.kdRatio ?? null,
    krRatio: myStats?.krRatio ?? null, adr: myStats?.adr ?? null,
    damage: myStats?.damage ?? null, headshots: myStats?.headshots ?? null,
    headshotsPct: myStats?.headshotsPct ?? null, mvps: myStats?.mvps ?? null,
    tripleKills: myStats?.tripleKills ?? null,
    quadroKills: myStats?.quadroKills ?? null,
    pentaKills: myStats?.pentaKills ?? null,
    firstKills: myStats?.firstKills ?? null, firstDeaths: myStats?.firstDeaths ?? null,
    entryCount: myStats?.entryCount ?? null, entryWins: myStats?.entryWins ?? null,
    clutchKills: myStats?.clutchKills ?? null,
    oneVOneWins: myStats?.oneVOneWins ?? null, oneVOneLosses: myStats?.oneVOneLosses ?? null,
    oneVTwoWins: myStats?.oneVTwoWins ?? null, oneVTwoLosses: myStats?.oneVTwoLosses ?? null,
    flashesThrown: myStats?.flashesThrown ?? null,
    enemiesFlashed: myStats?.enemiesFlashed ?? null,
    flashSuccesses: myStats?.flashSuccesses ?? null,
    utilityDamage: myStats?.utilityDamage ?? null,
    utilityCount: myStats?.utilityCount ?? null, heCount: myStats?.heCount ?? null,
    sniperKills: myStats?.sniperKills ?? null,
    pistolKills: myStats?.pistolKills ?? null,
    knifeKills: myStats?.knifeKills ?? null,
    zeusKills: myStats?.zeusKills ?? null,
  };
}

export default async function handler(req, res) {
  const steamId = getAuthenticatedSteamId(req);
  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  const FACEIT_KEY = process.env.FACEIT_API_KEY;
  if (!FACEIT_KEY) {
    return res.json({ player: null, stats: null, matches: [], historyLight: [], lifetimeRaw: null });
  }

  try {
    const headers = { Authorization: `Bearer ${FACEIT_KEY}` };
    const r = await fetch(
      `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
      { headers }
    );
    if (!r.ok) return res.json({ player: null });
    const player = await r.json();
    const pid = player.player_id;

    const [statsResp, historyResp] = await Promise.all([
      fetch(`https://open.faceit.com/data/v4/players/${pid}/stats/cs2`, { headers }),
      fetch(`https://open.faceit.com/data/v4/players/${pid}/history?game=cs2&offset=0&limit=50`, { headers }),
    ]);

    const stats = statsResp.ok ? await statsResp.json() : null;
    const historyJson = historyResp.ok ? await historyResp.json() : null;
    const allHistoryItems = historyJson?.items || [];

    const detailedSrc = allHistoryItems.slice(0, 10);
    const enrichedMatches = await Promise.all(detailedSrc.map(async (m) => {
      const [d, s] = await Promise.all([
        fetch(`https://open.faceit.com/data/v4/matches/${m.match_id}`, { headers }).catch(() => null),
        fetch(`https://open.faceit.com/data/v4/matches/${m.match_id}/stats`, { headers }).catch(() => null),
      ]);
      const statsAvailable = !!s?.ok;
      const detail = d?.ok ? await d.json() : null;
      const statsJson = statsAvailable ? await s.json() : null;
      return summarizeMatch(m, pid, detail, statsJson, statsAvailable);
    }));

    const lightHistory = allHistoryItems.slice(10).map((m) => ({
      matchId: m.match_id,
      finishedAt: m.finished_at || m.started_at,
      startedAt: m.started_at,
      competition: m.competition_name || "FACEIT",
      won: m.results?.winner && m.teams
        ? Object.entries(m.teams).some(([fid, t]) =>
            fid === m.results.winner && t.players?.some((p) => p.player_id === pid)
          )
        : null,
      map: m.voting?.map?.pick?.[0] || null,
    }));

    res.setHeader("Cache-Control", "private, max-age=60");
    res.json({
      player, stats,
      matches: enrichedMatches,
      historyLight: lightHistory,
      lifetimeRaw: stats?.lifetime || null,
    });
  } catch (e) {
    res.json({ player: null, error: String(e) });
  }
}