import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "steam_session";
export const LEGACY_STEAMID_COOKIE = "steamid";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const STEAM_ID_RE = /^\d{17}$/;

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  if (!header) return {};

  const cookies = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    try {
      cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    } catch {
      // Ignore malformed cookie pairs instead of letting auth endpoints 500.
    }
  }
  return cookies;
}

export function createSteamSessionCookie(req, steamId) {
  return buildCookie(SESSION_COOKIE, signSteamSession(steamId), {
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: shouldUseSecureCookie(req),
  });
}

export function clearAuthCookies(req) {
  const secure = shouldUseSecureCookie(req);
  return [
    buildCookie(SESSION_COOKIE, "", { maxAge: 0, secure }),
    buildCookie(LEGACY_STEAMID_COOKIE, "", { maxAge: 0, secure }),
  ];
}

export function getSteamIdFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySteamSession(cookies[SESSION_COOKIE]);
}

export function signSteamSession(steamId, now = Date.now()) {
  if (!STEAM_ID_RE.test(steamId)) {
    throw new Error("invalid_steamid");
  }

  const payload = base64UrlEncode(JSON.stringify({
    v: 1,
    steamId,
    exp: Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS,
  }));
  return `${payload}.${hmac(payload)}`;
}

export function verifySteamSession(value, now = Date.now()) {
  if (!value || typeof value !== "string") return null;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!safeEqual(signature, hmac(payload))) return null;

  let session;
  try {
    session = JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }

  if (session?.v !== 1 || !STEAM_ID_RE.test(session.steamId)) return null;
  if (typeof session.exp !== "number" || session.exp <= Math.floor(now / 1000)) return null;
  return session.steamId;
}

function buildCookie(name, value, { maxAge, secure }) {
  const secureFlag = secure ? " Secure;" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly;${secureFlag} SameSite=Lax`;
}

function shouldUseSecureCookie(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return proto === "https" && !host.startsWith("localhost");
}

function hmac(value) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.STEAM_SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    process.env.FACEIT_API_KEY;

  if (secret) return secret;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    return "cs2stats-local-development-session-secret";
  }
  throw new Error("SESSION_SECRET or STEAM_API_KEY must be configured for signed sessions");
}

function safeEqual(a, b) {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}
