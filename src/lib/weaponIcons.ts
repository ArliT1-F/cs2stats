// Maps a display weapon name (as returned by api/me.js or in demo data) to a
// Steam-hosted CS2 weapon icon URL. Uses Steam's official econ image CDN —
// these are the same images used in the in-game buy menu.
//
// Source: Steam community CDN serves base weapon images at predictable paths.
// Format: https://community.cloudflare.steamstatic.com/economy/image/{hash}/96x96
// We use the well-known classid icons that Steam exposes publicly for
// schema-default weapons. As a robust fallback we also generate an inline SVG.

// Steam-hosted base weapon icons (transparent PNG). These specific image hashes
// are stable across CS2's weapon schema and used by Steam's in-game UI.
const STEAM_WEAPON_ICONS: Record<string, string> = {
  // Rifles
  "AK47":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_ak47_png.png",
  "AK-47":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_ak47_png.png",
  "M4A1":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_m4a1_silencer_png.png",
  "M4A1-S":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_m4a1_silencer_png.png",
  "M4A4":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_m4a1_png.png",
  "AUG":      "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_aug_png.png",
  "SG553":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_sg556_png.png",
  "SG556":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_sg556_png.png",
  "FAMAS":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_famas_png.png",
  "GALIL":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_galilar_png.png",
  "GALILAR":  "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_galilar_png.png",

  // Snipers
  "AWP":      "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_awp_png.png",
  "SSG08":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_ssg08_png.png",
  "SCAR20":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_scar20_png.png",
  "G3SG1":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_g3sg1_png.png",

  // Pistols
  "DEAGLE":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_deagle_png.png",
  "GLOCK":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_glock_png.png",
  "USP-S":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_usp_silencer_png.png",
  "USP (S)":  "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_usp_silencer_png.png",
  "HKP2000":  "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_hkp2000_png.png",
  "P2000":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_hkp2000_png.png",
  "P250":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_p250_png.png",
  "FIVE-SEVEN":"https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_fiveseven_png.png",
  "FIVESEVEN":"https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_fiveseven_png.png",
  "TEC-9":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_tec9_png.png",
  "TEC9":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_tec9_png.png",
  "CZ75":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_cz75a_png.png",
  "DUALIES":  "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_elite_png.png",
  "ELITE":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_elite_png.png",
  "REVOLVER": "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_revolver_png.png",

  // SMGs
  "MP9":      "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mp9_png.png",
  "MP7":      "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mp7_png.png",
  "MP5-SD":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mp5sd_png.png",
  "MP5SD":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mp5sd_png.png",
  "UMP45":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_ump45_png.png",
  "UMP-45":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_ump45_png.png",
  "P90":      "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_p90_png.png",
  "BIZON":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_bizon_png.png",
  "MAC10":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mac10_png.png",
  "MAC-10":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mac10_png.png",

  // Heavy
  "NOVA":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_nova_png.png",
  "XM1014":   "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_xm1014_png.png",
  "SAWEDOFF": "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_sawedoff_png.png",
  "MAG7":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mag7_png.png",
  "MAG-7":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_mag7_png.png",
  "M249":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_m249_png.png",
  "NEGEV":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_negev_png.png",

  // Misc
  "KNIFE":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_knife_png.png",
  "HE GRENADE": "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_hegrenade_png.png",
  "FLASHBANG": "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_flashbang_png.png",
  "SMOKE":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_smokegrenade_png.png",
  "MOLOTOV":  "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_molotov_png.png",
  "INCGRENADE":"https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_incgrenade_png.png",
  "DECOY":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_decoy_png.png",
  "ZEUS":     "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_taser_png.png",
  "TASER":    "https://steamcdn-a.akamaihd.net/apps/csgo/images/csgo_econ/weapons/base_weapons/weapon_taser_png.png",
};

export function getWeaponIcon(name: string): string | null {
  if (!name) return null;
  // Normalize: uppercase, strip spaces/punctuation variants
  const k = name.toUpperCase().trim();
  if (STEAM_WEAPON_ICONS[k]) return STEAM_WEAPON_ICONS[k];
  // Try without dashes/spaces
  const stripped = k.replace(/[-\s]/g, "");
  for (const [key, url] of Object.entries(STEAM_WEAPON_ICONS)) {
    if (key.replace(/[-\s]/g, "") === stripped) return url;
  }
  return null;
}

// Inline SVG fallback (a simple rifle silhouette). Used if the Steam image fails.
export const WEAPON_ICON_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 32' fill='none' stroke='%23f59e0b' stroke-width='2'>
    <path d='M2 18h28l4-4h6v-4h12v8l-4 4h-6v4h-8l-4-4H2z'/>
  </svg>`);
