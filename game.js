const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const FLOOR_Y = 560;
const keys = new Set();
const keyTimes = new Map();
const authTokenKey = "bat-duel-token";
const MOVE_SPEED = 4;
const GRAVITY = 0.7;
const JUMP_VELOCITY = -12.5;
const GAME_KEYS = new Set(["KeyA", "KeyD", "KeyW", "KeyS", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

let mode = "single";
let socket = null;
let roomId = null;
let playerIndex = 0;
let arcadeStep = "welcome";
const visualState = [
  { recoilUntil: 0, attackUntil: 0, charging: false, prevHealth: 100 },
  { recoilUntil: 0, attackUntil: 0, charging: false, prevHealth: 100 },
];
let roundLockUntil = 0;
let localState = {
  round: 1,
  players: [
    { x: 220, y: FLOOR_Y, vx: 0, vy: 0, health: 100, facing: 1, score: 0, color: "#2f7dff", jumpsUsed: 0, onGround: true, fireCooldown: 0 },
    { x: 760, y: FLOOR_Y, vx: 0, vy: 0, health: 100, facing: -1, score: 0, color: "#e44b4b", jumpsUsed: 0, onGround: true, fireCooldown: 0 },
  ],
  projectiles: [],
};

const profile = {
  token: localStorage.getItem(authTokenKey) || "",
  username: "",
  email: "",
  friends: [],
};

const overlayEl = document.getElementById("arcadeOverlay");
const stepLabelEl = document.getElementById("arcadeStepLabel");
const arcadeTitleEl = document.getElementById("arcadeTitle");
const arcadeTextEl = document.getElementById("arcadeText");
const arcadeActionsEl = document.getElementById("arcadeActions");
const settingsDrawerEl = document.getElementById("settingsDrawer");
const settingsBackdropEl = document.getElementById("settingsBackdrop");

function showBanner(text) {
  const el = document.getElementById("roundBanner");
  el.textContent = text;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 1200);
}

function setMatchStatus(text) {
  document.getElementById("matchStatus").textContent = text;
}

function openSettings() {
  settingsDrawerEl.classList.add("open");
  settingsBackdropEl.classList.remove("hidden");
}

function closeSettings() {
  settingsDrawerEl.classList.remove("open");
  settingsBackdropEl.classList.add("hidden");
}

function setArcadeStep(step) {
  arcadeStep = step;
  const steps = {
    welcome: {
      index: "Step 1 of 4",
      title: "Welcome to Bat Duel",
      text: "Start a new arcade session and follow the guided setup.",
      actions: [{ id: "next", label: "Start Setup" }],
    },
    mode: {
      index: "Step 2 of 4",
      title: "Choose Game Mode",
      text: "Single and local start instantly. Online requires login.",
      actions: [
        { id: "single", label: "Single Player" },
        { id: "multi", label: "Local Multiplayer" },
        { id: "online", label: "Online Matchmaking" },
      ],
    },
    auth: {
      index: "Step 3 of 4",
      title: "Sign In for Online",
      text: "Open Settings, use Send Code and Verify, then continue.",
      actions: [
        { id: "checkAuth", label: "I Verified My Email" },
        { id: "backMode", label: "Back to Mode Select" },
      ],
    },
    ready: {
      index: "Step 4 of 4",
      title: "Ready",
      text: "Launch this round now.",
      actions: [{ id: "launch", label: "Play Round" }],
    },
    queueing: {
      index: "Step 4 of 4",
      title: "Queueing Online Match",
      text: "Waiting for an opponent to join...",
      actions: [{ id: "cancelOnline", label: "Cancel Queue" }],
    },
  };
  const view = steps[step];
  stepLabelEl.textContent = view.index;
  arcadeTitleEl.textContent = view.title;
  arcadeTextEl.textContent = view.text;
  arcadeActionsEl.innerHTML = "";
  view.actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.action = action.id;
    btn.textContent = action.label;
    arcadeActionsEl.appendChild(btn);
  });
  overlayEl.classList.remove("hidden");
}

function hideArcadeOverlay() {
  overlayEl.classList.add("hidden");
}

