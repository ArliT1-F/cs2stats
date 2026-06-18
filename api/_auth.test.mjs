import assert from "node:assert/strict";

import {
  createSteamSessionCookie,
  createSteamSessionValue,
  getSessionSteamId,
  SESSION_COOKIE_NAME,
  verifySteamSessionValue,
} from "./_auth.js";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.STEAM_SESSION_SECRET;
  delete process.env.SESSION_SECRET;
  delete process.env.STEAM_API_KEY;
  delete process.env.FACEIT_API_KEY;
}

function reqWithCookie(cookie) {
  return {
    headers: {
      cookie,
      host: "example.test",
      "x-forwarded-proto": "https",
    },
  };
}

try {
  resetEnv();
  process.env.STEAM_SESSION_SECRET = "test-session-secret-with-enough-entropy";

  const steamId = "76561198000000000";
  const now = Date.UTC(2026, 4, 29);
  const value = createSteamSessionValue(steamId, now);

  assert.equal(verifySteamSessionValue(value, now), steamId);
  assert.equal(getSessionSteamId(reqWithCookie(`${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`)), steamId);

  const forgedPayload = value.replace(/.$/, value.endsWith("a") ? "b" : "a");
  assert.equal(verifySteamSessionValue(forgedPayload, now), null);
  assert.equal(getSessionSteamId(reqWithCookie(`steamid=${steamId}`)), null);

  const expired = createSteamSessionValue(steamId, now);
  assert.equal(verifySteamSessionValue(expired, now + 8 * 24 * 60 * 60 * 1000), null);

  resetEnv();
  assert.throws(() => createSteamSessionValue(steamId), /missing_session_secret/);

  resetEnv();
  process.env.SESSION_SECRET = "another-test-session-secret";
  const cookie = createSteamSessionCookie(reqWithCookie(""), steamId);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax$/);
} finally {
  process.env = ORIGINAL_ENV;
}
