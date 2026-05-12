// Vercel Serverless Function: Initiates Steam OpenID 2.0 login
// Redirects user to Steam's login page.

export default function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${baseUrl}/api/auth/steam/callback`,
    "openid.realm": baseUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  res.writeHead(302, {
    Location: `https://steamcommunity.com/openid/login?${params.toString()}`,
  });
  res.end();
}
