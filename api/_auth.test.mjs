import assert from "node:assert/strict";
import test from "node:test";

import { createSteamSessionCookie, getAuthenticatedSteamId } from "./_auth.js";

const STEAM_ID = "76561198000000000";

function req(cookie = "") {
  return {
    headers: {
      cookie,
      host: "example.com",
      "x-forwarded-host": "example.com",
      "x-forwarded-proto": "https",
    },
  };
}

test("rejects unsigned legacy steamid cookies", () => {
  process.env.STEAM_SESSION_SECRET = "test-secret";

  assert.equal(getAuthenticatedSteamId(req(`steamid=${STEAM_ID}`)), null);
});

test("accepts a valid signed Steam session cookie", () => {
  process.env.STEAM_SESSION_SECRET = "test-secret";

  const setCookie = createSteamSessionCookie(req(), STEAM_ID);
  const cookie = setCookie.split(";")[0];

  assert.equal(getAuthenticatedSteamId(req(cookie)), STEAM_ID);
});

test("rejects tampered signed Steam session cookies", () => {
  process.env.STEAM_SESSION_SECRET = "test-secret";

  const setCookie = createSteamSessionCookie(req(), STEAM_ID);
  const cookie = setCookie.split(";")[0].replace(STEAM_ID, "76561198000000001");

  assert.equal(getAuthenticatedSteamId(req(cookie)), null);
});