function drawPlayer(p) {
  const idx = p.color === "#2f7dff" ? 0 : 1;
  const v = visualState[idx];
  const now = Date.now();
  if (p.health < v.prevHealth) {
    v.recoilUntil = now + 180;
  }
  v.prevHealth = p.health;
  const recoil = now < v.recoilUntil ? 1 : 0;
  const attackPose = now < v.attackUntil ? 1 : 0;
  const chargePose = v.charging ? 1 : 0;

  const stride = Math.sin((Date.now() / 140 + p.x * 0.03) * Math.PI) * 4;
  const armSwing = stride * 0.7 + (attackPose ? -8 : 0);
  ctx.save();
  ctx.translate(p.x + 23 - recoil * 7 * (p.facing || 1), p.y + 26);
  ctx.scale(p.facing || 1, 1);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2.5;

  // Legs
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.lineTo(-10, 34 + stride);
  ctx.moveTo(7, 18);
  ctx.lineTo(10, 34 - stride);
  ctx.stroke();

  // Torso
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.roundRect(-13, -3, 26, 25, 8);
  ctx.fill();
  ctx.strokeRect(-13, -3, 26, 25);

  // Arms
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-25, 12 + armSwing + (chargePose ? 3 : 0));
  ctx.moveTo(12, 6);
  ctx.lineTo(24, attackPose ? -5 : 12 - armSwing - (chargePose ? 10 : 0));
  ctx.stroke();

  // Bat in the forward hand
  ctx.strokeStyle = "#1f1f1f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  const batStartY = attackPose ? -5 : 12 - armSwing - (chargePose ? 10 : 0);
  const batEndY = attackPose ? 12 : 26 - armSwing - (chargePose ? 12 : 0);
  ctx.moveTo(24, batStartY);
  ctx.lineTo(39, batEndY);
  ctx.stroke();

  // Head
  ctx.fillStyle = "#f0c8a0";
  ctx.beginPath();
  ctx.arc(0, -16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair band / helmet accent using team color
  ctx.fillStyle = p.color;
  ctx.fillRect(-10, -24, 20, 4);

  // Shoulder guards for more human silhouette clarity
  ctx.fillRect(-16, 1, 4, 7);
  ctx.fillRect(12, 1, 4, 7);

  // Face
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4, -17, 2.5, 0, Math.PI * 2);
  ctx.arc(4, -17, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-4, -17, 1, 0, Math.PI * 2);
  ctx.arc(4, -17, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-3, -11);
  ctx.lineTo(3, -11);
  ctx.stroke();

  ctx.restore();
}

function drawHealthBar(x, y, hp, color, label) {
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(x, y, 260, 28);
  ctx.strokeStyle = "#6f84b3";
  ctx.strokeRect(x, y, 260, 28);
  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y + 4, Math.max(0, (hp / 100) * 252), 20);
  ctx.fillStyle = "#fff";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`${label} ${Math.floor(hp)} HP`, x + 10, y + 18);
}

