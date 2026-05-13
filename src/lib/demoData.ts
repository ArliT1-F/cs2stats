// Client-side demo data generator (mirrors the server one).
// Used when the user clicks "Try Demo" without signing in.

import { SUPPORTED_MAPS } from "./mapPool";
function seeded(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface WeaponStat {
  name: string;
  kills: number;
  shots: number;
  hits: number;
}

export interface MapStat {
  name: string;
  pool: "premier" | "competitive";
  rounds: number;
  wins: number;
  winRate: number;
}

export interface Stats {
  overview: {
    kills: number;
    deaths: number;
    kd: number;
    accuracy: number;
    headshotPct: number;
    wins: number;
    rounds: number;
    winRate: number;
    mvps: number;
    hoursPlayed: number;
    moneyEarned: number;
    bombsPlanted: number;
    bombsDefused: number;
  };
  weapons: WeaponStat[];
  maps: MapStat[];
}

export interface Profile {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

export interface FaceitData {
  player?: {
    nickname: string;
    avatar: string;
    country: string;
    games?: { cs2?: { skill_level: number; faceit_elo: number; region: string } };
  };
  stats?: {
    lifetime?: Record<string, string>;
    segments?: Array<{ label: string; mode: string; stats: Record<string, string> }>;
  };
}

export function generateDemoStats(seed = "demo"): Stats {
  const rng = seeded(String(seed));
  const r = (min: number, max: number) =>
    Math.floor(rng() * (max - min + 1)) + min;

  const kills = r(15000, 80000);
  const deaths = r(12000, 70000);
  const shotsFired = r(400000, 1500000);
  const shotsHit = Math.floor(shotsFired * (0.18 + rng() * 0.12));
  const headshots = Math.floor(kills * (0.35 + rng() * 0.3));
  const rounds = r(8000, 30000);
  const wins = Math.floor(rounds * (0.45 + rng() * 0.15));

  const weaponPool = [
    "AK47","M4A1-S","AWP","DEAGLE","USP-S","GLOCK","M4A4","FAMAS","GALIL",
    "SG553","AUG","MP9","MP7","UMP45","P90","NOVA","XM1014","MAC10","KNIFE","HE GRENADE",
  ];
  const weapons = weaponPool
    .map((name) => {
      const k = r(50, 8000);
      const shots = r(k * 4, k * 25);
      const hits = Math.floor(shots * (0.15 + rng() * 0.25));
      return { name, kills: k, shots, hits };
    })
    .sort((a, b) => b.kills - a.kills);

  const maps: MapStat[] = SUPPORTED_MAPS
    .map(({ name, pool }) => {
      const rds = r(200, 4000);
      const w = Math.floor(rds * (0.35 + rng() * 0.35));
      return { name, pool, rounds: rds, wins: w, winRate: +((w / rds) * 100).toFixed(1) };
    })
    .sort((a, b) => b.rounds - a.rounds);

  return {
    overview: {
      kills,
      deaths,
      kd: +(kills / deaths).toFixed(2),
      accuracy: +((shotsHit / shotsFired) * 100).toFixed(2),
      headshotPct: +((headshots / kills) * 100).toFixed(2),
      wins,
      rounds,
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

export function generateDemoProfile(seed = "demo"): Profile {
  const rng = seeded(seed + "_profile");
  const names = ["s1mple_fan","ZyW00_","Dust2Diver","NoScope_King","ClutchOrKick","HeadshotMachine","TacticalTaco","FlashbangFred","AwperKai","RushB_Now"];
  const idx = Math.floor(rng() * names.length);
  return {
    steamid: seed,
    personaname: names[idx],
    avatarfull: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f59e0b,4fb3ff,ef4444`,
    profileurl: `https://steamcommunity.com/profiles/${seed}`,
  };
}

export function generateDemoFaceit(seed = "demo"): FaceitData {
  const rng = seeded(seed + "_faceit");
  const elo = Math.floor(900 + rng() * 2400);
  const lvl = Math.min(10, Math.max(1, Math.floor((elo - 800) / 250) + 1));
  return {
    player: {
      nickname: `FCT_${seed.slice(-5)}`,
      avatar: "",
      country: ["us","de","se","ru","br","fi","dk","pl"][Math.floor(rng() * 8)],
      games: { cs2: { skill_level: lvl, faceit_elo: elo, region: "EU" } },
    },
    stats: {
      lifetime: {
        "Matches": String(Math.floor(rng() * 1500 + 100)),
        "Win Rate %": String(Math.floor(rng() * 30 + 45)),
        "Average K/D Ratio": (rng() * 1.0 + 0.8).toFixed(2),
        "Average Headshots %": String(Math.floor(rng() * 25 + 40)),
        "Longest Win Streak": String(Math.floor(rng() * 12 + 2)),
        "Current Win Streak": String(Math.floor(rng() * 5)),
      },
    },
  };
}