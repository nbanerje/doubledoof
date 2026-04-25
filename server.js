require("dotenv").config();

const path = require("path");
const http = require("http");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 3000;
const CHARGE_THRESHOLD_MS = 0;
/** Quick tap under this = melee (single attack key online); longer = charge shot */
const MELEE_QUICK_TAP_MS = 150;
const ROUND_INTERMISSION_MS = 4000;
const MAX_CHARGE_MS = 12000;
const CHARGE_SCALE_MS = 3200;
const MELEE_RANGE = 48;
const WINS_TO_END_MATCH = 5;
const ORB_DAMAGE_MIN = 6;
const ORB_DAMAGE_RANGE = 26;
const VIEW_W = 1040;
const FLOOR_Y = 560;
const PLAYER_BODY_W = 36;
const PLAYER_BODY_H = 48;
const PLAYER_TOP_Y = FLOOR_Y - PLAYER_BODY_H;
const GRAVITY = 0.7;
const JUMP_VELOCITY = -12.5;

function chargedShotFromHeldMs(heldMs) {
  const effective = Math.max(0, Math.min(heldMs - CHARGE_THRESHOLD_MS, CHARGE_SCALE_MS));
  const ratio = CHARGE_SCALE_MS > 0 ? effective / CHARGE_SCALE_MS : 0;
  const curved = ratio ** 0.88;
  const damage = Math.round(ORB_DAMAGE_MIN + ORB_DAMAGE_RANGE * curved);
  const w = 9 + Math.round(20 * curved);
  const h = 4 + Math.round(11 * curved);
  const speed = 9 + 4 * curved;
  return { damage, w, h, speed };
}
const DB_URL = process.env.DB_URL || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error(
    "Missing DB_URL or DATABASE_URL. Locally: set in .env. On Render: Dashboard → your Web Service → Environment → add DB_URL (Neon connection string)."
  );
}

const pool = new Pool({ connectionString: DB_URL });
const sesRegion = process.env.AWS_SES_REGION || process.env.AWS_REGION;
const sesFromEmail = process.env.AWS_SES_FROM_EMAIL || "neel@calendarsociety.com";
const sesClient = sesRegion ? new SESClient({ region: sesRegion }) : null;

const sessions = new Map();
const socketByUser = new Map();
const rooms = new Map();
/** @type {Map<string, { socketId: string, shareName: string, username: string }>} */
const onlineLobby = new Map();

/** Unique 5-digit lobby code (10000–99999) per connected player. */
function allocPlayerCode() {
  for (let n = 0; n < 200; n += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    let clash = false;
    for (const v of onlineLobby.values()) {
      if (v.shareName === code) {
        clash = true;
        break;
      }
    }
    if (!clash) return code;
  }
  return `${Date.now()}`.slice(-5);
}

function broadcastLobby() {
  const list = [...onlineLobby.entries()].map(([userId, v]) => ({
    userId,
    shareName: v.shareName,
    username: v.username,
  }));
  io.emit("lobby:players", list);
}

function findHostRoomId(userId) {
  for (const [rid, room] of rooms.entries()) {
    if (room.players[0].id === userId) return rid;
  }
  return null;
}

function detachUserFromRooms(userId, exceptRoomId, options = {}) {
  const silent = !!options.silent;
  for (const [rid, room] of [...rooms.entries()]) {
    if (rid === exceptRoomId) continue;
    if (room.players[0].id === userId) {
      if (!silent) {
        io.to(rid).emit("match:end", { reason: "Host left the match" });
      }
      rooms.delete(rid);
    } else if (room.players[1].id === userId) {
      room.players[1].id = null;
      room.players[1].socketId = null;
    }
  }
}

function clearGuestSlotEverywhere(userId) {
  for (const room of rooms.values()) {
    if (room.players[1].id === userId) {
      room.players[1].id = null;
      room.players[1].socketId = null;
    }
  }
}

