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

// Banner image paths (lives in public/maps/, referenced by URL).
// To swap a banner, just replace the file at public/maps/<name>.jpg.
export const MAP_BANNERS: Record<string, string> = {
  "DUST II": "/maps/dust2.jpg",
  "DUST2": "/maps/dust2.jpg",
  "MIRAGE": "/maps/mirage.jpg",
  "INFERNO": "/maps/inferno.jpg",
  "NUKE": "/maps/nuke.jpg",
  "OVERPASS": "/maps/overpass.jpg",
  "ANCIENT": "/maps/ancient.jpg",
  "ANUBIS": "/maps/anubis.jpg",
  "TRAIN": "/maps/default.jpg",
  "VERTIGO": "/maps/default.jpg",
};

export function getMapBanner(mapName: string): string {
  if (!mapName) return "/maps/default.jpg";
  // Normalize: "Dust II" → "DUST II", "de_dust2" → "DUST2"
  const normalized = mapName.replace(/^de_/i, "").replace(/_/g, " ").toUpperCase().trim();
  return MAP_BANNERS[normalized] || "/maps/default.jpg";
}

// Faceit skill level color (matches Faceit's official rank colors)
export function faceitLevelColor(level: number | null | undefined): string {
  if (!level) return "#94a3b8";
  const colors = ["#94a3b8","#a3e635","#a3e635","#facc15","#facc15","#facc15","#fb923c","#fb923c","#ef4444","#ef4444","#dc2626"];
  return colors[level] || "#94a3b8";
}
