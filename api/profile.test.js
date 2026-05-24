import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import handler from "./profile/[steamid].js";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_STEAM_KEY = process.env.STEAM_API_KEY;
const ORIGINAL_FACEIT_KEY = process.env.FACEIT_API_KEY;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  restoreEnv("STEAM_API_KEY", ORIGINAL_STEAM_KEY);
  restoreEnv("FACEIT_API_KEY", ORIGINAL_FACEIT_KEY);
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function invokeProfile(steamId) {
  const req = {
    url: `/api/profile/${steamId}`,
    headers: { host: "example.test" },
    query: {},
  };
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await handler(req, res);
  return res;
}

test("public profile does not generate demo stats when Steam is not configured", async () => {
  const steamId = "76561198000000001";
  delete process.env.STEAM_API_KEY;
  delete process.env.FACEIT_API_KEY;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return jsonResponse({});
  };

  const res = await invokeProfile(steamId);

  assert.equal(res.statusCode, 503);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.error, "no_steam_key");
  assert.equal(res.body.usedDemo, false);
  assert.equal(res.body.stats, undefined);
  assert.equal(fetchCalled, false);
});

test("public profile does not generate demo stats for private Steam stats", async () => {
  const steamId = "76561198000000002";
  process.env.STEAM_API_KEY = "steam-key";
  delete process.env.FACEIT_API_KEY;
  global.fetch = async (url) => {
    const href = String(url);
    if (href.includes("GetPlayerSummaries")) {
      return jsonResponse({
        response: {
          players: [{ steamid: steamId, personaname: "Private Player" }],
        },
      });
    }
    if (href.includes("GetUserStatsForGame")) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = await invokeProfile(steamId);

  assert.equal(res.statusCode, 403);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.error, "private_profile");
  assert.equal(res.body.usedDemo, false);
  assert.equal(res.body.stats, undefined);
});

test("public profile marks zero Steam stats unavailable instead of caching seeded demo data", async () => {
  const steamId = "76561198000000003";
  process.env.STEAM_API_KEY = "steam-key";
  delete process.env.FACEIT_API_KEY;
  global.fetch = async (url) => {
    const href = String(url);
    if (href.includes("GetPlayerSummaries")) {
      return jsonResponse({
        response: {
          players: [{ steamid: steamId, personaname: "New Player" }],
        },
      });
    }
    if (href.includes("GetUserStatsForGame")) {
      return jsonResponse({
        playerstats: {
          stats: [
            { name: "total_kills", value: 0 },
            { name: "total_deaths", value: 0 },
            { name: "total_rounds_played", value: 0 },
          ],
        },
      });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = await invokeProfile(steamId);

  assert.equal(res.statusCode, 404);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.equal(res.body.error, "no_cs2_stats");
  assert.equal(res.body.usedDemo, false);
  assert.equal(res.body.stats, undefined);
});

test("public profile still returns and caches real Steam stats", async () => {
  const steamId = "76561198000000004";
  process.env.STEAM_API_KEY = "steam-key";
  delete process.env.FACEIT_API_KEY;
  global.fetch = async (url) => {
    const href = String(url);
    if (href.includes("GetPlayerSummaries")) {
      return jsonResponse({
        response: {
          players: [{ steamid: steamId, personaname: "Public Player" }],
        },
      });
    }
    if (href.includes("GetUserStatsForGame")) {
      return jsonResponse({
        playerstats: {
          stats: [
            { name: "total_kills", value: 12 },
            { name: "total_deaths", value: 6 },
            { name: "total_rounds_played", value: 20 },
            { name: "total_wins", value: 11 },
          ],
        },
      });
    }
    throw new Error(`unexpected fetch: ${href}`);
  };

  const res = await invokeProfile(steamId);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "public, max-age=300");
  assert.equal(res.body.usedDemo, false);
  assert.equal(res.body.demoReason, null);
  assert.equal(res.body.stats.overview.kills, 12);
  assert.equal(res.body.stats.overview.deaths, 6);
});
