import assert from "node:assert/strict";
import test from "node:test";

import { compareFriendsByName, filterFriends, friendDisplayName } from "./friends.js";

test("friendDisplayName falls back for missing or blank provider names", () => {
  assert.equal(friendDisplayName({ personaName: undefined }), "Unknown player");
  assert.equal(friendDisplayName({ personaName: null }), "Unknown player");
  assert.equal(friendDisplayName({ personaName: "   " }), "Unknown player");
  assert.equal(friendDisplayName({ personaName: "  clutchmate  " }), "clutchmate");
});

test("compareFriendsByName sorts malformed friend rows without throwing", () => {
  const rows = [
    { personaName: undefined },
    { personaName: "Bravo" },
    { personaName: null },
    { personaName: "alpha" },
  ];

  assert.doesNotThrow(() => rows.sort(compareFriendsByName));
  assert.deepEqual(rows.map((row) => friendDisplayName(row)), [
    "alpha",
    "Bravo",
    "Unknown player",
    "Unknown player",
  ]);
});

test("filterFriends skips malformed names safely", () => {
  const rows = [
    { personaName: undefined },
    { personaName: "Dust II Duo" },
    { personaName: null },
  ];

  assert.deepEqual(filterFriends(rows, "dust"), [rows[1]]);
  assert.deepEqual(filterFriends(rows, "unknown"), [rows[0], rows[2]]);
});
