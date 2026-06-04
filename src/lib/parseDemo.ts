export type DemoTeamSide = "T" | "CT";

export interface DemoMapInfo {
    name: string;
    displayName: string;
    // Normalized radar coordinates. Real parser workers should convert Source 2
    // world coordinates into this 0-100 plane before sending data to the client.
    coordinateMode: "normalized";
}

export interface DemoPlayer {
    steamId: string;
    name: string;
    team: DemoTeamSide;
    color: string; // Hex color code for this player's team (e.g. "#FF0000")
}

export interface DemoPlayerState {
    steamId: string;
    x: number; // Normalized 0-100 coordinate
    y: number;
    yawDeg: number; // 0-360, where 0 = facing "up" on the radar, increasing clockwise
    hp: number; // 0-100
    armor: number; // 0-100
    weapon: string;
    alive: boolean;
}

export interface DemoKillEvent {
    id: string;
  round: number;
  tick: number;
  timeSeconds: number;
  attackerSteamId: string;
  victimSteamId: string;
  assisterSteamId?: string | null;
  weapon: string;
  headshot: boolean;
  throughSmoke: boolean;
  wallbang: boolean;
  blind: boolean;
  attacker: DemoPlayerState;
  victim: DemoPlayerState;
  snapshot: DemoPlayerState[];
}

export interface ParsedDemoMatch {
  id: string;
  source: "sample" | "faceit" | "valve-mm";
  map: DemoMapInfo;
  tickRate: number;
  durationSeconds: number;
  score: { t: number; ct: number };
  players: DemoPlayer[];
  kills: DemoKillEvent[];
}