function createHostRoom(hostUserId, hostSocketId) {
  const roomId = uuidv4();
  const players = [
    {
      id: hostUserId,
      socketId: hostSocketId,
      x: 220,
      y: PLAYER_TOP_Y,
      vx: 0,
      vy: 0,
      onGround: true,
      jumpHeld: false,
      health: 100,
      facing: 1,
      score: 0,
      controls: {},
      charging: false,
      chargeStart: 0,
      color: "#2f7dff",
    },
    {
      id: null,
      socketId: null,
      x: 760,
      y: PLAYER_TOP_Y,
      vx: 0,
      vy: 0,
      onGround: true,
      jumpHeld: false,
      health: 100,
      facing: -1,
      score: 0,
      controls: {},
      charging: false,
      chargeStart: 0,
      color: "#e44b4b",
    },
  ];
  rooms.set(roomId, {
    id: roomId,
    round: 1,
    players,
    projectiles: [],
    lockUntil: 0,
    intermissionStartedAt: 0,
  });
  io.to(hostSocketId).emit("match:start", { roomId, playerIndex: 0 });
  return roomId;
}

function attachGuestToRoom(roomId, guestUserId, guestSocketId) {
  const room = rooms.get(roomId);
  if (!room) return { ok: false, reason: "Room not found" };
  const p1 = room.players[1];
  if (p1.id != null && p1.id !== guestUserId) {
    return { ok: false, reason: "That match already has a red fighter" };
  }
  if (p1.socketId != null && p1.id === guestUserId) {
    p1.socketId = guestSocketId;
    io.to(guestSocketId).emit("match:start", { roomId, playerIndex: 1 });
    return { ok: true };
  }
  if (p1.socketId != null) {
    return { ok: false, reason: "Opponent is already connected" };
  }
  p1.id = guestUserId;
  p1.socketId = guestSocketId;
  const now = Date.now();
  room.intermissionStartedAt = now;
  room.lockUntil = now + 3000;
  io.to(guestSocketId).emit("match:start", { roomId, playerIndex: 1 });
  io.to(room.players[0].socketId).emit("match:countdown", { seconds: 3 });
  io.to(guestSocketId).emit("match:countdown", { seconds: 3 });
  return { ok: true };
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function makeName() {
  const left = ["Swift", "Nova", "Brave", "Pixel", "Echo", "Turbo", "Lunar"];
  const right = ["Bat", "Dueler", "Panda", "Raven", "Knight", "Shark"];
  return `${left[Math.floor(Math.random() * left.length)]}${right[Math.floor(Math.random() * right.length)]}${Math.floor(
    Math.random() * 900 + 100
  )}`;
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function sendAuthCodeEmail(email, code) {
  if (!sesClient) {
    throw new Error("Missing AWS_SES_REGION (or AWS_REGION) in .env");
  }
  const command = new SendEmailCommand({
    Source: sesFromEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Your Bat Duel verification code",
        Charset: "UTF-8",
      },
      Body: {
        Text: {
          Data: `Your Bat Duel login code is ${code}. It expires in 10 minutes.`,
          Charset: "UTF-8",
        },
        Html: {
          Data: `<p>Your Bat Duel login code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
          Charset: "UTF-8",
        },
      },
    },
  });
  await sesClient.send(command);
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id UUID NOT NULL,
      friend_id UUID NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_id)
    );
  `);
}

async function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  req.token = token;
  next();
}

app.post("/api/auth/send-code", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      res.status(400).json({ error: "Email required" });
      return;
    }
    const code = makeCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      "INSERT INTO auth_codes (id, email, code, expires_at) VALUES ($1, $2, $3, $4)",
      [uuidv4(), email, code, expiresAt]
    );
    await sendAuthCodeEmail(email, code);
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("SES send error", err);
    res.status(500).json({ error: "Failed to send email code" });
  }
});

