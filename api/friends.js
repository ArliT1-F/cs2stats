// Authenticated friends list — Steam (GetFriendList) or FACEIT (friends_ids on player).
// Requires a signed Steam session cookie. Optional ?q= filters by nickname (case-insensitive).

import { getAuthenticatedSteamId } from "./_auth.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const MAX_FACEIT_FETCH = 80;
const FACEIT_CONCURRENCY = 8;

async function fetchSteamFriendIds(steamId, key) {
  const url = `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${key}&steamid=${steamId}&relationship=friend`;
  const r = await fetch(url);
  if (r.status === 401 || r.status === 403) {
    return { error: "private_friends", message: "Your Steam friends list is private. Set 'Friends list' to Public in Steam privacy settings." };
  }
  if (!r.ok) return { error: "steam_friends_failed", status: r.status };
  const j = await r.json();
  if (!j?.friendslist?.friends) {
    return { error: "private_friends", message: "Could not load your Steam friends. Your friends list may be set to private." };
  }
  return { steamIds: j.friendslist.friends.map((f) => f.steamid) };
}

async function batchSteamProfiles(steamIds, key) {
  const players = [];
  for (let i = 0; i < steamIds.length; i += 100) {
    const chunk = steamIds.slice(i, i + 100);
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${chunk.join(",")}`;
    const r = await fetch(url);
    if (!r.ok) continue;
    const j = await r.json();
    if (j?.response?.players) players.push(...j.response.players);
  }
  return players;
}

function mapSteamFriend(p) {
  return {
    source: "steam",
    steamId: p.steamid,
    personaName: p.personaname,
    avatar: p.avatarfull || p.avatarmedium || null,
    country: p.loccountrycode || null,
    online: p.personastate > 0,
    faceitLevel: null,
    faceitElo: null,
  };
}

async function fetchFaceitPlayer(playerId, headers) {
  try {
    const r = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function fetchFaceitFriends(steamId, key) {
  const headers = { Authorization: `Bearer ${key}` };
  const r = await fetch(
    `https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steamId}`,
    { headers }
  );
  if (r.status === 404) {
    return { error: "no_faceit_account", message: "No FACEIT account linked to your Steam ID." };
  }
  if (!r.ok) return { error: "faceit_failed", status: r.status };
  const player = await r.json();
  const friendIds = player.friends_ids || [];
  if (friendIds.length === 0) {
    return { friends: [], total: 0 };
  }

  const toFetch = friendIds.slice(0, MAX_FACEIT_FETCH);
  const friends = [];
  for (let i = 0; i < toFetch.length; i += FACEIT_CONCURRENCY) {
    const chunk = toFetch.slice(i, i + FACEIT_CONCURRENCY);
    const results = await Promise.all(chunk.map((id) => fetchFaceitPlayer(id, headers)));
    for (const f of results) {
      if (!f) continue;
      friends.push({
        source: "faceit",
        faceitId: f.player_id,
        steamId: f.games?.cs2?.game_player_id || f.steam_id_64 || null,
        personaName: f.nickname,
        avatar: f.avatar || null,
        country: f.country || null,
        faceitLevel: f.games?.cs2?.skill_level ?? null,
        faceitElo: f.games?.cs2?.faceit_elo ?? null,
        online: false,
      });
    }
  }

  friends.sort((a, b) => a.personaName.localeCompare(b.personaName, undefined, { sensitivity: "base" }));
  return {
    friends,
    total: friendIds.length,
    truncated: friendIds.length > MAX_FACEIT_FETCH,
  };
}

async function fetchSteamFriends(steamId, key) {
  const list = await fetchSteamFriendIds(steamId, key);
  if (list.error) return list;
  if (list.steamIds.length === 0) {
    return { friends: [], total: 0 };
  }

  const total = list.steamIds.length;
  const profiles = await batchSteamProfiles(list.steamIds, key);
  const friends = profiles.map(mapSteamFriend);
  friends.sort((a, b) => a.personaName.localeCompare(b.personaName, undefined, { sensitivity: "base" }));
  return {
    friends,
    total,
    loaded: friends.length,
    partial: friends.length < total,
  };
}

function filterFriends(friends, q) {
  if (!q) return friends;
  const needle = q.toLowerCase();
  return friends.filter((f) => f.personaName.toLowerCase().includes(needle));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const steamId = getAuthenticatedSteamId(req);
  if (!steamId) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const source = (url.searchParams.get("source") || "steam").toLowerCase();
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (source !== "steam" && source !== "faceit") {
    return res.status(400).json({ error: "invalid_source" });
  }

  const cacheKey = `${steamId}:${source}`;
  const cached = cache.get(cacheKey);
  let payload;
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    payload = cached.data;
  } else {
    if (source === "steam") {
      const STEAM_KEY = process.env.STEAM_API_KEY;
      if (!STEAM_KEY) {
        return res.status(500).json({ error: "STEAM_API_KEY not configured on server" });
      }
      payload = await fetchSteamFriends(steamId, STEAM_KEY);
    } else {
      const FACEIT_KEY = process.env.FACEIT_API_KEY;
      if (!FACEIT_KEY) {
        return res.status(503).json({
          error: "faceit_not_configured",
          message: "FACEIT_API_KEY is not configured on the server.",
        });
      }
      payload = await fetchFaceitFriends(steamId, FACEIT_KEY);
    }
    if (!payload.error) {
      cache.set(cacheKey, { ts: Date.now(), data: payload });
    }
  }

  if (payload.error) {
    const status = payload.error === "faceit_not_configured" ? 503 : 403;
    return res.status(status).json(payload);
  }

  const filtered = filterFriends(payload.friends, q);
  res.setHeader("Cache-Control", "private, max-age=120");
  res.json({
    source,
    friends: filtered,
    total: payload.total ?? payload.friends.length,
    shown: filtered.length,
    truncated: payload.truncated || false,
    query: q || null,
  });
}
