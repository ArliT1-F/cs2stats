// Single source of truth for the CS2 map pool. Update this file when Valve
// rotates the Active Duty pool — all stats, charts, and demo data automatically
// follow.
//
// As of CS2 Premier Season 4 (January 2026):
//   Active Duty: Anubis, Ancient, Dust II, Inferno, Mirage, Nuke, Overpass
//
// Faceit competitive uses the same Active Duty pool. Train was removed from
// Active Duty in January 2026 (replaced by Anubis), but is still playable in
// regular Competitive matchmaking, so we include it as a "reserve" map.
export const ACTIVE_DUTY_MAPS = [
  // [steam_internal_name, display_name, pool]
  { id: "de_anubis",   name: "ANUBIS",   pool: "premier" },
  { id: "de_ancient",  name: "ANCIENT",  pool: "premier" },
  { id: "de_dust2",    name: "DUST II",  pool: "premier" },
  { id: "de_inferno",  name: "INFERNO",  pool: "premier" },
  { id: "de_mirage",   name: "MIRAGE",   pool: "premier" },
  { id: "de_nuke",     name: "NUKE",     pool: "premier" },
  { id: "de_overpass", name: "OVERPASS", pool: "premier" },
];
export const RESERVE_MAPS = [
  { id: "de_train",   name: "TRAIN",   pool: "competitive" },
  { id: "de_vertigo", name: "VERTIGO", pool: "competitive" },
];
// Maps we accept stats for — Active Duty + Reserve. Anything else (assault,
// militia, dust, cbble, aztec, office, italy) is filtered out as legacy/non-CS2.
export const SUPPORTED_MAPS = [...ACTIVE_DUTY_MAPS, ...RESERVE_MAPS];
export const SUPPORTED_MAP_IDS = SUPPORTED_MAPS.map((m) => m.id);