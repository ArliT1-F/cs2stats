import { clearSessionCookies } from "../_auth.js";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearSessionCookies(req));
  res.redirect(302, "/");
}
