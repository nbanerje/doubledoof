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

This app now requires a persistent Node server for Socket.IO (not static-only hosting).
If you still want Vercel for frontend, deploy backend separately (for example Render/Railway/Fly) and point frontend API/socket URL to that backend.
