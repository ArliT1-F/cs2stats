// Maps a CS2 weapon name OR Steam-internal key (e.g. "m4a1_silencer") to its
// official in-game render — the same 3D-rendered weapon images used in CS2's
// buy menu and Steam Market listings.
//
// Image sources (in priority order):
//   1. Steam economy CDN — `community.akamai.steamstatic.com/economy/image/...`
//   2. ByMykel/counter-strike-image-tracker GitHub mirror (for grenades & some
//      base weapons that aren't on the economy CDN)
//   3. Inline SVG fallback (a generic rifle silhouette)
//
// All URLs were verified against the CS2 base_weapons.json schema in 2026.

const STEAM_CDN = "https://community.akamai.steamstatic.com/economy/image";
const GH = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons";

// Keyed by both Steam internal name (e.g. "m4a1_silencer") AND common display
// names (e.g. "M4A1-S", "AK-47"). The lookup tries every variant.
const ICONS: Record<string, string> = {
  // ── PISTOLS (def_index 1-4, 30-32, 36, 61, 63-64) ───────────────────
  // Desert Eagle (def_index 1)
  deagle: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnk-CNc4_fgOfA8cfGRDTfGku13seI4Fyq2wUQm5DjWzo38IH3BO1N2W5MmTe5etw74zINmLLSKdA`,
  // Dual Berettas (def_index 2)
  elite: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnl8StP6ryvOqJpJqjACjbBkb93srg-Fn7ilBhysWXSyNarJSqUZlIpCMclTbMCrFDmxYRwJ9Kk`,
  // Five-SeveN (def_index 3)
  fiveseven: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnm9DRe_Pe4baojePHHWz7GwL4jsbVvTHnilE1w5WrVzo39JH6QOFUnC8RxROMN4ESwlMqnab24YkBbtQ`,
  // Glock-18 (def_index 4)
  glock: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnn8S1Y5Lz9O_M5d_LHDz6WmOp04-U8THmwzU0l6ziDyd__IC3DO1IgXJJwE7NfrFDmxU9v5GXb`,
  // Tec-9 (def_index 30)
  tec9: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn0-CECofb2MKY9IvPGWjPAkrwi5Lk4Tn3nzUwlsGnVzI6pdymQbVAjW8d0F-IU8k7vdMx23Ho`,
  // Zeus x27 (def_index 31)
  taser: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn0_DFe_bz6PKI4caTCDzHCwrkj57U6FnHik0l04mXVw4yhJCiRaVImW8dzTeRcrFDmxd8qNG47`,
  // P2000 (def_index 32)
  hkp2000: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKno9jIJv6L-Jqc_cKjEWDDDlLx3trVrH3qykEtz4TjQno6td3uVbVRyWZR2EbEKtRCm0oqwKXhPxN4`,
  // P250 (def_index 36)
  p250: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnwr3cLoaf4avNvJqKXXmKUlrp0s-U9HCvgw0V05WSDw96pIC6VOw92X8QkROAU8k7vNwsvFQ4`,
  // USP-S (def_index 61)
  usp_silencer: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn17jJk_PuibapuJeLdWGLFwL8i4eVsFiqxxUt34jmHnoysJ3qVOAYgCJZwQrRb5EPul4XlYvSiuVIHgy4Xvg`,
  // CZ75-Auto (def_index 63)
  cz75a: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnj53UO7ryvaac0dKiVW2XBlrwmsuA6GH3hkE9062qEz9aoeCmVawchW8dwEe4MrFDmxWPDR_Ga`,
  // R8 Revolver (def_index 64)
  revolver: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKny-DRU4-Sreuo8cvTLCzKRmbkk4ONtGijilk8k4znWy9v8JCiUaQIiWZpyQ-AJtEa7jJS5YM17OTN5`,

  // ── RIFLES ────────────────────────────────────────────
  // AK-47 (def_index 7)
  ak47: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnh9nYMoaCvMfxudKGVC2bIwLku5bFsHn2xzU1w4W_Tm9-ucn2eaQZxWcYmR-IU8k7vea-fOvM`,
  // AUG (def_index 8)
  aug: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnh6CUV7ff8PP08eanED2LHlLh06ec-TnjmkUUmsGXRn4n8cimTPVB0XsR1RPlK7Ee4GsImgw`,
  // AWP (def_index 9)
  awp: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnh6jIVtqr4PqBoI_ORVjXFkeguseMwGXGwwUV_4GmHyd2qdH-WbFAmApsiQPlK7EcMn7y-CQ`,
  // FAMAS (def_index 10) — GitHub
  famas: `${GH}/weapon_famas_png.png`,
  // G3SG1 (def_index 11) — GitHub
  g3sg1: `${GH}/weapon_g3sg1_png.png`,
  // Galil AR (def_index 13)
  galilar: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnn_C5S4_O8JvZrIaPKV2ORx7d3trg7Gnjmlxl04WTTyoyqeXKUPFVzCsN1FuMJuxam0oqwr0aqT-w`,
  // M4A4 (def_index 16) — internal name "m4a1"
  m4a1: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKntqSMKofH_O_Y-JfSVV2XBkLolsbZvTCqxx0sk4DjUnNipdSiQagcgXJQlRLEU8k7vIDSSpqI`,
  // M4A1-S (def_index 60) — internal name "m4a1_silencer"
  m4a1_silencer: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKntqSMK0OGnZKFjI_WBQD_Cleh0teA_F37qkERy52rWm9yhdynGblMgD5AkQrZeuhXtkt3iMOv8p1uJZpwq8Vo`,
  // SCAR-20 (def_index 38) — GitHub
  scar20: `${GH}/weapon_scar20_png.png`,
  // SG 553 (def_index 39) — GitHub
  sg556: `${GH}/weapon_sg556_png.png`,
  // SSG 08 (def_index 40)
  ssg08: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnz7iULt7z2MPY1eaWVCDHGlrgksuQ_HS3lxhkh4m-Gm9b6ICjCPQ4hDMF3EOJerFDmxXJ24aAg`,

  // ── SMGs ──────────────────────────────────────────────
  // MAC-10 (def_index 17) — GitHub
  mac10: `${GH}/weapon_mac10_png.png`,
  // P90 (def_index 19)
  p90: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnwpHIVvfOsPfI9dqDCWDDGkb4j5OU_Fy_kx0l1tj6DnoqseC2TP1cpAsF2QPlK7EcMYXqtDg`,
  // MP5-SD (def_index 23) — GitHub
  mp5sd: `${GH}/weapon_mp5sd_png.png`,
  // UMP-45 (def_index 24)
  ump45: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKn18DIPurz6MPducqDGCDPIw7l05LA7SXyylkh25z-Dm9agJHKSZgciDZt3F7JerFDmxeILsNGi`,
  // PP-Bizon (def_index 26)
  bizon: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKni9DhU4bz-PKZocPTBW2GWlbZw4bM7SS2xwER1smSEnIv6dS_GbFBxDJd0RLFbrFDmxaLGO5J-`,
  // MP7 (def_index 33)
  mp7: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnt7XUVvfOoPqA1eKHEVjXFlr0ituM_SnqwwR9w4mXVyIn6dnKRblV1D5AhTPlK7EelyO1yEg`,
  // MP9 (def_index 34)
  mp9: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnt7XsVv6T9OvE9dKLKCD_Ex74h5bY6Tnrgl0hzt2rXm4qseXyWaAMgWJJ2EflK7Ec0i602wg`,

  // ── HEAVY ─────────────────────────────────────────────
  // M249 (def_index 14)
  m249: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKntr3YCoaarbfc_IvHDWWLClb8g5OA7F3y1l0xw6juBzdeoJX6fZ1IoWcciQ-UU8k7vtOr9c-I`,
  // XM1014 (def_index 25) — GitHub
  xm1014: `${GH}/weapon_xm1014_png.png`,
  // MAG-7 (def_index 27) — GitHub
  mag7: `${GH}/weapon_mag7_png.png`,
  // Negev (def_index 28)
  negev: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnu-CVe-bz3P6I1caTGDzTFk7gh5rg6Tn3rkBwm4zjSwo3_Ii-fZgIjA8dwELFZrFDmxWhBRARX`,
  // Sawed-Off (def_index 29)
  sawedoff: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnz_DVe6_2obuo_JqHACzaSk-1wtrMwTi3nkUly6m-ByYr4Jy2fP1cgA8dxFLRfu0LqjJS5YC4vtNQk`,
  // Nova (def_index 35) — GitHub
  nova: `${GH}/weapon_nova_png.png`,

  // ── KNIVES ────────────────────────────────────────────
  knife: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnr8ytd6rz5PvI9dPbGX2HGl7dw4LYxHn3mlkshtWmHzI74IyqVbQQnWZN1Q7QLrFDmxYFVbevc`,

  // ── GRENADES & UTILITY ────────────────────────────────
  flashbang: `${GH}/weapon_flashbang_png.png`,
  hegrenade: `${GH}/weapon_hegrenade_png.png`,
  smokegrenade: `${GH}/weapon_smokegrenade_png.png`,
  molotov: `${GH}/weapon_molotov_png.png`,
  incgrenade: `${GH}/weapon_incgrenade_png.png`,
  decoy: `${GH}/weapon_decoy_png.png`,
  c4: `${STEAM_CDN}/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJKz2lu_XuWbwcuyMESA4Fdl-4nnpU7iQA3-kKnjqWwLvfOoavw8IvTCV2bEle1w6Lk-TSq2k0x25jiBzN_9dXqVaQ91W5AkW6dU5WnQha4l`,
};

// Normalize a name to a single canonical key. Tries display names → internal keys.
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^weapon_/, "")
    .replace(/[^a-z0-9]/g, ""); // strip dashes, spaces, dots
}

// Display-name → internal-key alias map. Covers user-facing variants like
// "AK-47", "M4A1-S", "USP (S)", "Desert Eagle", etc.
const ALIASES: Record<string, string> = {
  // Canonical (already match after normalize)
  ak47: "ak47",
  awp: "awp",
  aug: "aug",
  m4a1: "m4a1",        // M4A4 (legacy Steam name)
  m4a4: "m4a1",        // user types M4A4 → same image
  m4a1s: "m4a1_silencer",
  m4a1silencer: "m4a1_silencer",
  m4a1silenced: "m4a1_silencer",
  famas: "famas",
  g3sg1: "g3sg1",
  galilar: "galilar",
  galil: "galilar",
  galilarcs: "galilar",
  galilarrifle: "galilar",
  scar20: "scar20",
  sg553: "sg556",
  sg556: "sg556",
  ssg08: "ssg08",
  // Pistols
  deagle: "deagle",
  deserteagle: "deagle",
  glock: "glock",
  glock18: "glock",
  hkp2000: "hkp2000",
  p2000: "hkp2000",
  usps: "usp_silencer",
  uspsilencer: "usp_silencer",
  uspsilenced: "usp_silencer",
  usp: "usp_silencer",      // we don't have a non-S USP in CS2
  fiveseven: "fiveseven",
  five7: "fiveseven",
  p250: "p250",
  tec9: "tec9",
  cz75: "cz75a",
  cz75a: "cz75a",
  cz75auto: "cz75a",
  revolver: "revolver",
  r8: "revolver",
  r8revolver: "revolver",
  elite: "elite",
  dualberettas: "elite",
  dualies: "elite",
  // SMGs
  mp9: "mp9",
  mp7: "mp7",
  mp5: "mp5sd",
  mp5sd: "mp5sd",
  ump45: "ump45",
  ump: "ump45",
  p90: "p90",
  bizon: "bizon",
  ppbizon: "bizon",
  mac10: "mac10",
  // Heavy
  nova: "nova",
  xm1014: "xm1014",
  sawedoff: "sawedoff",
  mag7: "mag7",
  m249: "m249",
  negev: "negev",
  // Misc
  knife: "knife",
  zeus: "taser",
  zeusx27: "taser",
  taser: "taser",
  hegrenade: "hegrenade",
  he: "hegrenade",
  flashbang: "flashbang",
  smoke: "smokegrenade",
  smokegrenade: "smokegrenade",
  molotov: "molotov",
  inc: "incgrenade",
  incendiary: "incgrenade",
  incgrenade: "incgrenade",
  decoy: "decoy",
  c4: "c4",
};

export function getWeaponIcon(nameOrKey: string): string | null {
  if (!nameOrKey) return null;
  const norm = normalizeKey(nameOrKey);
  // Direct hit on internal key
  if (ICONS[norm]) return ICONS[norm];
  // Try alias map
  const aliased = ALIASES[norm];
  if (aliased && ICONS[aliased]) return ICONS[aliased];
  return null;
}

// Inline SVG fallback if the real image fails to load.
export const WEAPON_ICON_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 32' fill='none' stroke='%23f59e0b' stroke-width='2'>
      <path d='M2 18h28l4-4h6v-4h12v8l-4 4h-6v4h-8l-4-4H2z'/>
    </svg>`
  );
