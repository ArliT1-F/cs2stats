import assert from "node:assert/strict";

import {
  SESSION_COOKIE,
  clearSessionCookies,
  createSessionCookies,
  createSessionValue,
  getSessionSteamId,
  verifySessionValue,
} from "./_auth.js";

process.env.STEAM_SESSION_SECRET = "unit-test-secret";

const req = {
  headers: {
    host: "example.test",
    "x-forwarded-host": "example.test",
    "x-forwarded-proto": "https",
  },
};
const steamId = "76561198084749846";
const sessionValue = createSessionValue(steamId);

assert.equal(verifySessionValue(sessionValue), steamId);
assert.equal(getSessionSteamId({ headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(sessionValue)}` } }), steamId);

assert.equal(verifySessionValue(`v1.${steamId}.invalid`), null);
assert.equal(verifySessionValue(`v1.123.invalid`), null);
assert.equal(getSessionSteamId({ headers: { cookie: `steamid=${steamId}` } }), null);
assert.throws(() => createSessionValue("not-a-steamid"), /invalid_steamid/);

const setCookies = createSessionCookies(req, steamId);
assert.equal(setCookies.length, 2);
assert.ok(setCookies[0].startsWith(`${SESSION_COOKIE}=v1.${steamId}.`));
assert.ok(setCookies[0].includes("HttpOnly"));
assert.ok(setCookies[0].includes("Secure"));
assert.ok(setCookies[1].startsWith("steamid=;"));

const clearCookies = clearSessionCookies(req);
assert.equal(clearCookies.length, 2);
assert.ok(clearCookies.every((cookie) => cookie.includes("Max-Age=0")));

console.log("auth session tests passed");
