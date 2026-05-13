# CS2 Tracker
A free, open-source web dashboard for **Counter-Strike 2** player statistics. Sign in with Steam and instantly see deep insights into your gameplay — pulled live from Valve's Steam Web API and the FACEIT Open API, displayed in a CS2-themed tactical UI.
> Modeled as a free alternative to FACEIT Tracker / Leetify for the basics, with strict separation between Steam lifetime stats and FACEIT competitive stats so the numbers are never misleading.
---
## What it does
### 🔵 Steam — Lifetime CS2 Statistics
Pulled from Valve's `GetUserStatsForGame` endpoint (appid 730).
- **Performance overview** — accuracy, headshot %, K/D ratio, win rate, MVPs, hours played, money earned, bombs planted/defused
- **Weapon arsenal** — kills, accuracy, and HS% for every CS2 weapon, with the official in-game 3D weapon renders shown next to each entry. Top 3 highlighted, full leaderboard sortable by kills.
- **Map performance** — win rate, rounds played, and best/worst maps. Filterable by current Active Duty pool only or all competitive maps.
- **CS2 skin inventory** — full inventory grouped by category (Knives · Gloves · Rifles · Snipers · Pistols · SMGs · Heavy · Agents · Stickers · Charms · Cases · …) with rarity-coded cards, StatTrak/Souvenir badges, wear (FN/MW/FT/WW/BS), and **live market prices**.
  - Two price sources, user-toggleable: **BUFF163** (default, lower / no Steam fee) and **Steam Market** (with the 15% Valve fee).
  - **"Loadout" panel** showing the highest-value skin per weapon slot — a sensible proxy for the active loadout, since Valve doesn't expose what's currently equipped.
### 🟠 FACEIT — Competitive Matchmaking Stats
Pulled from the FACEIT Open Data API. Kept strictly separate from Steam stats — they are never combined.
- **Profile** — current FACEIT skill level (color-coded 1–10), ELO, region, country
- **Detailed stats panel** modeled after FACEIT Tracker:
  - **Performance metrics** with delta arrows vs recent form: Win rate · ADR · K/R · Clutch Success · Entry Success · Headshot % · Flash Success · Flashes per round · Utility damage / round
  - **Other stats** counters: Total wins · Total kills · Total clutches · MVPs · Aces
  - **Play activity** (Beta): matches played, days played, most active month, most active hour, average daily/weekly matches charts, **12-week activity heatmap**
  - **ELO progression** — line chart reconstructed from win/loss history with highest/lowest ELO and ELO change
  - **Map highlights** — best ADR map, best Entry success map, best Clutch success map (with map banner backgrounds + recent W/L badges)
  - **Total stats** — exhaustive grouped breakdown: Matches · Rounds · Kills · Entry Success · Multiple eliminations (Aces/4k/3k/2k/1k) · Weapons (Sniper/Pistol/Knife/Zeus) · Utility (Flashes/Enemies flashed/HE/Util damage) · Clutches (1v1, 1v2 with W/L/%)
- **Per-map FACEIT performance** — separate from Steam map data. Win rate, avg K/D, avg HS% per map with map banner cards.
- **Match history** — last 20 matches as compact cards with map banner backgrounds, W/L badge, score, K/D/A, K/D ratio, ADR. Click any match to expand into…
- **Detailed match view** modeled after FACEIT's match room:
  - Full-width map banner header (Dust2 shows a Dust2 banner, Mirage shows a Mirage banner, …)
  - Centered scoreboard banner with both team logos, names, and large score
  - Half-time + overtime score breakdown
  - Two CS2-style scoreboards side-by-side with all 10 players, each row showing the FACEIT level badge, avatar, ELO, and full stats: K / D / A / K-D / **ADR** / HS%
  - Direct links to download the `.dem` file and open the FACEIT match room
