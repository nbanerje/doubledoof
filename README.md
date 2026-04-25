# Bat Duel

Neon-backed 2D fighting game with:
- Single/local modes and online matchmaking.
- Email-code authentication via AWS SES (stored in Neon DB).
- Persistent profile + username updates.
- Friends list/invites via DB.
- Socket.IO multiplayer state sync.

## Environment

Add your Neon connection string in `.env`:

```bash
DB_URL="postgresql://..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_SES_REGION="us-west-2"
AWS_SES_FROM_EMAIL="neel@calendarsociety.com"
```

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API + realtime architecture

- `server.js` serves static files + REST API + Socket.IO.
- Tables auto-created on startup:
  - `users`
  - `auth_codes`
  - `friends`
- WebSocket matchmaking pairs queued authenticated users into rooms.

## Deploy notes

This app needs a persistent Node process for Socket.IO (not static-only hosting).

### Render + Neon + `doubledoof.peoplesrobotics.com`

**Service (Neel’s workspace):** [doubledoof on Render](https://dashboard.render.com/web/srv-d7m1sfhj2pic73elishg) — default URL `https://doubledoof.onrender.com`.

1. **Environment** (same service → **Environment** in the sidebar): add  
   `DB_URL` = your Neon connection string (include `?sslmode=require` if Neon’s docs say so), plus  
   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, `AWS_SES_FROM_EMAIL` for email codes.  
   Save, then **Manual Deploy** → **Deploy latest commit** if the app does not restart by itself.
2. **Custom domain:** service → **Settings** → **Custom Domains** → **Add** → `doubledoof.peoplesrobotics.com`. Render shows the exact **CNAME** target (often `doubledoof.onrender.com`). At your **peoplesrobotics.com** DNS host, create that CNAME for host `doubledoof`. On Cloudflare, use **DNS only** (grey cloud) until TLS verifies.
3. **GitHub:** repo is [github.com/nbanerje/doubledoof](https://github.com/nbanerje/doubledoof) (was set **public** so Render could clone before GitHub is linked to Render). In Render: **Account** → **Connected Accounts** → link **GitHub**, then you can make the repo private again in GitHub if you want.

[`render.yaml`](./render.yaml) matches this setup (Neon `DB_URL`, no Render Postgres, domain name for reference). You can instead use **New** → **Blueprint** from that file; this workspace already has a **Web Service** created via CLI with the same repo.

`render blueprints validate render.yaml` after `render workspace set` validates the YAML.

Free web tier **spins down** when idle (cold start on first request).
