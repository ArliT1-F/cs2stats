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

// Official CS2 round map icons (the "emblem" style used in the in-game map
// veto / picker). Sourced from MurkyYT/cs2-map-icons on GitHub — auto-scraped
// daily from the official game depot.
//
// URL pattern: raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images/{steam_internal}.png
const MAP_ICON_BASE = "https://raw.githubusercontent.com/MurkyYT/cs2-map-icons/main/images";

const MAP_INTERNAL_NAMES: Record<string, string> = {
  // Active Duty
  "DUST II": "de_dust2",
  "DUST2":   "de_dust2",
  "MIRAGE":  "de_mirage",
  "INFERNO": "de_inferno",
  "NUKE":    "de_nuke",
  "OVERPASS":"de_overpass",
  "ANCIENT": "de_ancient",
  "ANUBIS":  "de_anubis",
  // Reserve / community
  "TRAIN":   "de_train",
  "VERTIGO": "de_vertigo",
  "OFFICE":  "cs_office",
  "ITALY":   "cs_italy",
  "CACHE":   "de_cache",
};

export function getMapIcon(mapName: string): string | null {
  if (!mapName) return null;
  const normalized = mapName.replace(/^de_|^cs_/i, "").replace(/_/g, " ").toUpperCase().trim();
  // If the input already looks like an internal name, use it directly
  const internal = MAP_INTERNAL_NAMES[normalized]
    || (mapName.startsWith("de_") || mapName.startsWith("cs_") ? mapName : null);
  if (!internal) return null;
  return `${MAP_ICON_BASE}/${internal}.png`;
}

// Faceit skill level color (matches Faceit's official rank colors)
export function faceitLevelColor(level: number | null | undefined): string {
  if (!level) return "#94a3b8";
  const colors = ["#94a3b8","#a3e635","#a3e635","#facc15","#facc15","#facc15","#fb923c","#fb923c","#ef4444","#ef4444","#dc2626"];
  return colors[level] || "#94a3b8";
}