function render() {
  updateLocalGame();
  ctx.fillStyle = "#121a2f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#30466f";
  ctx.fillRect(0, 560, canvas.width, 60);
  localState.projectiles.forEach((s) => {
    ctx.fillStyle = "#ffd269";
    ctx.fillRect(s.x, s.y, s.w, s.h);
  });
  localState.players.forEach(drawPlayer);
  drawHealthBar(18, 14, localState.players[0].health, localState.players[0].color, `Blue ${localState.players[0].score}`);
  drawHealthBar(canvas.width - 278, 14, localState.players[1].health, localState.players[1].color, `Red ${localState.players[1].score}`);
  ctx.fillStyle = "#fff";
  ctx.font = "700 22px Trebuchet MS";
  ctx.fillText(`Round ${localState.round}/10`, canvas.width / 2 - 68, 34);
  requestAnimationFrame(render);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function tryJump(idx, code) {
  const p = localState.players[idx];
  const now = performance.now();
  const prev = keyTimes.get(code) || 0;
  keyTimes.set(code, now);
  const boosted = now - prev < 260;
  if (p.onGround || p.jumpsUsed < 2) {
    p.vy = JUMP_VELOCITY * (boosted ? 1.12 : 1);
    p.onGround = false;
    p.jumpsUsed += 1;
  }
}

function doMelee(attackerIdx) {
  const defenderIdx = attackerIdx === 0 ? 1 : 0;
  const attacker = localState.players[attackerIdx];
  const defender = localState.players[defenderIdx];
  visualState[attackerIdx].attackUntil = Date.now() + 180;
  const inRange = Math.abs(attacker.x - defender.x) <= 72;
  const facingToward = (defender.x - attacker.x) * attacker.facing > 0;
  if (inRange && facingToward) {
    defender.health = clamp(defender.health - 10, 0, 100);
  }
}

function fireProjectile(attackerIdx, forcedDamage = null) {
  const attacker = localState.players[attackerIdx];
  const damage = forcedDamage ?? 10;
  localState.projectiles.push({
    x: attacker.x + 20,
    y: attacker.y + 2,
    w: 18,
    h: 8,
    vx: attacker.facing * 9,
    target: attackerIdx === 0 ? 1 : 0,
    damage,
  });
}

function resetInputState() {
  keys.clear();
  visualState[0].charging = false;
  visualState[1].charging = false;
}

function updateLocalGame() {
  if (mode === "online") return;
  if (!overlayEl.classList.contains("hidden")) return;
  if (Date.now() < roundLockUntil) return;

  // Guard against missed keyup when focus changes.
  if (!keys.has("KeyS")) visualState[0].charging = false;
  if (!keys.has("ArrowDown")) visualState[1].charging = false;

  const p1 = localState.players[0];
  const p2 = localState.players[1];
  p1.fireCooldown = Math.max(0, p1.fireCooldown - 1);
  p2.fireCooldown = Math.max(0, p2.fireCooldown - 1);
  const p1Left = keys.has("KeyA");
  const p1Right = keys.has("KeyD");
  const p2Left = mode === "multi" ? keys.has("ArrowLeft") : false;
  const p2Right = mode === "multi" ? keys.has("ArrowRight") : false;

  p1.vx = p1Left === p1Right ? 0 : p1Left ? -MOVE_SPEED : MOVE_SPEED;
  if (p1.vx !== 0) p1.facing = p1.vx > 0 ? 1 : -1;

  if (mode === "multi") {
    p2.vx = p2Left === p2Right ? 0 : p2Left ? -MOVE_SPEED : MOVE_SPEED;
    if (p2.vx !== 0) p2.facing = p2.vx > 0 ? 1 : -1;
  } else {
    const d = p1.x - p2.x;
    p2.vx = Math.abs(d) > 60 ? (d > 0 ? MOVE_SPEED * 0.75 : -MOVE_SPEED * 0.75) : 0;
    if (p2.vx !== 0) p2.facing = p2.vx > 0 ? 1 : -1;
    if (Math.abs(d) < 70 && Math.random() < 0.02) doMelee(1);
    if (Math.abs(d) > 140 && Math.random() < 0.01) fireProjectile(1, 20);
    if (p2.onGround && Math.random() < 0.005) {
      p2.vy = JUMP_VELOCITY;
      p2.onGround = false;
      p2.jumpsUsed = 1;
    }
  }

  if (keys.has("KeyS") && p1.fireCooldown <= 0) {
    fireProjectile(0, 10);
    p1.fireCooldown = 6;
    visualState[0].attackUntil = Date.now() + 120;
  }
  if (mode === "multi" && keys.has("ArrowDown") && p2.fireCooldown <= 0) {
    fireProjectile(1, 10);
    p2.fireCooldown = 6;
    visualState[1].attackUntil = Date.now() + 120;
  }

  for (const p of localState.players) {
    p.vy += GRAVITY;
    p.x = clamp(p.x + p.vx, 0, canvas.width - 46);
    p.y += p.vy;
    if (p.y >= FLOOR_Y) {
      p.y = FLOOR_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumpsUsed = 0;
    } else {
      p.onGround = false;
    }
  }

  localState.projectiles.forEach((shot) => {
    shot.x += shot.vx;
    const target = localState.players[shot.target];
    const hit = shot.x < target.x + 46 && shot.x + shot.w > target.x && shot.y < target.y + 40 && shot.y + shot.h > target.y - 20;
    if (hit) {
      target.health = clamp(target.health - shot.damage, 0, 100);
      shot.dead = true;
    }
    if (shot.x < -50 || shot.x > canvas.width + 50) shot.dead = true;
  });
  localState.projectiles = localState.projectiles.filter((s) => !s.dead);

  if (p1.health <= 0 || p2.health <= 0) {
    const winner = p1.health <= 0 ? 1 : 0;
    localState.players[winner].score += 1;
    showBanner(`${winner === 0 ? "Blue" : "Red"} wins round`);
    localState.round += 1;
    if (localState.round > 10) {
      showBanner("Match reset");
      localState.round = 1;
      p1.score = 0;
      p2.score = 0;
    }
    p1.health = 100;
    p2.health = 100;
    p1.x = 220;
    p2.x = 760;
    p1.y = FLOOR_Y;
    p2.y = FLOOR_Y;
    p1.vx = p2.vx = p1.vy = p2.vy = 0;
    localState.projectiles = [];
    roundLockUntil = Date.now() + 900;
  }
}

async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (profile.token) headers.Authorization = `Bearer ${profile.token}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderFriends() {
  const list = document.getElementById("friendsList");
  list.innerHTML = "";
  profile.friends.forEach((friend) => {
    const li = document.createElement("li");
    li.textContent = friend.username;
    list.appendChild(li);
  });
}

async function loadProfileFromServer() {
  if (!profile.token) return;
  try {
    const user = await api("/api/profile");
    profile.username = user.username;
    profile.email = user.email || "";
    const friends = await api("/api/friends");
    profile.friends = friends.friends;
    document.getElementById("authStatus").textContent = "Authenticated.";
  } catch {
    profile.token = "";
    localStorage.removeItem(authTokenKey);
  }
}

function setupSocket() {
  if (!profile.token) {
    openSettings();
    setArcadeStep("auth");
    return;
  }
  if (socket) socket.disconnect();
  socket = io({
    auth: { token: profile.token },
  });

  socket.on("connect", () => {
    setMatchStatus("Connected. Queueing...");
    socket.emit("queue:join");
    setArcadeStep("queueing");
  });

  socket.on("match:start", (payload) => {
    roomId = payload.roomId;
    playerIndex = payload.playerIndex;
    socket.emit("match:join", { roomId });
    mode = "online";
    showBanner("Online match started");
    setMatchStatus(`Online match: ${roomId.slice(0, 8)}`);
    hideArcadeOverlay();
  });

  socket.on("match:state", (state) => {
    localState = state;
  });

  socket.on("match:end", ({ reason }) => {
    setMatchStatus(reason);
    showBanner(reason);
    mode = "single";
    setArcadeStep("mode");
  });
}

function localReset() {
  localState = {
    round: 1,
    players: [
      { x: 220, y: FLOOR_Y, vx: 0, vy: 0, health: 100, facing: 1, score: 0, color: "#2f7dff", jumpsUsed: 0, onGround: true, fireCooldown: 0 },
      { x: 760, y: FLOOR_Y, vx: 0, vy: 0, health: 100, facing: -1, score: 0, color: "#e44b4b", jumpsUsed: 0, onGround: true, fireCooldown: 0 },
    ],
    projectiles: [],
  };
  roundLockUntil = 0;
  visualState[0] = { recoilUntil: 0, attackUntil: 0, charging: false, prevHealth: 100 };
  visualState[1] = { recoilUntil: 0, attackUntil: 0, charging: false, prevHealth: 100 };
}

window.addEventListener("keydown", (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  keys.add(e.code);
  if (mode !== "online") {
    if (e.code === "KeyW") tryJump(0, "KeyW");
    if (mode === "multi" && e.code === "ArrowUp") tryJump(1, "ArrowUp");
    if (e.code === "KeyS" && !visualState[0].charging) {
      visualState[0].charging = true;
    }
    if (mode === "multi" && e.code === "ArrowDown" && !visualState[1].charging) {
      visualState[1].charging = true;
    }
  }
  if (mode === "online" && socket && roomId) {
    const controls =
      playerIndex === 0
        ? { left: keys.has("KeyA"), right: keys.has("KeyD"), attack: keys.has("KeyS") }
        : { left: keys.has("ArrowLeft"), right: keys.has("ArrowRight"), attack: keys.has("ArrowDown") };
    if (e.code === (playerIndex === 0 ? "KeyS" : "ArrowDown")) visualState[playerIndex].charging = true;
    socket.emit("match:input", { controls });
  }
});

window.addEventListener("keyup", (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  keys.delete(e.code);
  if (mode !== "online") {
    if (e.code === "KeyS") {
      visualState[0].charging = false;
    }
    if (mode === "multi" && e.code === "ArrowDown") {
      visualState[1].charging = false;
    }
  }
  if (mode === "online" && socket && roomId) {
    const controls =
      playerIndex === 0
        ? { left: keys.has("KeyA"), right: keys.has("KeyD"), attack: keys.has("KeyS") }
        : { left: keys.has("ArrowLeft"), right: keys.has("ArrowRight"), attack: keys.has("ArrowDown") };
    if (e.code === (playerIndex === 0 ? "KeyS" : "ArrowDown")) {
      visualState[playerIndex].charging = false;
    }
    socket.emit("match:input", { controls });
  }
});

window.addEventListener("blur", resetInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetInputState();
});

function setupUI() {
  document.getElementById("singleBtn").addEventListener("click", () => {
    mode = "single";
    setMatchStatus("Single player mode.");
    localReset();
    setArcadeStep("ready");
    closeSettings();
  });
  document.getElementById("multiBtn").addEventListener("click", () => {
    mode = "multi";
    setMatchStatus("Local multiplayer (same keyboard).");
    localReset();
    setArcadeStep("ready");
    closeSettings();
  });
  document.getElementById("onlineBtn").addEventListener("click", () => {
    mode = "online";
    setArcadeStep(profile.token ? "ready" : "auth");
  });
  document.getElementById("restartBtn").addEventListener("click", () => {
    localReset();
    setArcadeStep("mode");
    closeSettings();
  });

  document.getElementById("sendCodeBtn").addEventListener("click", async () => {
    try {
      const email = document.getElementById("emailInput").value.trim();
      await api("/api/auth/send-code", "POST", { email });
      profile.email = email;
      document.getElementById("authStatus").textContent = "Code sent. Check your inbox.";
    } catch (err) {
      showBanner(err.message);
    }
  });

  document.getElementById("verifyCodeBtn").addEventListener("click", async () => {
    try {
      const email = document.getElementById("emailInput").value.trim();
      const code = document.getElementById("codeInput").value.trim();
      const username = document.getElementById("usernameInput").value.trim();
      const out = await api("/api/auth/verify", "POST", { email, code, username });
      profile.token = out.token;
      profile.username = out.user.username;
      profile.email = out.user.email;
      localStorage.setItem(authTokenKey, profile.token);
      document.getElementById("authStatus").textContent = "Authenticated.";
      await loadProfileFromServer();
      renderFriends();
      if (mode === "online") {
        setArcadeStep("ready");
      }
      closeSettings();
    } catch (err) {
      showBanner(err.message);
    }
  });

  document.getElementById("saveProfileBtn").addEventListener("click", async () => {
    try {
      if (!profile.token) throw new Error("Sign in first");
      const username = document.getElementById("usernameInput").value.trim();
      const user = await api("/api/profile", "PUT", { username });
      profile.username = user.username;
      showBanner("Profile saved");
    } catch (err) {
      showBanner(err.message);
    }
  });

  document.getElementById("inviteBtn").addEventListener("click", async () => {
    try {
      if (!profile.token) throw new Error("Sign in first");
      const username = document.getElementById("friendInput").value.trim();
      await api("/api/friends/invite", "POST", { username });
      const friends = await api("/api/friends");
      profile.friends = friends.friends;
      renderFriends();
      showBanner("Friend added");
    } catch (err) {
      showBanner(err.message);
    }
  });

  arcadeActionsEl.addEventListener("click", (e) => {
    const action = e.target?.dataset?.action;
    if (!action) return;
    if (action === "next") setArcadeStep("mode");
    if (action === "single") {
      mode = "single";
      localReset();
      setMatchStatus("Single player mode.");
      setArcadeStep("ready");
    }
    if (action === "multi") {
      mode = "multi";
      localReset();
      setMatchStatus("Local multiplayer (same keyboard).");
      setArcadeStep("ready");
    }
    if (action === "online") {
      mode = "online";
      setArcadeStep(profile.token ? "ready" : "auth");
      openSettings();
    }
    if (action === "checkAuth") {
      setArcadeStep(profile.token ? "ready" : "auth");
      if (!profile.token) showBanner("Verify email first");
      if (!profile.token) openSettings();
    }
    if (action === "backMode") setArcadeStep("mode");
    if (action === "launch") {
      if (mode === "online") {
        setupSocket();
      } else {
        hideArcadeOverlay();
        showBanner(`${mode === "single" ? "Single Player" : "Local Multiplayer"} started`);
      }
    }
    if (action === "cancelOnline") {
      if (socket) socket.disconnect();
      socket = null;
      roomId = null;
      mode = "single";
      setMatchStatus("Online queue cancelled.");
      setArcadeStep("mode");
    }
  });

  document.getElementById("settingsToggleBtn").addEventListener("click", openSettings);
  document.getElementById("settingsCloseBtn").addEventListener("click", closeSettings);
  settingsBackdropEl.addEventListener("click", closeSettings);
}

async function boot() {
  await loadProfileFromServer();
  document.getElementById("usernameInput").value = profile.username;
  document.getElementById("emailInput").value = profile.email;
  renderFriends();
  setupUI();
  setArcadeStep("welcome");
  render();
}

boot();
