# CS2 demo parsing pipeline

The frontend now has a 2D parsed-demo viewer in `src/components/DemosSection.tsx`.
It renders a normalized parsed-event schema from `src/lib/parsedDemo.ts`.

What still needs to run outside this Vercel app is the demo ingestion and parsing
worker. Vercel Serverless Functions are a poor fit for this because CS2 demos can
be large, parsing is CPU-heavy, and workers need durable storage plus retries.

## What the viewer expects

The client expects one parsed match object shaped like this:

```ts
interface ParsedDemoMatch {
  id: string;
  source: "sample" | "faceit" | "valve-mm";
  map: {
    name: string;
    displayName: string;
    coordinateMode: "normalized";
  };
  tickRate: number;
  durationSeconds: number;
  score: { t: number; ct: number };
  players: Array<{
    steamId: string;
    name: string;
    team: "T" | "CT";
    color: string;
  }>;
  kills: Array<{
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
  }>;
}
```

`DemoPlayerState.x` and `DemoPlayerState.y` are normalized radar coordinates:
`0,0` is top-left and `100,100` is bottom-right. Convert Source 2 world
coordinates before sending them to the browser.

## What you need to provide

For Valve matchmaking demos, you will need:

1. A Steam Web API key for the site owner account.
2. The user's SteamID64.
3. The user's CS2 game authentication code, also called the `steamidkey`.
   - The user can generate this from Steam's CS2 personal game data page:
     `https://steamcommunity.com/my/gcpd/730`
   - Look for the match-history / game-authentication-code section.
4. An initial known match share code.
   - Many Valve flows require `knowncode` plus `steamidkey` to call
     `ICSGOPlayers_730/GetNextMatchSharingCode/v1`.
   - If you want a csstats.gg-style bot flow, run a Steam bot account and ask
     users to add it as a friend. The bot can help bootstrap and monitor match
     history, but it still needs a safe server-side workflow.
5. Storage for raw demos.
   - Recommended: Cloudflare R2, S3, Backblaze B2, or Supabase Storage.
6. A database for parsed output.
   - Recommended: Postgres/Supabase.
7. A background worker host.
   - Recommended: Fly.io, Render worker, Railway worker, ECS/Fargate, or a
     small VPS. Do not parse demos in Vercel functions.

For FACEIT demos, the existing FACEIT API response often includes a `demo_url`.
Those can be queued directly without the Valve auth-code flow.

## Recommended database shape

Start small. Do not store every tick until the kill-feed MVP is stable.

```sql
create table demo_matches (
  id text primary key,
  owner_steam_id text not null,
  source text not null,
  map_name text not null,
  match_share_code text,
  raw_demo_url text,
  raw_demo_storage_key text,
  parsed_at timestamptz,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

create table demo_players (
  match_id text references demo_matches(id) on delete cascade,
  steam_id text not null,
  name text not null,
  team text not null,
  color text not null,
  primary key (match_id, steam_id)
);

create table demo_kill_events (
  id text primary key,
  match_id text references demo_matches(id) on delete cascade,
  round int not null,
  tick int not null,
  time_seconds int not null,
  attacker_steam_id text not null,
  victim_steam_id text not null,
  assister_steam_id text,
  weapon text not null,
  headshot boolean not null,
  through_smoke boolean not null default false,
  wallbang boolean not null default false,
  blind boolean not null default false,
  attacker_state jsonb not null,
  victim_state jsonb not null,
  snapshot jsonb not null
);
```

Later, add a sampled timeline table if you want smooth playback:

```sql
create table demo_round_frames (
  match_id text references demo_matches(id) on delete cascade,
  round int not null,
  tick int not null,
  players jsonb not null,
  primary key (match_id, round, tick)
);
```

## Worker flow

1. User connects Steam and provides the CS2 game authentication code.
2. Server stores the auth code encrypted. Treat it like a secret.
3. Server discovers new match share codes.
   - Use Valve's `ICSGOPlayers_730/GetNextMatchSharingCode/v1` endpoint with:
     - `key`: Steam Web API key
     - `steamid`: user's SteamID64
     - `steamidkey`: user's CS2 game auth code
     - `knowncode`: latest known match share code
4. Worker resolves a share code to demo metadata and downloads the `.dem`.
5. Worker uploads the raw `.dem` to object storage.
6. Worker parses the `.dem` into structured events.
7. Worker converts map world coordinates into normalized radar coordinates.
8. Worker stores `demo_matches`, `demo_players`, and `demo_kill_events`.
9. Vercel frontend/API only reads parsed JSON and renders it.

## Parser options

Use one parser stack and pin versions in the worker project:

- Node: `@laihoe/demoparser2`
- Python: `demoparser2`
- Go: `demoinfocs` if your version supports the target CS2 demo format

The parser must extract at minimum:

- match map name
- tick rate
- player identities and teams
- kill events
- attacker, victim, assister
- weapon
- headshot flag
- attacker/victim position at kill tick
- attacker/victim view yaw at kill tick
- alive players' positions/weapons/HP near the kill tick

Nice-to-have fields:

- through-smoke kills
- wallbang / penetrated-object kills
- blind kills
- grenade throws and detonation positions
- bomb plant/defuse events
- round start/freezetime/end events
- sampled player frames every 8-16 ticks

## Coordinate conversion

The browser viewer intentionally uses normalized 0-100 map coordinates so it is
not tied to CS2's world-coordinate scale.

For each map, collect overview metadata from CS2's radar files or a trusted
map-metadata package:

- map image width/height
- world `pos_x`
- world `pos_y`
- map `scale`

The common conversion is conceptually:

```ts
const radarX = (worldX - posX) / scale;
const radarY = (posY - worldY) / scale;

const normalizedX = (radarX / radarImageWidth) * 100;
const normalizedY = (radarY / radarImageHeight) * 100;
```

Validate this per map with a known spawn or bombsite position; some overview
metadata has offsets or orientation differences.

## Security notes

- Do not put Steam Web API keys, user auth codes, bot passwords, or storage
  credentials in the Vercel frontend.
- Encrypt user CS2 game auth codes at rest.
- Let users revoke/delete stored auth codes.
- Store raw demos in a private bucket.
- Add queue retries and a dead-letter state for failed parser jobs.
- Rate-limit match-history polling per user.

## MVP integration steps from here

1. Stand up Postgres/Supabase with the tables above.
2. Create object storage for raw demos.
3. Create a separate worker service.
4. Implement FACEIT demo ingestion first because this app already receives
   `demoUrl` from FACEIT matches.
5. Add Valve match-history ingestion after the auth-code and bot flow are ready.
6. Add a read API in this repo only after parsed data exists. Because the Hobby
   plan has a 12-function limit, add it to an existing function or consolidate
   API routes before creating another top-level `api/*.js` route.
7. Replace `SAMPLE_PARSED_DEMO` with fetched parsed JSON.