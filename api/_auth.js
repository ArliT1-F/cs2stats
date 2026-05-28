import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE_NAME = "steam_session";
const LEGACY_COOKIE_NAME = "steamid";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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
      // Ignore malformed cookie values instead of crashing auth-protected APIs.
    }
  }
  return cookies;
}

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.STEAM_SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    process.env.FACEIT_API_KEY;

  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-cs2stats-session-secret";
  }
  return null;
}

function signPayload(payload) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function createSessionValue(steamId) {
  const payload = Buffer.from(
    JSON.stringify({
      steamId,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    })
  ).toString("base64url");
  const signature = signPayload(payload);
  return signature ? `${payload}.${signature}` : null;
}

function verifySessionValue(value) {
  if (!value || typeof value !== "string") return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  const expected = signPayload(payload);
  if (!expected || !safeEqual(signature, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!/^\d{17}$/.test(session?.steamId || "")) return null;
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { steamId: session.steamId };
  } catch {
    return null;
  }
}

function cookieAttrs(req, maxAge) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const isHttps = (req.headers["x-forwarded-proto"] || "https") === "https"
    && !host.startsWith("localhost");
  const secureFlag = isHttps ? " Secure;" : "";
  return `Path=/; Max-Age=${maxAge}; HttpOnly;${secureFlag} SameSite=Lax`;
}

export function createSteamSessionCookies(req, steamId) {
  const sessionValue = createSessionValue(steamId);
  if (!sessionValue) return null;
  return [
    `${SESSION_COOKIE_NAME}=${sessionValue}; ${cookieAttrs(req, SESSION_MAX_AGE_SECONDS)}`,
    `${LEGACY_COOKIE_NAME}=; ${cookieAttrs(req, 0)}`,
  ];
}

export function clearSteamSessionCookies(req) {
  return [
    `${SESSION_COOKIE_NAME}=; ${cookieAttrs(req, 0)}`,
    `${LEGACY_COOKIE_NAME}=; ${cookieAttrs(req, 0)}`,
  ];
}

export function getSteamIdFromRequest(req) {
  const cookies = parseCookies(req);
  return verifySessionValue(cookies[SESSION_COOKIE_NAME])?.steamId || null;
}
