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

export interface FaceitMatchPlayer {
  playerId: string;
  nickname: string;
  avatar?: string | null;
  country?: string | null;
  skillLevel?: number | null;
  elo?: number | null;
  isMe: boolean;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  kdRatio: number | null;
  krRatio: number | null;
  adr: number | null;
  headshots: number | null;
  headshotsPct: number | null;
  mvps: number | null;
  tripleKills: number | null;
  quadroKills: number | null;
  pentaKills: number | null;
}

export interface FaceitMatchTeam {
  teamId: string;
  name: string;
  avatar?: string | null;
  score: number | null;
  won: boolean | null;
  firstHalfScore: number | null;
  secondHalfScore: number | null;
  overtimeScore: number | null;
  players: FaceitMatchPlayer[];
}

export interface FaceitMatch {
  matchId: string;
  map: string;
  score: string;
  won: boolean | null;
  finishedAt: number;
  competition: string;
  matchUrl: string;
  demoUrl: string | null;
  teams: FaceitMatchTeam[];
  // Convenience: my own stats
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  kdRatio: number | null;
  krRatio: number | null;
  adr: number | null;
  headshotsPct: number | null;
  mvps: number | null;
  tripleKills: number | null;
  quadroKills: number | null;
  pentaKills: number | null;
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
  matches?: FaceitMatch[];
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

  const mapPool = ["Mirage","Dust II","Inferno","Nuke","Anubis","Ancient","Overpass","Train"];
  const segments = mapPool.map((m) => {
    const matches = Math.floor(rng() * 80 + 5);
    const winRate = Math.floor(rng() * 40 + 35);
    return {
      label: m,
      mode: "5v5",
      stats: {
        "Matches": String(matches),
        "Wins": String(Math.floor(matches * winRate / 100)),
        "Win Rate %": String(winRate),
        "Average K/D Ratio": (rng() * 0.8 + 0.7).toFixed(2),
        "Average Headshots %": String(Math.floor(rng() * 25 + 40)),
      },
    };
  });

  // Pool of fake nicknames + countries for demo team rosters
  const fakeNicks = [
    "ZyW00", "Dust2Diver", "AwperKai", "TacoTactics", "CrispyClutch",
    "FlashFred", "NinjaDef", "RushBro", "ScopeKing", "EcoEnjoyer",
    "BananaCT", "MidControl", "EntryFraggin", "LurkLord", "PistolPete",
    "OneTapWonder", "SmokeMaster", "FlashBangBoy", "AwpAddict", "RetakeRiot",
  ];
  const countries = ["us","de","se","ru","br","fi","dk","pl","fr","gb","ca","no"];

  const buildPlayer = (idx: number, isMe: boolean, totalKills: number, rounds: number): FaceitMatchPlayer => {
    const nick = isMe ? `FCT_${seed.slice(-5)}` : fakeNicks[idx % fakeNicks.length] + Math.floor(rng() * 99);
    const k = totalKills;
    const d = Math.floor(8 + rng() * 22);
    const a = Math.floor(rng() * 8);
    const adr = Math.floor(40 + rng() * 80);
    const lvl = Math.min(10, Math.max(1, lvl_ + Math.floor((rng() - 0.5) * 4)));
    return {
      playerId: `demo-player-${seed}-${idx}-${isMe ? "me" : "x"}`,
      nickname: nick,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nick)}&backgroundColor=f59e0b,4fb3ff,ef4444,22c55e`,
      country: countries[Math.floor(rng() * countries.length)],
      skillLevel: lvl,
      elo: 800 + lvl * 250 + Math.floor(rng() * 200),
      isMe,
      kills: k, deaths: d, assists: a,
      kdRatio: +(k / Math.max(d, 1)).toFixed(2),
      krRatio: +(k / Math.max(rounds, 1)).toFixed(2),
      adr,
      headshots: Math.floor(k * (0.35 + rng() * 0.4)),
      headshotsPct: Math.floor(35 + rng() * 35),
      mvps: Math.floor(rng() * 5),
      tripleKills: Math.floor(rng() * 3),
      quadroKills: rng() > 0.7 ? 1 : 0,
      pentaKills: rng() > 0.92 ? 1 : 0,
    };
  };

  const lvl_ = lvl;

  const buildTeam = (factionId: string, name: string, score: number, won: boolean, includesMe: boolean, rounds: number): FaceitMatchTeam => {
    const teamSize = 5;
    const baseKillCount = Math.floor(rounds * 0.8);
    const players: FaceitMatchPlayer[] = Array.from({ length: teamSize }, (_, i) => {
      const isMe = includesMe && i === 0;
      const variance = Math.floor((rng() - 0.5) * 18);
      const k = Math.max(2, baseKillCount / teamSize + variance);
      return buildPlayer(i + (factionId === "f2" ? 5 : 0), isMe, Math.floor(k), rounds);
    });
    players.sort((a, b) => (b.kills || 0) - (a.kills || 0));
    return {
      teamId: factionId,
      name,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}&backgroundColor=11172a`,
      score,
      won,
      firstHalfScore: Math.floor(score * 0.5 + (rng() - 0.5) * 4),
      secondHalfScore: Math.floor(score * 0.5),
      overtimeScore: null,
      players,
    };
  };

  const teamNames = [
    ["team OMEGA", "team SIGMA"], ["VIKINGS", "RONIN"], ["NOVA", "PULSE"],
    ["APEX", "ZENITH"], ["FALLEN", "RISEN"], ["TITAN", "GIANTS"],
    ["RECON", "STRIKE"], ["GHOST", "PHANTOM"], ["FROST", "BLAZE"], ["CRIMSON", "AZURE"],
  ];

  // Generate 10 fake recent matches
  const now = Math.floor(Date.now() / 1000);
  const matches: FaceitMatch[] = Array.from({ length: 10 }, (_, i) => {
    const map = mapPool[Math.floor(rng() * mapPool.length)];
    const won = rng() > 0.45;
    const ourScore = won ? 13 : Math.floor(rng() * 12);
    const theirScore = won ? Math.floor(rng() * 12) : 13;
    const totalRounds = ourScore + theirScore;
    const [aName, bName] = teamNames[i % teamNames.length];
    const teamA = buildTeam("f1", aName, ourScore, won, true, totalRounds);
    const teamB = buildTeam("f2", bName, theirScore, !won, false, totalRounds);
    const me = teamA.players.find((p) => p.isMe)!;
    return {
      matchId: `1-${seed}-demo-${i}`,
      map,
      score: `${ourScore} / ${theirScore}`,
      won,
      finishedAt: now - i * 86400 - Math.floor(rng() * 40000),
      competition: i < 2 ? "FACEIT 5v5 RANKED" : "FACEIT 5v5",
      matchUrl: `https://www.faceit.com/en/cs2/room/1-${seed}-demo-${i}`,
      demoUrl: null,
      teams: [teamA, teamB],
      kills: me.kills, deaths: me.deaths, assists: me.assists,
      kdRatio: me.kdRatio, krRatio: me.krRatio, adr: me.adr,
      headshotsPct: me.headshotsPct, mvps: me.mvps,
      tripleKills: me.tripleKills, quadroKills: me.quadroKills, pentaKills: me.pentaKills,
    };
  });

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
      segments,
    },
    matches,
  };
}
