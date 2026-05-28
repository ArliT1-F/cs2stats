import { clearSteamSessionCookies } from "../_auth.js";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearSteamSessionCookies(req));
  res.redirect(302, "/");
}
