// Debug endpoint - shows exactly what Steam's API is returning for the
// logged-in user. Visit /api/debug after signing in to diagnose issues.

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

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const steamId = cookies.steamid;
  const STEAM_KEY = process.env.STEAM_API_KEY;

  const out = {
    cookieFound: !!steamId,
    steamId: steamId || null,
    hasSteamApiKey: !!STEAM_KEY,
    steamApiKeyLength: STEAM_KEY ? STEAM_KEY.length : 0,
    hasFaceitApiKey: !!process.env.FACEIT_API_KEY,
    requestHost: req.headers["x-forwarded-host"] || req.headers.host,
    requestProto: req.headers["x-forwarded-proto"] || "unknown",
  };

  if (!steamId) {
    out.next = "No `steamid` cookie found. Sign in via /api/auth/steam first.";
    return res.json(out);
  }
  if (!STEAM_KEY) {
    out.next = "STEAM_API_KEY env var is missing. Add it on Vercel → Settings → Environment Variables, then redeploy.";
    return res.json(out);
  }

  // Test 1: Player profile
  try {
    const profUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`;
    const r = await fetch(profUrl);
    out.profileEndpoint = {
      status: r.status,
      ok: r.ok,
    };
    if (r.ok) {
      const j = await r.json();
      const p = j?.response?.players?.[0];
      out.profileEndpoint.personaname = p?.personaname || null;
      out.profileEndpoint.communityvisibilitystate = p?.communityvisibilitystate;
      out.profileEndpoint.communityvisibilityHint = p?.communityvisibilitystate === 3 ? "Public ✓" : "Not public — set Steam profile to Public";
    } else {
      out.profileEndpoint.body = (await r.text()).slice(0, 300);
    }
  } catch (e) {
    out.profileEndpoint = { error: String(e) };
  }

  // Test 2: CS2 stats (this is what really matters)
  try {
    const statsUrl = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/?appid=730&key=${STEAM_KEY}&steamid=${steamId}`;
    const r = await fetch(statsUrl);
    out.cs2StatsEndpoint = {
      status: r.status,
      ok: r.ok,
    };
    if (r.ok) {
      const j = await r.json();
      const stats = j?.playerstats?.stats || [];
      out.cs2StatsEndpoint.statCount = stats.length;
      out.cs2StatsEndpoint.firstFiveStats = stats.slice(0, 5);
      const totalKills = stats.find((s) => s.name === "total_kills")?.value || 0;
      out.cs2StatsEndpoint.totalKills = totalKills;
      out.cs2StatsEndpoint.diagnosis =
        stats.length === 0
          ? "Empty — account hasn't played CS2"
          : totalKills === 0
          ? "Stats exist but all zeros — odd, may be a fresh account"
          : "✅ Real stats found! Should display correctly.";
    } else if (r.status === 403) {
      out.cs2StatsEndpoint.diagnosis = "403 Forbidden — Your Steam profile's Game Details privacy is set to Private or Friends Only. Go to your Steam profile → Edit Profile → Privacy Settings → set 'Game details' to PUBLIC.";
    } else if (r.status === 400) {
      out.cs2StatsEndpoint.diagnosis = "400 Bad Request — This account has no CS2 stats (never played the game on this account?).";
    } else {
      out.cs2StatsEndpoint.body = (await r.text()).slice(0, 300);
    }
  } catch (e) {
    out.cs2StatsEndpoint = { error: String(e) };
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(out);
}