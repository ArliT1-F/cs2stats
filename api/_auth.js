import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "steam_session";
export const LEGACY_STEAM_ID_COOKIE_NAME = "steamid";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const STEAM_ID_RE = /^\d{17}$/;

function getSessionSecret() {
  return (
    process.env.STEAM_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    process.env.FACEIT_API_KEY ||
    null
  );
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
}

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export function createSteamSessionValue(steamId, nowMs = Date.now()) {
  if (!STEAM_ID_RE.test(steamId)) {
    throw new Error("invalid_steam_id");
  }
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("missing_session_secret");
  }

  const payload = {
    v: 1,
    steamId,
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const data = base64Url(JSON.stringify(payload));
  return `${data}.${sign(data, secret)}`;
}

export function verifySteamSessionValue(value, nowMs = Date.now()) {
  const secret = getSessionSecret();
  if (!secret || !value) return null;

  const [data, signature, ...extra] = String(value).split(".");
  if (!data || !signature || extra.length > 0) return null;

  const expected = sign(data, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload?.v !== 1 || !STEAM_ID_RE.test(payload.steamId)) return null;
    if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(nowMs / 1000)) {
      return null;
    }
    return payload.steamId;
  } catch {
    return null;
  }
}

export function getSessionSteamId(req) {
  const cookies = parseCookies(req);
  return verifySteamSessionValue(cookies[SESSION_COOKIE_NAME]);
}

function secureFlag(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const isHttps = (req.headers["x-forwarded-proto"] || "https") === "https"
    && !host.startsWith("localhost");
  return isHttps ? " Secure;" : "";
}

export function createSteamSessionCookie(req, steamId) {
  const value = encodeURIComponent(createSteamSessionValue(steamId));
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly;${secureFlag(req)} SameSite=Lax`;
}

export function clearSteamSessionCookies(req) {
  const secure = secureFlag(req);
  return [
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly;${secure} SameSite=Lax`,
    `${LEGACY_STEAM_ID_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly;${secure} SameSite=Lax`,
  ];
}
