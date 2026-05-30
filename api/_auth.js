import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "steam_session";
const LEGACY_STEAM_COOKIE = "steamid";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const STEAM_ID64_RE = /^7656119\d{10}$/;

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  if (!header) return {};
  const cookies = {};
  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    try {
      cookies[rawName] = decodeURIComponent(rawValue.join("="));
    } catch {
      cookies[rawName] = rawValue.join("=");
    }
  }
  return cookies;
}

function sessionSecret() {
  return (
    process.env.STEAM_SESSION_SECRET ||
    process.env.COOKIE_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.STEAM_API_KEY ||
    process.env.FACEIT_API_KEY ||
    null
  );
}

function signSteamId(steamId) {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error("missing_session_secret");
  }
  return createHmac("sha256", secret)
    .update(`steam_session:${steamId}`)
    .digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionValue(steamId) {
  if (!STEAM_ID64_RE.test(steamId)) {
    throw new Error("invalid_steamid");
  }
  return `v1.${steamId}.${signSteamId(steamId)}`;
}

export function verifySessionValue(value) {
  if (!value) return null;
  const [version, steamId, signature] = String(value).split(".");
  if (version !== "v1" || !STEAM_ID64_RE.test(steamId) || !signature) {
    return null;
  }
  try {
    return safeEqual(signature, signSteamId(steamId)) ? steamId : null;
  } catch {
    return null;
  }
}

export function getSessionSteamId(req) {
  return verifySessionValue(parseCookies(req)[SESSION_COOKIE]);
}

function isSecureRequest(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return proto === "https" && !String(host).startsWith("localhost");
}

function cookieAttributes(req, maxAge) {
  const attrs = ["Path=/", `Max-Age=${maxAge}`, "HttpOnly"];
  if (isSecureRequest(req)) attrs.push("Secure");
  attrs.push("SameSite=Lax");
  return attrs.join("; ");
}

export function createSessionCookies(req, steamId) {
  const session = `${SESSION_COOKIE}=${encodeURIComponent(createSessionValue(steamId))}; ${cookieAttributes(req, SESSION_MAX_AGE_SECONDS)}`;
  const clearLegacy = `${LEGACY_STEAM_COOKIE}=; ${cookieAttributes(req, 0)}`;
  return [session, clearLegacy];
}

export function clearSessionCookies(req) {
  return [
    `${SESSION_COOKIE}=; ${cookieAttributes(req, 0)}`,
    `${LEGACY_STEAM_COOKIE}=; ${cookieAttributes(req, 0)}`,
  ];
}
