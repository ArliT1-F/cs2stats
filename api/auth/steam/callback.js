// Vercel Serverless Function: Steam OpenID callback
// Verifies the OpenID response, extracts the SteamID64, sets a cookie,
// and redirects back to the app.

import { clearSteamSessionCookies, createSteamSessionCookie } from "../../_auth.js";

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const url = new URL(req.url, baseUrl);
  const params = new URLSearchParams(url.search);

  // Build verification request: copy all openid.* params, change mode to check_authentication
  const verifyParams = new URLSearchParams();
  for (const [k, v] of params.entries()) {
    if (k.startsWith("openid.")) verifyParams.append(k, v);
  }
  verifyParams.set("openid.mode", "check_authentication");

  try {
    const verifyResp = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyParams.toString(),
    });
    const text = await verifyResp.text();
    if (!text.includes("is_valid:true")) {
      return res.redirect(302, `/?auth=failed`);
    }

    const claimedId = params.get("openid.claimed_id") || "";
    const match = claimedId.match(/\/id\/(\d+)$/);
    if (!match) return res.redirect(302, `/?auth=failed`);
    const steamId = match[1];

    const sessionCookie = createSteamSessionCookie(req, steamId);
    res.setHeader(
      "Set-Cookie",
      [sessionCookie, ...clearSteamSessionCookies(req).slice(1)]
    );
    res.redirect(302, `/?auth=success&steamid=${steamId}`);
  } catch (e) {
    res.redirect(302, `/?auth=failed`);
  }
}
