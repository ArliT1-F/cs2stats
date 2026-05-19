import { clearAuthCookies } from "../_auth.js";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearAuthCookies(req));
  res.redirect(302, "/");
}
