import assert from "node:assert/strict";
import test from "node:test";

import {
  getSteamIdFromRequest,
  parseCookies,
  signSteamSession,
  verifySteamSession,
} from "./_auth.js";

process.env.SESSION_SECRET = "test-session-secret";

test("signed Steam sessions verify the original SteamID", () => {
  const token = signSteamSession("76561198000000000", 1_700_000_000_000);

  assert.equal(verifySteamSession(token, 1_700_000_001_000), "76561198000000000");
});

test("tampered Steam sessions are rejected", () => {
  const token = signSteamSession("76561198000000000", 1_700_000_000_000);
  const [payload, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ v: 1, steamId: "76561198111111111", exp: 1_800_000_000 }),
    "utf8"
  ).toString("base64url");

  assert.equal(verifySteamSession(`${tamperedPayload}.${signature}`, 1_700_000_001_000), null);
  assert.notEqual(payload, tamperedPayload);
});

test("raw legacy steamid cookies are ignored", () => {
  const req = { headers: { cookie: "steamid=76561198000000000" } };

  assert.equal(getSteamIdFromRequest(req), null);
});

test("malformed cookie pairs do not crash parsing", () => {
  assert.deepEqual(parseCookies({ headers: { cookie: "steam_session=%; ok=value" } }), { ok: "value" });
});