- **Match demos** section explains the `.dem` format honestly (CS2 demos are Source 2 replays, not video — only playable inside CS2) and provides one-click downloads of available demos.
---
## Limitations (honest disclosures)
The CS2 / Steam / FACEIT APIs have several gaps. The site doesn't pretend otherwise:
| Limitation | Reason | What we do instead |
|---|---|---|
| **Steam lifetime stats can't be split by mode** | Steam returns one combined total for Premier + Competitive + Casual + Deathmatch — Valve doesn't separate them. | The Steam section is clearly labeled "Steam Lifetime Data — includes all modes". FACEIT stats are kept in a completely separate section. |
| **Active equipped loadout is not exposed** | Valve doesn't have any public API that reveals what's currently equipped. | We show all skins and highlight the **highest-value skin per weapon slot** as the loadout proxy — same approach used by csgobackpack and similar sites. |
| **CS2 demos can't be played as MP4 in-browser** | `.dem` files are Source 2 engine replays containing tick-by-tick game state, not video. Converting to MP4 requires running CS2 + HLAE/OBS server-side. | Direct download links + step-by-step instructions for playing in CS2's Watch menu. The Demos section also recommends Leetify and csstats.gg for browser-based 2D heatmap viewing. |
| **Skin float values aren't exposed** | Valve closed the public float API in 2017. | Wear tier is shown (FN/MW/FT/WW/BS) since that's all the inventory endpoint returns. |
| **Per-weapon kills on FACEIT don't exist** | FACEIT's API doesn't expose per-weapon kill breakdowns. | Per-weapon stats are only shown in the **Steam** section. FACEIT match cards do show per-match sniper/pistol/knife/zeus kills where available. |
| **Steam profile must be Public** | The CS2 stats endpoint returns 403 for private profiles. | Clear in-app guidance with a direct link to Steam's privacy settings. |
| **Steam inventory must be Public** | Same as above for the inventory endpoint. | Same handling. |
| **Steam endpoints are rate-limited** | Inventory ≈ 5 req/min/IP, Market priceoverview ≈ 20 req/min/IP. | Inventory is paginated with backoff; on rate-limit mid-fetch we return what we got with a "Partial inventory" warning. Skin prices come from a cached BUFF163/Steam dump (refreshed every 30 min) instead of per-item Steam Market calls. |
| **ELO history per match isn't in the API** | FACEIT exposes current ELO and match win/loss only. | The ELO line chart is reconstructed from win/loss history (±25 ELO per match — close to FACEIT's actual algorithm). Disclaimer is shown directly on the chart. |
---
## Map pool
The Active Duty pool is a single source of truth defined in `src/lib/mapPool.ts` + `api/_mapPool.js`. As of CS2 Premier Season 4 (January 2026):
- **Active Duty (Premier):** Anubis · Ancient · Dust II · Inferno · Mirage · Nuke · Overpass
- **Reserve (Competitive only):** Train · Vertigo
Legacy CS:GO maps (Assault, Militia, Office, Italy, Aztec, Cobblestone, Dust) are filtered out of stats even though Steam's API still returns them — they don't exist in CS2.
When Valve rotates the pool, only those two files need to be updated; the rest of the app follows automatically.
---
## Data sources
- **Steam Web API** — player profile, lifetime CS2 stats (`GetUserStatsForGame` for appid 730)
- **Steam Community inventory endpoint** — full CS2 inventory with item descriptions and Steam-CDN icon URLs
- **FACEIT Open Data API v4** — player profile, lifetime stats (with per-map segments), match history, full match details with rosters and per-player scoreboard data
- **csgotrader.app** — cached daily JSON dumps of BUFF163 and Steam Market prices (no auth, no rate limits — far more reliable than calling Steam Market priceoverview per item)
- **counter-strike-image-tracker** (ByMykel, GitHub) + **Steam economy CDN** — official in-game weapon model PNGs (the same images shown in the CS2 buy menu and Steam Market)
---
## Privacy & security
- Steam authentication uses **OpenID 2.0** — your Steam password never touches the site, only the SteamID64 verified by Steam itself.
- The session cookie is `httpOnly`, `Secure`, `SameSite=Lax` — it can't be read by JavaScript and only the server can use it to call Steam on your behalf.
- API keys (`STEAM_API_KEY`, `FACEIT_API_KEY`) live exclusively in server environment variables; they are never sent to the browser.
- No analytics, no trackers, no ads.
---
## Tech
React 19 · Vite · TypeScript · Tailwind CSS v4 · Recharts · Vercel Serverless Functions.
The frontend is a single-file SPA, the backend is a handful of stateless serverless functions (`/api/auth/steam`, `/api/auth/steam/callback`, `/api/auth/logout`, `/api/me`, `/api/inventory`, `/api/debug`).
---
## Disclaimer
CS2 Tracker is an unofficial, fan-made project. It is not affiliated with, endorsed by, or sponsored by **Valve Corporation** or **FACEIT**. Counter-Strike 2 is a trademark of Valve Corporation. All weapon images, map names, and game data are property of their respective owners and are used here for informational purposes only.
Open source. Use it, fork it, learn from it.
## Disclaimer

CS2 Tracker is not affiliated with Valve or Faceit. Counter-Strike 2 is a trademark of Valve Corporation.
