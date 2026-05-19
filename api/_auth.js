import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "steam_session";
const LEGACY_STEAM_COOKIE = "steamid";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const STEAM_ID_RE = /^7656119\d{10}$/;

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  if (!header) return {};

  const cookies = {};
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    const value = rawValue.join("=");
    try {
      cookies[rawKey] = decodeURIComponent(value);
    } catch {
      cookies[rawKey] = value;
    }
  }
  return cookies;
}

function getSessionSecret() {
  return (
    process.env.STEAM_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    process.env.FACEIT_API_KEY ||
    ""
  );
}

function isHttpsRequest(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  return (req.headers["x-forwarded-proto"] || "https") === "https" && !host.startsWith("localhost");
}

function serializeCookie(req, name, value, maxAge) {
  const secureFlag = isHttpsRequest(req) ? " Secure;" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly;${secureFlag} SameSite=Lax`;
}

function signSession(steamId, expiresAt, secret) {
  return createHmac("sha256", secret)
    .update(`${steamId}.${expiresAt}`)
    .digest("hex");
}

function signaturesEqual(a, b) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function createSteamSessionCookie(req, steamId) {
  if (!STEAM_ID_RE.test(steamId)) {
    throw new Error("invalid_steamid");
  }

  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("missing_session_secret");
  }

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const signature = signSession(steamId, expiresAt, secret);
  return serializeCookie(req, SESSION_COOKIE, `${steamId}.${expiresAt}.${signature}`, SESSION_MAX_AGE_SECONDS);
}

export function clearAuthCookies(req) {
  return [
    serializeCookie(req, SESSION_COOKIE, "", 0),
    serializeCookie(req, LEGACY_STEAM_COOKIE, "", 0),
  ];
}

export function getAuthenticatedSteamId(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const [steamId, expiresAtRaw, signature] = token.split(".");
  if (!STEAM_ID_RE.test(steamId || "")) return null;
  if (!/^\d+$/.test(expiresAtRaw || "")) return null;
  if (!/^[a-f0-9]{64}$/.test(signature || "")) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  const secret = getSessionSecret();
  if (!secret) return null;

  const expected = signSession(steamId, expiresAt, secret);
  if (!signaturesEqual(signature, expected)) return null;

  return steamId;
}
