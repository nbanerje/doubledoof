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

### Render + Neon + custom domain

Database is **Neon** (or any Postgres): put the connection string in `DB_URL` when Render asks during Blueprint deploy, or under the **doubledoof** web service → **Environment**.

1. Install the CLI: `brew install render`, then `render login`.
2. Push this repo to GitHub/GitLab/Bitbucket (Render deploys from Git).
3. Dashboard: **New** → **Blueprint** → connect the repo → **Deploy Blueprint** ([`render.yaml`](./render.yaml)).
4. Set **sync** env vars when prompted: `DB_URL` (Neon), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`, `AWS_SES_FROM_EMAIL`.
5. **DNS for `doubledoof.peoplesrobotics.com`**: wherever `peoplesrobotics.com` DNS is hosted, add a **CNAME** from `doubledoof` to the hostname Render shows for this service (often `doubledoof.onrender.com` — copy from **Settings** → **Custom domains** for the service). Use **DNS only** if you use Cloudflare (grey cloud), or Render’s SSL verification can fail.

`render blueprints validate render.yaml` after `render workspace set` checks the blueprint against your workspace.

Free web tier **spins down** when idle (cold start on first request).
