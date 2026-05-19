import assert from "node:assert/strict";
import test from "node:test";

import { createSteamSessionCookie } from "./_auth.js";
import handler from "./live.js";

const OWNER_STEAM_ID = "76561198000000000";
const VICTIM_STEAM_ID = "76561198000000001";

function req(url, cookie = "") {
  return {
    url,
    headers: {
      cookie,
      host: "example.com",
      "x-forwarded-host": "example.com",
      "x-forwarded-proto": "https",
    },
  };
}

function res() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("live status ignores query steamid and uses signed session owner", async () => {
  process.env.STEAM_SESSION_SECRET = "test-secret";
  process.env.STEAM_API_KEY = "steam-key";

  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        response: {
          players: [{
            steamid: OWNER_STEAM_ID,
            personaname: "Owner",
            personastate: 1,
            gameid: "730",
          }],
        },
      }),
    };
  };

  try {
    const sessionCookie = createSteamSessionCookie(req("/"), OWNER_STEAM_ID).split(";")[0];
    const response = res();
    await handler(req(`/api/live?steamid=${VICTIM_STEAM_ID}`, sessionCookie), response);

    assert.equal(response.statusCode, 200);
    assert.match(requestedUrl, new RegExp(`steamids=${OWNER_STEAM_ID}`));
    assert.doesNotMatch(requestedUrl, new RegExp(VICTIM_STEAM_ID));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
