import assert from "node:assert/strict";
import { test } from "node:test";

async function importFreshPriceCache() {
  const moduleUrl = new URL("./_priceCache.js", import.meta.url);
  moduleUrl.searchParams.set("t", `${Date.now()}-${Math.random()}`);
  return import(moduleUrl.href);
}

test("concurrent price loads for different sources return source-matched data", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const urlString = String(url);
    calls.push(urlString);
    if (urlString.includes("/steam.json")) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: true,
        json: async () => ({
          "AK-47 | Asiimov (Field-Tested)": { last_24h: 92.55 },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        "AK-47 | Asiimov (Field-Tested)": { starting_at: { price: 71.25 } },
      }),
    };
  };

  try {
    const { getPricesBulk } = await importFreshPriceCache();
    const names = ["AK-47 | Asiimov (Field-Tested)"];

    const steamPromise = getPricesBulk(names, "steam");
    const buffPromise = getPricesBulk(names, "buff163");
    const [steamPrices, buffPrices] = await Promise.all([steamPromise, buffPromise]);

    assert.equal(steamPrices[names[0]].lowestPrice, 92.55);
    assert.equal(buffPrices[names[0]].lowestPrice, 71.25);
    assert.equal(calls.filter((url) => url.includes("/steam.json")).length, 1);
    assert.equal(calls.filter((url) => url.includes("/buff163.json")).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
