// Deterministic demo data fallback used by /api/me when API keys aren't
// configured or a user's CS2 stats are private. Lives inside /api so Vercel
// includes it in the serverless bundle.

import { SUPPORTED_MAPS } from "./_mapPool.js";

function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDemoStats(seed = "demo") {
  const rng = seeded(String(seed));
  const r = (min, max) => Math.floor(rng() * (max - min + 1)) + min;

  const kills = r(15000, 80000);
  const deaths = r(12000, 70000);
  const shotsFired = r(400000, 1500000);
  const shotsHit = Math.floor(shotsFired * (0.18 + rng() * 0.12));
  const headshots = Math.floor(kills * (0.35 + rng() * 0.30));
  const rounds = r(8000, 30000);
  const wins = Math.floor(rounds * (0.45 + rng() * 0.15));

  const weaponPool = [
    "AK47","M4A1","AWP","DEAGLE","USP-S","GLOCK","M4A4","FAMAS","GALIL",
    "SG553","AUG","MP9","MP7","UMP45","P90","NOVA","XM1014","MAC10","KNIFE","HE GRENADE"
  ];
  const weapons = weaponPool.map((name) => {
    const k = r(50, 8000);
    const shots = r(k * 4, k * 25);
    const hits = Math.floor(shots * (0.15 + rng() * 0.25));
    return { name, kills: k, shots, hits };
  }).sort((a, b) => b.kills - a.kills);

  const maps = SUPPORTED_MAPS.map(({ name, pool }) => {
    const rds = r(200, 4000);
    const w = Math.floor(rds * (0.35 + rng() * 0.35));
    return { name, pool, rounds: rds, wins: w, winRate: +((w / rds) * 100).toFixed(1) };
  }).sort((a, b) => b.rounds - a.rounds);

  return {
    overview: {
      kills, deaths,
      kd: +(kills / deaths).toFixed(2),
      accuracy: +((shotsHit / shotsFired) * 100).toFixed(2),
      headshotPct: +((headshots / kills) * 100).toFixed(2),
      wins, rounds,
      winRate: +((wins / rounds) * 100).toFixed(2),
      mvps: r(500, 5000),
      hoursPlayed: r(200, 4500),
      moneyEarned: r(50000000, 800000000),
      bombsPlanted: r(500, 6000),
      bombsDefused: r(300, 4000),
    },
    weapons,
    maps,
  };
}
