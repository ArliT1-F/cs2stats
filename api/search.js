// Player search — accepts:
//   - SteamID64 (e.g. "76561198084749846")
//   - Steam vanity URL (e.g. "s1mple" or "https://steamcommunity.com/id/s1mple/")
//   - Profile URL (e.g. "https://steamcommunity.com/profiles/76561...")
//   - FACEIT nickname (last-resort fallback)
//
// Returns the resolved Steam profile + FACEIT profile (if any), enough to
// power both the search-results dropdown and the redirect-to-profile flow.

const STEAM_ID64_RE = /^7656119\d{10}$/;

function extractSteamId(input) {
  // Already a SteamID64
  if (STEAM_ID64_RE.test(input)) return { steamId: input };
  // /profiles/76561... URL
  const profileMatch = input.match(/\/profiles\/(7656119\d{10})/);
  if (profileMatch) return { steamId: profileMatch[1] };
  // /id/{vanity} URL
  const vanityMatch = input.match(/\/id\/([\w-]+)/);
  if (vanityMatch) return { vanity: vanityMatch[1] };
  // Bare alphanumeric → could be vanity OR FACEIT nickname
  if (/^[\w-]{2,32}$/.test(input)) return { vanity: input };
  return { error: "invalid_input" };
}

async function resolveVanity(vanity, key) {
  const r = await fetch(
    `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`
  );
  if (!r.ok) return null;
  const j = await r.json();
  if (j?.response?.success === 1 && j.response.steamid) return j.response.steamid;
  return null;
}

async function fetchSteamProfile(steamId, key) {
  const r = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`
  );
  if (!r.ok) return null;
  const j = await r.json();
  return j?.response?.players?.[0] || null;
}

async function searchFaceitByNickname(nickname, key) {
  try {
    const r = await fetch(
      `https://open.faceit.com/data/v4/search/players?nickname=${encodeURIComponent(nickname)}&game=cs2&offset=0&limit=5`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j?.items || [];
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return res.status(400).json({ error: "missing_query" });

  const STEAM_KEY = process.env.STEAM_API_KEY;
  const FACEIT_KEY = process.env.FACEIT_API_KEY;

  if (!STEAM_KEY) {
    return res.status(500).json({ error: "STEAM_API_KEY not configured on server" });
  }

  const parsed = extractSteamId(q);
  let steamId = parsed.steamId;
  let vanity = parsed.vanity;

  // Try vanity → SteamID64 resolution
  if (!steamId && vanity) {
    steamId = await resolveVanity(vanity, STEAM_KEY);
  }

  // Build results
  const results = [];

  if (steamId) {
    const profile = await fetchSteamProfile(steamId, STEAM_KEY);
    if (profile) {
      results.push({
        type: "steam",
        steamId,
        personaName: profile.personaname,
        avatar: profile.avatarfull,
        profileUrl: profile.profileurl,
        country: profile.loccountrycode || null,
      });
    }
  }

  // ALSO search FACEIT — useful when the input is a FACEIT nickname that
  // doesn't match any Steam vanity URL.
  if (FACEIT_KEY && !STEAM_ID64_RE.test(q)) {
    const faceitResults = await searchFaceitByNickname(q, FACEIT_KEY);
    if (faceitResults) {
      for (const f of faceitResults.slice(0, 5)) {
        // Skip if same Steam ID as the primary result we already have
        if (f.games?.cs2?.game_player_id === steamId) continue;
        results.push({
          type: "faceit",
          faceitId: f.player_id,
          steamId: f.games?.cs2?.game_player_id || null,
          personaName: f.nickname,
          avatar: f.avatar || null,
          country: f.country || null,
          faceitLevel: f.games?.cs2?.skill_level || null,
          faceitElo: f.games?.cs2?.faceit_elo || null,
        });
      }
    }
  }

  if (results.length === 0) {
    return res.status(404).json({ error: "no_results", query: q });
  }

  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({ query: q, results });
}
