// Live status endpoint — checks if the logged-in user is currently in CS2.
// Steam Web API exposes `gameextrainfo` ("Counter-Strike 2"), `gameid` (730),
// `gameserverip` and `lobbysteamid` via GetPlayerSummaries.
//
// LIMITATION: Steam does NOT expose live in-match data (round, score, side,
// HP, economy, etc.) via any public API. That data only flows via Game State
// Integration (GSI), which runs locally on the player's PC and POSTs to a
// configured endpoint. To get round-by-round live stats, the user must install
// a small `gamestate_integration_*.cfg` file in their CS2 cfg folder.
//
// This endpoint returns:
//   - online status (Online / In-Game / Offline / Away / Busy)
//   - whether they're in CS2 right now
//   - server IP if available
//   - duration of current session (when entered game, if recent)
//   - a "isLive" flag the UI can use to show the LIVE NOW banner

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

const PERSONA_STATE = {
  0: "Offline", 1: "Online", 2: "Busy", 3: "Away",
  4: "Snooze", 5: "Looking to trade", 6: "Looking to play",
};

// Tiny in-memory cache so repeated calls don't hammer Steam (live status is
// polled often by the UI). Per warm Lambda, ~10s TTL.
const cache = new Map(); // steamId → { fetchedAt, data }
const CACHE_TTL_MS = 10_000;

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const steamId = url.searchParams.get("steamid") || cookies.steamid;

  if (!steamId) return res.status(401).json({ error: "Not logged in" });

  const STEAM_KEY = process.env.STEAM_API_KEY;
  if (!STEAM_KEY) {
    return res.json({
      isLive: false,
      personaState: "Unknown",
      message: "STEAM_API_KEY not configured",
    });
  }

  // Cache hit?
  const cached = cache.get(steamId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const r = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`
    );
    if (!r.ok) return res.json({ isLive: false, error: `steam_${r.status}` });
    const j = await r.json();
    const p = j?.response?.players?.[0];
    if (!p) return res.json({ isLive: false, error: "no_player" });

    const inCs2 = p.gameid === "730" || p.gameextrainfo === "Counter-Strike 2";
    const data = {
      steamId,
      personaName: p.personaname,
      avatar: p.avatarfull,
      personaState: PERSONA_STATE[p.personastate] || "Unknown",
      personaStateCode: p.personastate,
      isLive: !!inCs2,
      currentGame: p.gameextrainfo || null,
      gameId: p.gameid || null,
      gameServerIp: p.gameserverip || null,
      lobbySteamId: p.lobbysteamid || null,
      lastLogoff: p.lastlogoff || null,
      gameServerSteamId: p.gameserversteamid || null,
      // Rich live data (round, score, side, HP, weapons, etc.) is NOT exposed
      // by any public Steam API. To get that, players must install a
      // gamestate_integration cfg in their CS2 folder that POSTs to /api/gsi.
      // Until then, we can only confirm "in-game" + server.
      hasGSI: false, // TODO: check if a recent GSI payload exists for this user
    };

    cache.set(steamId, { fetchedAt: Date.now(), data });
    res.setHeader("Cache-Control", "private, max-age=10");
    res.json(data);
  } catch (e) {
    res.json({ isLive: false, error: String(e) });
  }
}