export const SAMPLE_PARSED_DEMO: ParsedDemoMatch = {
  id: "sample-mirage-rounds",
  source: "sample",
  map: {
    name: "de_mirage",
    displayName: "Mirage",
    coordinateMode: "normalized",
  },
  tickRate: 64,
  durationSeconds: 612,
  score: { t: 9, ct: 6 },
  players: [
    { steamId: "p1", name: "EntryFraggin", team: "T", color: "#f59e0b" },
    { steamId: "p2", name: "LurkLord", team: "T", color: "#fb923c" },
    { steamId: "p3", name: "AwpAddict", team: "T", color: "#facc15" },
    { steamId: "p4", name: "SmokeMaster", team: "T", color: "#fde68a" },
    { steamId: "p5", name: "ClutchOrKick", team: "T", color: "#fdba74" },
    { steamId: "p6", name: "AnchorKai", team: "CT", color: "#38bdf8" },
    { steamId: "p7", name: "WindowWolf", team: "CT", color: "#60a5fa" },
    { steamId: "p8", name: "TicketTapper", team: "CT", color: "#22d3ee" },
    { steamId: "p9", name: "BShorty", team: "CT", color: "#93c5fd" },
    { steamId: "p10", name: "NinjaDef", team: "CT", color: "#67e8f9" },
  ],
  kills: [
    {
      id: "r3-k1",
      round: 3,
      tick: 10324,
      timeSeconds: 48,
      attackerSteamId: "p1",
      victimSteamId: "p7",
      assisterSteamId: "p4",
      weapon: "AK-47",
      headshot: true,
      throughSmoke: false,
      wallbang: false,
      blind: false,
      attacker: { steamId: "p1", x: 37, y: 46, yawDeg: 24, hp: 88, armor: 92, weapon: "AK-47", alive: true },
      victim: { steamId: "p7", x: 58, y: 39, yawDeg: 201, hp: 0, armor: 77, weapon: "M4A1-S", alive: false },
      snapshot: [
        { steamId: "p1", x: 37, y: 46, yawDeg: 24, hp: 88, armor: 92, weapon: "AK-47", alive: true },
        { steamId: "p2", x: 25, y: 64, yawDeg: 10, hp: 100, armor: 100, weapon: "Galil AR", alive: true },
        { steamId: "p3", x: 43, y: 71, yawDeg: 314, hp: 100, armor: 100, weapon: "AWP", alive: true },
        { steamId: "p4", x: 34, y: 51, yawDeg: 18, hp: 94, armor: 100, weapon: "MAC-10", alive: true },
        { steamId: "p5", x: 18, y: 82, yawDeg: 42, hp: 100, armor: 100, weapon: "Tec-9", alive: true },
        { steamId: "p6", x: 71, y: 36, yawDeg: 194, hp: 100, armor: 100, weapon: "M4A4", alive: true },
        { steamId: "p7", x: 58, y: 39, yawDeg: 201, hp: 0, armor: 77, weapon: "M4A1-S", alive: false },
        { steamId: "p8", x: 75, y: 51, yawDeg: 234, hp: 100, armor: 100, weapon: "FAMAS", alive: true },
        { steamId: "p9", x: 64, y: 73, yawDeg: 271, hp: 100, armor: 100, weapon: "MP9", alive: true },
        { steamId: "p10", x: 79, y: 84, yawDeg: 225, hp: 100, armor: 100, weapon: "USP-S", alive: true },
      ],
    },
    {
      id: "r3-k2",
      round: 3,
      tick: 11192,
      timeSeconds: 61,
      attackerSteamId: "p8",
      victimSteamId: "p4",
      assisterSteamId: null,
      weapon: "FAMAS",
      headshot: false,
      throughSmoke: true,
      wallbang: false,
      blind: false,
      attacker: { steamId: "p8", x: 74, y: 51, yawDeg: 246, hp: 72, armor: 100, weapon: "FAMAS", alive: true },
      victim: { steamId: "p4", x: 47, y: 53, yawDeg: 74, hp: 0, armor: 63, weapon: "MAC-10", alive: false },
      snapshot: [
        { steamId: "p1", x: 53, y: 41, yawDeg: 88, hp: 88, armor: 92, weapon: "AK-47", alive: true },
        { steamId: "p2", x: 32, y: 66, yawDeg: 350, hp: 100, armor: 100, weapon: "Galil AR", alive: true },
        { steamId: "p3", x: 49, y: 68, yawDeg: 323, hp: 100, armor: 100, weapon: "AWP", alive: true },
        { steamId: "p4", x: 47, y: 53, yawDeg: 74, hp: 0, armor: 63, weapon: "MAC-10", alive: false },
        { steamId: "p5", x: 24, y: 77, yawDeg: 39, hp: 100, armor: 100, weapon: "Tec-9", alive: true },
        { steamId: "p6", x: 68, y: 34, yawDeg: 205, hp: 100, armor: 100, weapon: "M4A4", alive: true },
        { steamId: "p7", x: 58, y: 39, yawDeg: 201, hp: 0, armor: 77, weapon: "M4A1-S", alive: false },
        { steamId: "p8", x: 74, y: 51, yawDeg: 246, hp: 72, armor: 100, weapon: "FAMAS", alive: true },
        { steamId: "p9", x: 61, y: 72, yawDeg: 283, hp: 100, armor: 100, weapon: "MP9", alive: true },
        { steamId: "p10", x: 75, y: 79, yawDeg: 237, hp: 100, armor: 100, weapon: "USP-S", alive: true },
      ],
    },
    {
      id: "r9-k1",
      round: 9,
      tick: 37214,
      timeSeconds: 36,
      attackerSteamId: "p3",
      victimSteamId: "p6",
      assisterSteamId: null,
      weapon: "AWP",
      headshot: false,
      throughSmoke: false,
      wallbang: true,
      blind: false,
      attacker: { steamId: "p3", x: 44, y: 75, yawDeg: 300, hp: 100, armor: 100, weapon: "AWP", alive: true },
      victim: { steamId: "p6", x: 66, y: 36, yawDeg: 167, hp: 0, armor: 100, weapon: "M4A4", alive: false },
      snapshot: [
        { steamId: "p1", x: 29, y: 52, yawDeg: 15, hp: 100, armor: 100, weapon: "AK-47", alive: true },
        { steamId: "p2", x: 54, y: 77, yawDeg: 274, hp: 100, armor: 100, weapon: "AK-47", alive: true },
        { steamId: "p3", x: 44, y: 75, yawDeg: 300, hp: 100, armor: 100, weapon: "AWP", alive: true },
        { steamId: "p4", x: 39, y: 57, yawDeg: 25, hp: 100, armor: 100, weapon: "MAC-10", alive: true },
        { steamId: "p5", x: 21, y: 81, yawDeg: 32, hp: 100, armor: 100, weapon: "Tec-9", alive: true },
        { steamId: "p6", x: 66, y: 36, yawDeg: 167, hp: 0, armor: 100, weapon: "M4A4", alive: false },
        { steamId: "p7", x: 55, y: 38, yawDeg: 189, hp: 100, armor: 100, weapon: "AWP", alive: true },
        { steamId: "p8", x: 72, y: 49, yawDeg: 231, hp: 100, armor: 100, weapon: "M4A1-S", alive: true },
        { steamId: "p9", x: 64, y: 68, yawDeg: 276, hp: 100, armor: 100, weapon: "MP9", alive: true },
        { steamId: "p10", x: 78, y: 78, yawDeg: 246, hp: 100, armor: 100, weapon: "Five-SeveN", alive: true },
      ],
    },
    {
      id: "r14-k1",
      round: 14,
      tick: 54801,
      timeSeconds: 74,
      attackerSteamId: "p10",
      victimSteamId: "p2",
      assisterSteamId: "p9",
      weapon: "M4A1-S",
      headshot: true,
      throughSmoke: false,
      wallbang: false,
      blind: true,
      attacker: { steamId: "p10", x: 72, y: 80, yawDeg: 302, hp: 24, armor: 46, weapon: "M4A1-S", alive: true },
      victim: { steamId: "p2", x: 61, y: 66, yawDeg: 133, hp: 0, armor: 89, weapon: "AK-47", alive: false },
      snapshot: [
        { steamId: "p1", x: 53, y: 48, yawDeg: 69, hp: 42, armor: 63, weapon: "AK-47", alive: true },
        { steamId: "p2", x: 61, y: 66, yawDeg: 133, hp: 0, armor: 89, weapon: "AK-47", alive: false },
        { steamId: "p3", x: 46, y: 73, yawDeg: 314, hp: 64, armor: 91, weapon: "AWP", alive: true },
        { steamId: "p4", x: 44, y: 58, yawDeg: 54, hp: 0, armor: 0, weapon: "Galil AR", alive: false },
        { steamId: "p5", x: 64, y: 69, yawDeg: 19, hp: 79, armor: 100, weapon: "MAC-10", alive: true },
        { steamId: "p6", x: 66, y: 39, yawDeg: 209, hp: 0, armor: 0, weapon: "M4A4", alive: false },
        { steamId: "p7", x: 57, y: 43, yawDeg: 211, hp: 0, armor: 0, weapon: "AWP", alive: false },
        { steamId: "p8", x: 70, y: 52, yawDeg: 233, hp: 0, armor: 0, weapon: "FAMAS", alive: false },
        { steamId: "p9", x: 68, y: 72, yawDeg: 286, hp: 54, armor: 82, weapon: "MP9", alive: true },
        { steamId: "p10", x: 72, y: 80, yawDeg: 302, hp: 24, armor: 46, weapon: "M4A1-S", alive: true },
      ],
    },
  ],
};

export function findDemoPlayer(match: ParsedDemoMatch, steamId: string): DemoPlayer | null {
  return match.players.find((player) => player.steamId === steamId) || null;
}