app.post("/api/auth/verify", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const code = String(req.body.code || "").trim();
  const usernameInput = String(req.body.username || "").trim();
  if (!email || !code) {
    res.status(400).json({ error: "Email and code required" });
    return;
  }

  const codeRes = await pool.query(
    `SELECT id FROM auth_codes
     WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code]
  );
  if (!codeRes.rowCount) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }
  await pool.query("UPDATE auth_codes SET used = TRUE WHERE id = $1", [codeRes.rows[0].id]);

  let user = await pool.query("SELECT id, email, username FROM users WHERE email = $1", [email]);
  if (!user.rowCount) {
    const usernameBase = usernameInput || makeName();
    const username = `${usernameBase.slice(0, 20)}${Math.floor(Math.random() * 99)}`;
    const newUser = await pool.query(
      "INSERT INTO users (id, email, username) VALUES ($1, $2, $3) RETURNING id, email, username",
      [uuidv4(), email, username]
    );
    user = newUser;
  }

  const token = makeToken();
  sessions.set(token, user.rows[0].id);
  res.json({ token, user: user.rows[0] });
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  const user = await pool.query("SELECT id, email, username FROM users WHERE id = $1", [req.userId]);
  res.json(user.rows[0]);
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  const username = String(req.body.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "Username required" });
    return;
  }
  try {
    const updated = await pool.query(
      "UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username",
      [username.slice(0, 24), req.userId]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(400).json({ error: "Username already used" });
  }
});

app.get("/api/friends", authMiddleware, async (req, res) => {
  const friends = await pool.query(
    `SELECT u.id, u.username, u.email
     FROM friends f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY u.username`,
    [req.userId]
  );
  res.json({ friends: friends.rows });
});

app.post("/api/friends/invite", authMiddleware, async (req, res) => {
  const username = String(req.body.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "Friend username required" });
    return;
  }
  const target = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
  if (!target.rowCount) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const friendId = target.rows[0].id;
  if (friendId === req.userId) {
    res.status(400).json({ error: "Cannot add yourself" });
    return;
  }
  await pool.query(
    "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT (user_id, friend_id) DO NOTHING",
    [req.userId, friendId]
  );
  await pool.query(
    "INSERT INTO friends (user_id, friend_id) VALUES ($1, $2) ON CONFLICT (user_id, friend_id) DO NOTHING",
    [friendId, req.userId]
  );
  res.json({ ok: true });
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

function updateRoom(room) {
  const now = Date.now();
  if (room.lockUntil > now) return;

  for (const p of room.players) {
    const left = !!p.controls.left;
    const right = !!p.controls.right;
    const jump = !!p.controls.jump;
    p.vx = 0;
    if (left && !right) {
      p.vx = -4;
      p.facing = -1;
    }
    if (right && !left) {
      p.vx = 4;
      p.facing = 1;
    }
    if (jump && !p.jumpHeld && p.onGround) {
      p.vy = JUMP_VELOCITY;
      p.onGround = false;
    }
    p.jumpHeld = jump;
    p.vy += GRAVITY;
    p.y += p.vy;
    if (p.y >= PLAYER_TOP_Y) {
      p.y = PLAYER_TOP_Y;
      p.vy = 0;
      p.onGround = true;
    }
    p.x = Math.max(0, Math.min(VIEW_W - PLAYER_BODY_W, p.x + p.vx));
  }

  const p0 = room.players[0];
  const p1 = room.players[1];

  room.projectiles.forEach((shot) => {
    shot.x += shot.vx;
    const target = room.players[shot.targetIdx];
    const hit =
      shot.x < target.x + PLAYER_BODY_W &&
      shot.x + shot.w > target.x &&
      shot.y < target.y + PLAYER_BODY_H &&
      shot.y + shot.h > target.y;
    if (hit) {
      target.health = Math.max(0, target.health - shot.damage);
      shot.dead = true;
    }
    if (shot.x < -100 || shot.x > 1200) shot.dead = true;
  });
  room.projectiles = room.projectiles.filter((s) => !s.dead);

  if (p0.health <= 0 || p1.health <= 0) {
    const winnerIdx = p0.health <= 0 ? 1 : 0;
    room.players[winnerIdx].score += 1;
    const s0 = room.players[0].score;
    const s1 = room.players[1].score;
    if (s0 >= WINS_TO_END_MATCH || s1 >= WINS_TO_END_MATCH) {
      room.round = 1;
      room.players[0].score = 0;
      room.players[1].score = 0;
    } else {
      room.round += 1;
    }
    room.intermissionStartedAt = Date.now();
    room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
    p0.health = 100;
    p1.health = 100;
    p0.x = 220;
    p1.x = 760;
    p0.y = PLAYER_TOP_Y;
    p1.y = PLAYER_TOP_Y;
    p0.vy = 0;
    p1.vy = 0;
    p0.onGround = true;
    p1.onGround = true;
    room.projectiles = [];
    room.players.forEach((p) => {
      p.charging = false;
      p.chargeStart = 0;
    });
  }
}

setInterval(() => {
  for (const room of rooms.values()) {
    updateRoom(room);
    io.to(room.id).emit("match:state", {
      round: room.round,
      players: room.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        health: p.health,
        facing: p.facing,
        score: p.score,
        color: p.color,
        charging: p.charging,
      })),
      projectiles: room.projectiles,
      lockUntil: room.lockUntil,
      intermissionStartedAt: room.intermissionStartedAt,
    });
  }
}, 1000 / 30);

io.use((socket, next) => {
  socket.userId = uuidv4();
  next();
});

io.on("connection", (socket) => {
  const shareName = allocPlayerCode();
  const username = "";
  onlineLobby.set(socket.userId, { socketId: socket.id, shareName, username });
  socketByUser.set(socket.userId, socket.id);
  socket.emit("lobby:self", { shareName, userId: socket.userId });

  for (const [rid, room] of rooms.entries()) {
    const idx = room.players.findIndex((p) => p.id === socket.userId);
    if (idx < 0) continue;
    room.players[idx].socketId = socket.id;
    socket.emit("match:start", { roomId: rid, playerIndex: idx });
  }

  broadcastLobby();

  socket.on("lobby:list", () => {
      socket.emit(
        "lobby:players",
        [...onlineLobby.entries()].map(([userId, v]) => ({
          userId,
          shareName: v.shareName,
          username: v.username,
        }))
      );
    });

    socket.on("room:create", () => {
      clearGuestSlotEverywhere(socket.userId);
      if (findHostRoomId(socket.userId)) {
        socket.emit("game:error", { message: "You already have a match as host" });
        return;
      }
      createHostRoom(socket.userId, socket.id);
      broadcastLobby();
    });

    socket.on("join:code", ({ code }, ack) => {
      const done = typeof ack === "function" ? ack : () => {};
      const targetCode = String(code || "").trim();
      if (!/^\d{5}$/.test(targetCode)) {
        const message = "Enter a valid 5-digit host code";
        socket.emit("game:error", { message });
        done({ ok: false, message });
        return;
      }
      let hostUserId = null;
      for (const [uid, v] of onlineLobby.entries()) {
        if (v.shareName === targetCode) {
          hostUserId = uid;
          break;
        }
      }
      if (!hostUserId) {
        const message = "No host found with that code";
        socket.emit("game:error", { message });
        done({ ok: false, message });
        return;
      }
      if (hostUserId === socket.userId) {
        const message = "That is your own host code";
        socket.emit("game:error", { message });
        done({ ok: false, message });
        return;
      }
      const roomId = findHostRoomId(hostUserId);
      if (!roomId) {
        const message = "That host has not started hosting yet";
        socket.emit("game:error", { message });
        done({ ok: false, message });
        return;
      }
      detachUserFromRooms(socket.userId, roomId, { silent: true });
      const joined = attachGuestToRoom(roomId, socket.userId, socket.id);
      if (!joined.ok) {
        const message = joined.reason || "Could not join that host";
        socket.emit("game:error", { message });
        done({ ok: false, message });
        return;
      }
      broadcastLobby();
      done({ ok: true, message: "Joined host room" });
    });

    socket.on("invite:send", ({ targetUserId }) => {
      const target = String(targetUserId || "");
      if (!target || target === socket.userId) return;
      const entry = onlineLobby.get(target);
      if (!entry) {
        socket.emit("game:error", { message: "That player is not online" });
        return;
      }

      const targetHostRoomId = findHostRoomId(target);
      if (targetHostRoomId) {
        const room = rooms.get(targetHostRoomId);
        const p1 = room.players[1];
        if (p1.socketId != null && p1.id != null && p1.id !== socket.userId) {
          socket.emit("game:error", { message: "That player's match is full" });
          return;
        }
        detachUserFromRooms(socket.userId, targetHostRoomId, { silent: true });
        const joined = attachGuestToRoom(targetHostRoomId, socket.userId, socket.id);
        if (!joined.ok) {
          socket.emit("game:error", { message: joined.reason });
          return;
        }
        broadcastLobby();
        return;
      }

      clearGuestSlotEverywhere(socket.userId);
      let roomId = findHostRoomId(socket.userId);
      if (!roomId) {
        roomId = createHostRoom(socket.userId, socket.id);
      } else {
        const room = rooms.get(roomId);
        const p1 = room.players[1];
        if (p1.socketId != null && p1.id != null && p1.id !== target) {
          socket.emit("game:error", {
            message: "Your match already has an opponent. Wait until they disconnect to invite someone else.",
          });
          return;
        }
      }
      const fromShareName = onlineLobby.get(socket.userId)?.shareName || "Player";
      io.to(entry.socketId).emit("invite:incoming", {
        roomId,
        fromUserId: socket.userId,
        fromShareName,
      });
    });

    socket.on("invite:accept", ({ roomId: rid }) => {
      const roomId = String(rid || "");
      if (!rooms.has(roomId)) {
        socket.emit("game:error", { message: "That match no longer exists" });
        return;
      }
      detachUserFromRooms(socket.userId, roomId, { silent: true });
      const result = attachGuestToRoom(roomId, socket.userId, socket.id);
      if (!result.ok) {
        socket.emit("game:error", { message: result.reason });
        return;
      }
      broadcastLobby();
    });

    socket.on("invite:decline", () => {
      /* client-only UI cleanup; no server state */
    });

    socket.on("match:input", (payload) => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      const player = room.players[idx];
      const enemy = room.players[idx === 0 ? 1 : 0];
      if (!player) return;

      player.controls = payload.controls || {};
      if (payload.action === "chargeStart") {
        player.charging = true;
        player.chargeStart = Date.now();
      }
      if (payload.action === "chargeRelease" && player.charging) {
        const heldMs = Date.now() - player.chargeStart;
        if (heldMs < MELEE_QUICK_TAP_MS) {
          const inRange = Math.abs(player.x - enemy.x) <= MELEE_RANGE;
          const facingToward = (enemy.x - player.x) * player.facing > 0;
          if (inRange && facingToward) {
            enemy.health = Math.max(0, enemy.health - 10);
          }
        } else {
          const cappedMs = Math.min(heldMs, MAX_CHARGE_MS);
          const shot = chargedShotFromHeldMs(cappedMs);
          const centerY = 544;
          room.projectiles.push({
            x: player.x + 20,
            y: centerY - shot.h / 2,
            w: shot.w,
            h: shot.h,
            vx: player.facing * shot.speed,
            damage: shot.damage,
            targetIdx: idx === 0 ? 1 : 0,
          });
        }
        player.charging = false;
      }
    });

    socket.on("match:join", ({ roomId }) => {
      if (rooms.has(roomId)) socket.join(roomId);
    });

    socket.on("disconnect", () => {
      socketByUser.delete(socket.userId);
      onlineLobby.delete(socket.userId);
      broadcastLobby();
      for (const [roomId, room] of rooms.entries()) {
        const idx = room.players.findIndex((p) => p.socketId === socket.id);
        if (idx < 0) continue;
        if (idx === 0) {
          io.to(roomId).emit("match:end", { reason: "Host disconnected" });
          rooms.delete(roomId);
        } else {
          room.players[1].id = null;
          room.players[1].socketId = null;
        }
      }
    });
});

initDb()
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to init DB", err);
    process.exit(1);
  });
