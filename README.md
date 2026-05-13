# CS2 Tracker

A Counter-Strike 2 player stats dashboard. Sign in with Steam to view accuracy, headshot %, weapon performance, map win-rates, and Faceit ELO.

## Stack
- React 19 + Vite + TypeScript
- Tailwind CSS v4 (CS2-themed dark UI)
- Recharts for data visualization
- Vercel Serverless Functions (`/api/*`) for Steam OpenID auth + API proxy

## Environment variables (Vercel)

Set these in **Vercel → Project → Settings → Environment Variables**:

| Name | Description | Get it from |
|------|-------------|-------------|
| `STEAM_API_KEY` | Steam Web API key for fetching player summaries & CS2 stats | https://steamcommunity.com/dev/apikey |
| `FACEIT_API_KEY` | Faceit Open API server-side key | https://developers.faceit.com/apps |

If the env vars are not set, the app falls back to deterministic **demo data** so the deployed site still works.

## Local dev

```bash
npm install
npm run dev
```

For local API testing, use `vercel dev` instead of `vite dev` to run the serverless functions.

## Deploy

```bash
vercel
```

Vercel auto-detects the Vite frontend and deploys functions from `/api/*`.

## Routes

- `GET /api/auth/steam` → redirects to Steam OpenID login
- `GET /api/auth/steam/callback` → verifies OpenID response, sets `steamid` cookie, redirects to `/`
- `GET /api/auth/logout` → clears cookie
- `GET /api/me` → returns logged-in user's profile + transformed CS2 stats + Faceit data

## SEO

Full meta tags, Open Graph, Twitter Card, JSON-LD structured data (`WebApplication` schema), and a canonical URL are set in `index.html`.

## Disclaimer

CS2 Tracker is not affiliated with Valve or Faceit. Counter-Strike 2 is a trademark of Valve Corporation.
