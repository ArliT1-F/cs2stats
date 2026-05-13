// Mirror of api/_mapPool.js for the client. Single source of truth for
// CS2 Active Duty + Reserve maps. Update both files when the pool rotates.
//
// As of CS2 Premier Season 4 (January 2026):
//   Active Duty: Anubis, Ancient, Dust II, Inferno, Mirage, Nuke, Overpass

export type MapPool = "premier" | "competitive";

export interface CsMap {
  id: string;       // Steam internal name (e.g. "de_mirage")
  name: string;     // Display name (e.g. "MIRAGE")
  pool: MapPool;    // "premier" = Active Duty, "competitive" = reserve
}

export const ACTIVE_DUTY_MAPS: CsMap[] = [
  { id: "de_anubis",   name: "ANUBIS",   pool: "premier" },
  { id: "de_ancient",  name: "ANCIENT",  pool: "premier" },
  { id: "de_dust2",    name: "DUST II",  pool: "premier" },
  { id: "de_inferno",  name: "INFERNO",  pool: "premier" },
  { id: "de_mirage",   name: "MIRAGE",   pool: "premier" },
  { id: "de_nuke",     name: "NUKE",     pool: "premier" },
  { id: "de_overpass", name: "OVERPASS", pool: "premier" },
];

export const RESERVE_MAPS: CsMap[] = [
  { id: "de_train",   name: "TRAIN",   pool: "competitive" },
  { id: "de_vertigo", name: "VERTIGO", pool: "competitive" },
];

export const SUPPORTED_MAPS: CsMap[] = [...ACTIVE_DUTY_MAPS, ...RESERVE_MAPS];
