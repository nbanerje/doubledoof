/** View (DOM) size — game logic and layout stay in this space. */
const VIEW_W = 1040;
const VIEW_H = 620;
/** Internal pixel buffer — nearest-neighbor scaled to canvas for chunky pixels. */
const GAME_W = 520;
const GAME_H = 310;
const viewCanvas = document.getElementById("gameCanvas");
const gameCanvas = document.createElement("canvas");
gameCanvas.width = GAME_W;
gameCanvas.height = GAME_H;
const ctx = gameCanvas.getContext("2d");
const viewCtx = viewCanvas.getContext("2d");

function beginPixelGameFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(GAME_W / VIEW_W, 0, 0, GAME_H / VIEW_H, 0, 0);
}

function endPixelGameFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vw = viewCanvas.width || VIEW_W;
  const vh = viewCanvas.height || VIEW_H;
  viewCtx.clearRect(0, 0, vw, vh);
  viewCtx.imageSmoothingEnabled = false;
  viewCtx.drawImage(gameCanvas, 0, 0, GAME_W, GAME_H, 0, 0, vw, vh);
}

function hudStrokeFillText(vc, text, x, y, fillStyle) {
  vc.lineJoin = "round";
  vc.miterLimit = 2;
  vc.lineWidth = 4;
  vc.strokeStyle = "rgba(6,8,16,0.92)";
  vc.strokeText(text, x, y);
  vc.fillStyle = fillStyle;
  vc.fillText(text, x, y);
}

function drawHealthBarHud(vc, x, y, hp, color, label, maxHp = DEFAULT_MAX_HP) {
  const cap = Math.max(1, maxHp);
  const bw = 260;
  const bh = 34;
  vc.save();
  vc.imageSmoothingEnabled = true;
  vc.fillStyle = "rgba(6,8,16,0.88)";
  vc.beginPath();
  vc.roundRect(x - 3, y - 3, bw + 6, bh + 6, 8);
  vc.fill();
  vc.fillStyle = "#141820";
  vc.beginPath();
  vc.roundRect(x, y, bw, bh, 6);
  vc.fill();
  vc.strokeStyle = "rgba(180,195,230,0.55)";
  vc.lineWidth = 2;
  vc.stroke();
  const innerMax = bw - 16;
  const innerW = Math.max(0, (hp / cap) * innerMax);
  vc.fillStyle = color;
  vc.beginPath();
  vc.roundRect(x + 8, y + 8, innerW, bh - 16, 4);
  vc.fill();
  vc.font = HUD_FONT_MAIN;
  vc.textAlign = "left";
  vc.textBaseline = "bottom";
  hudStrokeFillText(vc, `${label}  ${Math.round(hp)} / ${cap}`, x + 10, y + bh - 7, "#f4f7ff");
  vc.restore();
}

function drawOrbAmmoBarHud(vc, x, y, p, color, shortLabel) {
  const ammo = playerOrbAmmoDisplay(p);
  if (ammo === null) return;
  const max = ORB_AMMO_PER_ROUND;
  const bw = 260;
  const bh = 14;
  const padBottom = 22;
  vc.save();
  vc.imageSmoothingEnabled = true;
  vc.fillStyle = "rgba(6,8,16,0.88)";
  vc.beginPath();
  vc.roundRect(x - 3, y - 3, bw + 6, bh + padBottom + 6, 8);
  vc.fill();
  vc.fillStyle = "#161c28";
  vc.beginPath();
  vc.roundRect(x, y, bw, bh, 5);
  vc.fill();
  vc.strokeStyle = ammo <= 0 ? "rgba(200,90,90,0.75)" : "rgba(120,145,200,0.65)";
  vc.lineWidth = 2;
  vc.stroke();
  const inner = bw - 12;
  const cellW = inner / max;
  for (let i = 0; i < max; i += 1) {
    const filled = i < ammo;
    const cx = x + 6 + i * cellW;
    const cw = Math.max(2, cellW - 2);
    vc.fillStyle = filled ? color : "#2a3348";
    vc.beginPath();
    vc.roundRect(cx, y + 4, cw, bh - 8, 3);
    vc.fill();
    if (filled) {
      vc.fillStyle = "rgba(255,255,255,0.28)";
      vc.fillRect(cx, y + 4, cw, 3);
    }
  }
  vc.font = HUD_FONT_SMALL;
  vc.textAlign = "left";
  vc.textBaseline = "top";
  const sub = ammo <= 0 ? "#ffb4b0" : "#dce6ff";
  hudStrokeFillText(vc, `${shortLabel} orbs  ${ammo} / ${max}`, x + 8, y + bh + 6, sub);
  vc.restore();
}

function drawRoundIntermissionHud(vc) {
  if (localState.buffPickActive) return;
  const now = Date.now();
  let start = 0;
  let end = 0;
  if (mode === "online") {
    start = localState.intermissionStartedAt || 0;
    end = localState.lockUntil || 0;
  } else {
    start = roundIntermissionStartAt;
    end = roundLockUntil;
  }
  if (start <= 0 || now >= end) return;
  const elapsed = now - start;
  const tick = Math.floor(elapsed / 1000);
  let label = null;
  if (tick < 3) label = String(3 - tick);
  else if (tick < 4) label = "GO!";
  if (label == null) return;
  vc.save();
  vc.imageSmoothingEnabled = true;
  vc.fillStyle = "rgba(8,10,20,0.68)";
  vc.fillRect(0, 0, VIEW_W, VIEW_H);
  vc.textAlign = "center";
  vc.textBaseline = "middle";
  vc.font = '800 96px "DM Sans", system-ui, sans-serif';
  vc.lineWidth = 6;
  vc.strokeStyle = "rgba(6,8,18,0.95)";
  vc.strokeText(label, VIEW_W / 2, VIEW_H / 2 - 24);
  vc.fillStyle = "#fde047";
  vc.fillText(label, VIEW_W / 2, VIEW_H / 2 - 24);
  const result = localState.roundResult;
  if (result && Number.isInteger(result.winnerIdx) && Number.isInteger(result.loserIdx)) {
    const winnerName = result.winnerIdx === 0 ? "Blue" : "Red";
    const loserName = result.loserIdx === 0 ? "Blue" : "Red";
    const winnerColor = result.winnerIdx === 0 ? "#7ec8ff" : "#ff9aa3";
    const loserColor = result.loserIdx === 0 ? "#7ec8ff" : "#ff9aa3";
    const boxW = 560;
    const boxH = 126;
    const boxX = VIEW_W / 2 - boxW / 2;
    const boxY = VIEW_H / 2 + 54;
    vc.fillStyle = "rgba(7, 12, 26, 0.84)";
    vc.beginPath();
    vc.roundRect(boxX, boxY, boxW, boxH, 16);
    vc.fill();
    vc.strokeStyle = "rgba(180, 200, 255, 0.42)";
    vc.lineWidth = 2;
    vc.stroke();
    vc.font = '800 28px "DM Sans", system-ui, sans-serif';
    vc.textBaseline = "top";
    hudStrokeFillText(vc, `${winnerName} won the round`, VIEW_W / 2, boxY + 16, winnerColor);
    vc.font = HUD_FONT_MAIN;
    vc.textAlign = "left";
    const leftX = boxX + 34;
    const rightX = boxX + boxW / 2 + 24;
    hudStrokeFillText(
      vc,
      `${winnerName}: ${Math.max(0, Math.round(result.winnerHealth ?? 0))} HP left`,
      leftX,
      boxY + 62,
      winnerColor
    );
    hudStrokeFillText(
      vc,
      `${loserName}: ${Math.max(0, Math.round(result.loserHealth ?? 0))} HP left`,
      rightX,
      boxY + 62,
      loserColor
    );
    hudStrokeFillText(
      vc,
      `${winnerName} wins: ${result.winnerScore ?? 0}/${WINS_TO_END_MATCH}`,
      leftX,
      boxY + 90,
      "#f4f7ff"
    );
    hudStrokeFillText(
      vc,
      `${loserName} wins: ${result.loserScore ?? 0}/${WINS_TO_END_MATCH}`,
      rightX,
      boxY + 90,
      "#f4f7ff"
    );
  }
  vc.restore();
}

function drawHudOnView() {
  if (!overlayEl.classList.contains("hidden")) return;
  const vw = viewCanvas.width || VIEW_W;
  const vh = viewCanvas.height || VIEW_H;
  const vc = viewCtx;
  vc.save();
  vc.setTransform(vw / VIEW_W, 0, 0, vh / VIEW_H, 0, 0);
  vc.imageSmoothingEnabled = true;
  const p0 = localState.players[0];
  const p1 = localState.players[1];
  drawHealthBarHud(vc, 18, 12, p0.health, p0.color, `Blue · ${p0.score} wins`, playerMaxHp(p0));
  drawOrbAmmoBarHud(vc, 18, 52, p0, p0.color, "Blue");
  drawHealthBarHud(vc, VIEW_W - 278, 12, p1.health, p1.color, `Red · ${p1.score} wins`, playerMaxHp(p1));
  drawOrbAmmoBarHud(vc, VIEW_W - 278, 52, p1, p1.color, "Red");
  const lvl = currentLevel();
  vc.textAlign = "center";
  vc.textBaseline = "alphabetic";
  vc.font = HUD_FONT_TITLE;
  hudStrokeFillText(
    vc,
    `Match first to ${WINS_TO_END_MATCH}  ·  ${lvl.name}  ·  Round ${localState.round}`,
    VIEW_W / 2,
    28,
    "#f4f7ff"
  );
  vc.font = HUD_FONT_SMALL;
  hudStrokeFillText(
    vc,
    `Wins  Blue ${p0.score} / ${WINS_TO_END_MATCH}  ·  Red ${p1.score} / ${WINS_TO_END_MATCH}`,
    VIEW_W / 2,
    50,
    "rgba(228,235,255,0.95)"
  );
  if (mode === "online" && playerIndex === 0 && myShareName) {
    vc.textAlign = "center";
    vc.font = HUD_FONT_MAIN;
    hudStrokeFillText(vc, `Host code: ${myShareName}`, VIEW_W / 2, 72, "#7ec8ff");
  }
  vc.textAlign = "left";
  if (overlayEl.classList.contains("hidden") && !localState.buffPickActive) {
    drawRoundIntermissionHud(vc);
  }
  vc.restore();
}

const arcadeExtraEl = document.getElementById("arcadeExtra");
const FLOOR_Y = 560;
/** Axis-aligned body: `p.x` left, `p.y` top; feet sit on `plat.y` / `FLOOR_Y`. Matches draw anchor (feet ≈ translateY + 37). */
const PLAYER_BODY_W = 36;
const PLAYER_BODY_H = 48;
const keys = new Set();
const keyTimes = new Map();
const authTokenKey = "bat-duel-token";
const ACCOUNT_AUTH_DISABLED = true;
const MOVE_SPEED = 4;
/** Horizontal velocity eases toward input each frame (reduces jitter / stair-stepping). */
const MOVE_ACCEL = 0.4;
/** Extra braking when input is neutral so fighters fully stop (no residual drift). */
const MOVE_STOP_ACCEL = 0.62;
const MOVE_VX_SNAP = 0.035;

/** HUD is drawn on the view canvas with smoothing (readable UI over pixel game). */
const HUD_FONT_MAIN = '600 15px "DM Sans", system-ui, sans-serif';
const HUD_FONT_SMALL = '500 13px "DM Sans", system-ui, sans-serif';
const HUD_FONT_TITLE = '600 17px "DM Sans", system-ui, sans-serif';
const GRAVITY = 0.7;
/** While charging in the air, gravity is multiplied by this (lower = floatier). */
const CHARGE_AIR_GRAVITY_MULT = 0.26;
const JUMP_VELOCITY = -12.5;
/** No minimum hold before orb appears; shot power scales from first frame of hold. */
const CHARGE_THRESHOLD_MS = 0;
/** Between-round intermission: 3-2-1 + GO + brief pause before fighters move again */
const ROUND_INTERMISSION_MS = 4000;
const MAX_CHARGE_MS = 12000;
/** Shorter scale = max charge reached faster */
const CHARGE_SCALE_MS = 3200;
/** Buff cards / keys ignore input until this many ms after the overlay opens */
const BUFF_PICK_GATE_MS = 2000;
/** All buffs in the pool; each pick shows 3 different cards chosen at random. */
const BUFF_POOL = [
  "triple",
  "tank",
  "power",
  "infiniteJumps",
  "infiniteAmmo",
  "instantMaxCharge",
  "meleeLong",
  "fireBreath",
];
const BUFF_DEFS = {
  triple: { name: "Triple shot", desc: "Each charged release fires 3 orbs" },
  tank: { name: "Tank", desc: "+30 max HP for the match" },
  power: { name: "Power", desc: "+35% damage for the match" },
  infiniteJumps: { name: "Sky", desc: "Unlimited mid-air jumps" },
  infiniteAmmo: { name: "Bottomless", desc: "Infinite orb ammo" },
  instantMaxCharge: { name: "Overcharge", desc: "Shots are always full tier V" },
  meleeLong: { name: "Duelist", desc: "Melee range and swing 2× longer" },
  fireBreath: { name: "Fire Breath", desc: "Hold a mapped key to breathe scaling fire" },
};

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

/** `triple` is always one of the three. Everything else: weight 1; Bottomless (infinite ammo) is rarer. */
const BUFF_POOL_NO_TRIPLE = BUFF_POOL.filter((id) => id !== "triple");
const BUFF_INFINITE_AMMO_RARITY = 0.12;

function buffPickWeight(id) {
  return id === "infiniteAmmo" ? BUFF_INFINITE_AMMO_RARITY : 1;
}

/**
 * Picks 2 distinct buffs from `ids` without replacement, favoring rarer `infiniteAmmo` less often.
 */
function pickWeightedPairWithoutReplacement(ids) {
  if (ids.length < 2) {
    return ids.length === 1 ? [ids[0], ids[0]] : ["tank", "power"];
  }
  let wSum = 0;
  for (const id of ids) wSum += buffPickWeight(id);
  let r = Math.random() * wSum;
  let first = ids[ids.length - 1];
  for (const id of ids) {
    r -= buffPickWeight(id);
    if (r <= 0) {
      first = id;
      break;
    }
  }
  const rest = ids.filter((id) => id !== first);
  wSum = 0;
  for (const id of rest) wSum += buffPickWeight(id);
  r = Math.random() * wSum;
  let second = rest[rest.length - 1];
  for (const id of rest) {
    r -= buffPickWeight(id);
    if (r <= 0) {
      second = id;
      break;
    }
  }
  return [first, second];
}

/**
 * Picks 3 cards: always includes **triple**; the other 2 are weighted (Bottomless is rare).
 * Order is shuffled so the triple card moves between A / W / D. Same-set avoidance vs last intermission.
 */
function pickRandomBuffTriplet() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const [x, y] = pickWeightedPairWithoutReplacement([...BUFF_POOL_NO_TRIPLE]);
    const triplet = ["triple", x, y];
    shuffleInPlace(triplet);
    const key = [...triplet].sort().join("|");
    if (!localState.buffLastOfferedKey || key !== localState.buffLastOfferedKey) {
      return { triplet, key };
    }
  }
  const [x, y] = pickWeightedPairWithoutReplacement([...BUFF_POOL_NO_TRIPLE]);
  const triplet = ["triple", x, y];
  shuffleInPlace(triplet);
  return { triplet, key: [...triplet].sort().join("|") };
}
const SWING_DURATION_MS = 200;
/** Bat swing reach (shorter than before) */
const MELEE_RANGE = 48;
/** Horizontal push on defender when melee connects */
const MELEE_KNOCKBACK_VX = 50;
const FIRE_BREATH_RANGE = PLAYER_BODY_W * 1.5;
const FIRE_BREATH_H = 20;
const FIRE_BREATH_TICK_MS = 100;
const FIRE_BREATH_BASE_DAMAGE = 3;
const FIRE_BREATH_SLOW_MULT = 0.42;
const DEFAULT_MAX_HP = 100;
const TANK_BUFF_MAX_HP = 130;
/** A match ends as soon as one side reaches this many round wins. */
const WINS_TO_END_MATCH = 5;
/** Charged orb damage = `ORB_DAMAGE_MIN + ORB_DAMAGE_RANGE * chargeCurve` (before power buff). */
const ORB_DAMAGE_MIN = 6;
const ORB_DAMAGE_RANGE = 26;
/** Charged shots per fighter per round (each projectile counts; triple uses 3). */
const ORB_AMMO_PER_ROUND = 10;
const AMMO_RELOAD_IDLE_MS = 5000;
const AMMO_RELOAD_AMOUNT = 5;
const POWER_BUFF_DAMAGE_MULT = 1.35;
const BINDINGS_STORAGE_KEY = "bat-duel-bindings-v1";

const PERCIVAL_IDLE_URL = "./assets/percival-idle.png";
const PERCIVAL_RUN_URLS = [
  "./assets/percival-run-1.png",
  "./assets/percival-run-2.png",
  "./assets/percival-run-3.png",
  "./assets/percival-run-4.png",
];
const PERCIVAL_HIT_URL = "./assets/percival-hit.png";
const GUY2_IDLE_URL = "./assets/guy2-idle.png";
const GUY2_RUN_URLS = [
  "./assets/guy2-run-1.png",
  "./assets/guy2-run-2.png",
  "./assets/guy2-run-3.png",
  "./assets/guy2-run-4.png",
];
const GUY2_HIT_URL = "./assets/guy2-hit.png";
const MELEE_SWORD_URL = "./assets/melee-sword.png";
const percivalIdleImage = new Image();
const meleeSwordImage = new Image();
const percivalHitImage = new Image();
const guy2IdleImage = new Image();
const guy2HitImage = new Image();
const percivalRunImages = PERCIVAL_RUN_URLS.map(() => new Image());
const guy2RunImages = GUY2_RUN_URLS.map(() => new Image());
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let percivalIdleBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let percivalHitBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let guy2IdleBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let guy2HitBlit = null;
/**
 * Four run blits in order: 1 → 2 → 3 → 4 → loop (each file is keyed + cropped to the knight).
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let percivalRun = null;
/**
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let guy2Run = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let meleeSwordBlit = null;

function globalAlphaBbox(d, iw, ih) {
  let minX = iw;
  let minY = ih;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < ih; y += 1) {
    for (let x = 0; x < iw; x += 1) {
      if (d[(y * iw + x) * 4 + 3] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Key plate to canvas: purple out + bottom text strip; returns canvas + imagedata.
 */
function keyPercivalToCanvas(img) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return null;
  const c = document.createElement("canvas");
  c.width = iw;
  c.height = ih;
  const c2 = c.getContext("2d", { willReadFrequently: true });
  if (!c2) return null;
  c2.imageSmoothingEnabled = false;
  c2.drawImage(img, 0, 0);
  const im = c2.getImageData(0, 0, iw, ih);
  const d = im.data;
  const c00 = 0;
  const c10 = (iw - 1) * 4;
  const c01 = (ih - 1) * iw * 4;
  const c11 = ((ih - 1) * iw + (iw - 1)) * 4;
  const br = (d[c00] + d[c10] + d[c01] + d[c11]) / 4;
  const bg = (d[c00 + 1] + d[c10 + 1] + d[c01 + 1] + d[c11 + 1]) / 4;
  const bb = (d[c00 + 2] + d[c10 + 2] + d[c01 + 2] + d[c11 + 2]) / 4;
  const thresh = 70 * 70;
  const textBandY = Math.floor(ih * 0.74);
  for (let p = 0; p < d.length; p += 4) {
    const y = (p / 4 / iw) | 0;
    const r = d[p] - br;
    const g = d[p + 1] - bg;
    const b = d[p + 2] - bb;
    if (r * r + g * g + b * b < thresh) {
      d[p + 3] = 0;
    } else if (y >= textBandY && d[p] + d[p + 1] + d[p + 2] > 650) {
      d[p + 3] = 0;
    }
  }
  c2.putImageData(im, 0, 0);
  return { canvas: c, d, iw, ih };
}

/** Single idle: tight crop. */
function buildPercivalIdleBlit(img) {
  const k = keyPercivalToCanvas(img);
  if (!k) return null;
  const { canvas, d, iw, ih } = k;
  const bb = globalAlphaBbox(d, iw, ih);
  if (!bb) return null;
  return {
    canvas,
    cx: bb.minX,
    cy: bb.minY,
    cw: bb.maxX - bb.minX + 1,
    ch: bb.maxY - bb.minY + 1,
  };
}

function initPercivalIdleBlit() {
  if (!percivalIdleImage.naturalWidth) return;
  percivalIdleBlit = buildPercivalIdleBlit(percivalIdleImage);
}
percivalIdleImage.onload = initPercivalIdleBlit;
percivalIdleImage.src = PERCIVAL_IDLE_URL;
if (percivalIdleImage.complete) initPercivalIdleBlit();

function initPercivalHitBlit() {
  if (!percivalHitImage.naturalWidth) return;
  percivalHitBlit = buildPercivalIdleBlit(percivalHitImage);
}
percivalHitImage.onload = initPercivalHitBlit;
percivalHitImage.src = PERCIVAL_HIT_URL;
if (percivalHitImage.complete) initPercivalHitBlit();

function initGuy2IdleBlit() {
  if (!guy2IdleImage.naturalWidth) return;
  guy2IdleBlit = buildPercivalIdleBlit(guy2IdleImage);
}
guy2IdleImage.onload = initGuy2IdleBlit;
guy2IdleImage.src = GUY2_IDLE_URL;
if (guy2IdleImage.complete) initGuy2IdleBlit();

function initGuy2HitBlit() {
  if (!guy2HitImage.naturalWidth) return;
  guy2HitBlit = buildPercivalIdleBlit(guy2HitImage);
}
guy2HitImage.onload = initGuy2HitBlit;
guy2HitImage.src = GUY2_HIT_URL;
if (guy2HitImage.complete) initGuy2HitBlit();

function initMeleeSwordBlit() {
  if (!meleeSwordImage.naturalWidth) return;
  meleeSwordBlit = buildPercivalIdleBlit(meleeSwordImage);
}
meleeSwordImage.onload = initMeleeSwordBlit;
meleeSwordImage.src = MELEE_SWORD_URL;
if (meleeSwordImage.complete) initMeleeSwordBlit();

function tryInitGuy2Run() {
  for (let i = 0; i < guy2RunImages.length; i += 1) {
    const im = guy2RunImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < guy2RunImages.length; i += 1) {
    const b = buildPercivalIdleBlit(guy2RunImages[i]);
    if (!b) return;
    frames.push(b);
  }
  guy2Run = { frames };
}
for (let i = 0; i < guy2RunImages.length; i += 1) {
  guy2RunImages[i].onload = tryInitGuy2Run;
  guy2RunImages[i].src = GUY2_RUN_URLS[i];
  if (guy2RunImages[i].complete) tryInitGuy2Run();
}

function tryInitPercivalRun() {
  for (let i = 0; i < percivalRunImages.length; i += 1) {
    const im = percivalRunImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < percivalRunImages.length; i += 1) {
    const b = buildPercivalIdleBlit(percivalRunImages[i]);
    if (!b) return;
    frames.push(b);
  }
  percivalRun = { frames };
}
for (let i = 0; i < percivalRunImages.length; i += 1) {
  percivalRunImages[i].onload = tryInitPercivalRun;
  percivalRunImages[i].src = PERCIVAL_RUN_URLS[i];
  if (percivalRunImages[i].complete) tryInitPercivalRun();
}

function defaultKeyBindings() {
  return {
    p0: {
      left: "KeyA",
      right: "KeyD",
      jump: "KeyW",
      melee: "Space",
      charge: "KeyS",
      attack: "KeyS",
      fire: "",
    },
    p1: {
      left: "ArrowLeft",
      right: "ArrowRight",
      jump: "ArrowUp",
      melee: "Comma",
      charge: "ArrowDown",
      attack: "ArrowDown",
      fire: "",
    },
    online: {
      left: "KeyA",
      right: "KeyD",
      jump: "KeyW",
      melee: "KeyF",
      orb: "KeyS",
      fire: "",
    },
  };
}

let keyBindings = defaultKeyBindings();

function loadKeyBindings() {
  try {
    const raw = localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    const def = defaultKeyBindings();
    keyBindings = {
      ...def,
      p0: { ...def.p0, ...(o.p0 || {}) },
      p1: { ...def.p1, ...(o.p1 || {}) },
      online: { ...def.online, ...(o.online || {}) },
    };
    if (!keyBindings.p1.melee) keyBindings.p1.melee = def.p1.melee;
    if (!keyBindings.p1.charge) keyBindings.p1.charge = def.p1.charge;
    if (keyBindings.p0.fire == null) keyBindings.p0.fire = def.p0.fire;
    if (keyBindings.p1.fire == null) keyBindings.p1.fire = def.p1.fire;
    keyBindings.p0.attack = keyBindings.p0.charge;
    keyBindings.p1.attack = keyBindings.p1.charge;
    if (!keyBindings.online.melee) keyBindings.online.melee = def.online.melee;
    if (!keyBindings.online.orb) keyBindings.online.orb = keyBindings.online.attack || def.online.orb;
    if (keyBindings.online.fire == null) keyBindings.online.fire = def.online.fire;
  } catch (_) {
    /* ignore */
  }
}

function saveKeyBindings() {
  try {
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(keyBindings));
  } catch (_) {
    /* ignore */
  }
}

function bindingCodesFlat() {
  const s = new Set();
  const add = (c) => {
    if (typeof c === "string" && c.length) s.add(c);
  };
  const { p0, p1, online } = keyBindings;
  add(p0.left);
  add(p0.right);
  add(p0.jump);
  add(p0.melee);
  add(p0.charge);
  add(p0.attack);
  add(p0.fire);
  add(p1.left);
  add(p1.right);
  add(p1.jump);
  add(p1.melee);
  add(p1.charge);
  add(p1.attack);
  add(p1.fire);
  add(online.left);
  add(online.right);
  add(online.jump);
  add(online.melee);
  add(online.orb);
  add(online.fire);
  return s;
}

function shouldPreventGameKey(code) {
  return bindingCodesFlat().has(code);
}

function p0FireKey() {
  return keyBindings.p0.charge;
}

function p1FireKey() {
  return keyBindings.p1.charge;
}

function onlineK() {
  return keyBindings.online;
}

let remapState = {
  active: false,
  /** @type {"p0"|"p1"|"online"|""} */
  target: "",
  fields: [],
  i: 0,
  temp: {},
};

function clearArcadeExtra() {
  if (arcadeExtraEl) arcadeExtraEl.innerHTML = "";
}

function formatKeyLabel(code) {
  if (!code) return "?";
  if (code === "Space") return "Space";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Arrow")) return code.replace("Arrow", "");
  return code;
}

function describeBindings(playerIdx) {
  if (playerIdx === 0) {
    const b = keyBindings.p0;
    return `Move <kbd>${formatKeyLabel(b.left)}</kbd> / <kbd>${formatKeyLabel(b.right)}</kbd>, jump <kbd>${formatKeyLabel(b.jump)}</kbd>, melee <kbd>${formatKeyLabel(b.melee)}</kbd>, charge <kbd>${formatKeyLabel(b.charge)}</kbd>`;
  }
  const b = keyBindings.p1;
  return `Move <kbd>${formatKeyLabel(b.left)}</kbd> / <kbd>${formatKeyLabel(b.right)}</kbd>, jump <kbd>${formatKeyLabel(b.jump)}</kbd>, melee <kbd>${formatKeyLabel(b.melee)}</kbd>, charge <kbd>${formatKeyLabel(b.charge)}</kbd>`;
}

function describeOnlineBindings() {
  const b = keyBindings.online;
  return `Move <kbd>${formatKeyLabel(b.left)}</kbd> / <kbd>${formatKeyLabel(b.right)}</kbd>, jump <kbd>${formatKeyLabel(b.jump)}</kbd>, melee <kbd>${formatKeyLabel(b.melee)}</kbd>, orb <kbd>${formatKeyLabel(b.orb)}</kbd>`;
}

function wizardFieldsForPlayer() {
  return [
    { id: "left", label: "Move left" },
    { id: "right", label: "Move right" },
    { id: "jump", label: "Jump" },
    { id: "melee", label: "Melee (sword / bat swing)" },
    { id: "charge", label: "Charge shot (hold for orb, release to fire)" },
  ];
}

function wizardFieldsOnline() {
  return [
    { id: "left", label: "Move left" },
    { id: "right", label: "Move right" },
    { id: "jump", label: "Jump" },
    { id: "melee", label: "Melee attack" },
    { id: "orb", label: "Orb charge/shot" },
  ];
}

function teardownRemapWizard() {
  if (!remapState.active) return;
  remapState.active = false;
  remapState.target = "";
  window.removeEventListener("keydown", onRemapKeydown, true);
}

function collectOtherPlayerCodes(target) {
  if (target === "online") return new Set();
  const used = new Set();
  const add = (c) => {
    if (typeof c === "string" && c.length) used.add(c);
  };
  if (target === "p0") {
    const o = keyBindings.p1;
    add(o.left);
    add(o.right);
    add(o.jump);
    add(o.melee);
    add(o.charge);
    add(o.attack);
  } else if (target === "p1") {
    const o = keyBindings.p0;
    add(o.left);
    add(o.right);
    add(o.jump);
    add(o.melee);
    add(o.charge);
    add(o.attack);
  }
  return used;
}

function showRemapPrompt() {
  if (!arcadeExtraEl) return;
  const f = remapState.fields[remapState.i];
  arcadeExtraEl.innerHTML = `<p class="bind-hint">Press a key</p><p><strong>${f.label}</strong></p><p class="bind-muted">Esc — cancel this mapping</p>`;
}

function onRemapKeydown(e) {
  if (!remapState.active) return;
  if (e.repeat) return;
  e.preventDefault();
  e.stopPropagation();
  const backTarget = remapState.target;
  if (e.code === "Escape") {
    teardownRemapWizard();
    if (backTarget === "p0") setArcadeStep("controls_p1");
    else if (backTarget === "p1") setArcadeStep("controls_p2");
    else if (backTarget === "online") setArcadeStep("controls_online");
    return;
  }
  const blocked = new Set([
    "Tab",
    "F5",
    "F11",
    "F12",
    "MetaLeft",
    "MetaRight",
    "ContextMenu",
    "CapsLock",
  ]);
  if (blocked.has(e.code)) return;
  const field = remapState.fields[remapState.i];
  const used = new Set([...Object.values(remapState.temp), ...collectOtherPlayerCodes(remapState.target)]);
  if (used.has(e.code)) {
    arcadeExtraEl.innerHTML = `<p class="bind-hint">That key is already used</p><p><strong>${field.label}</strong></p><p class="bind-muted">Try a different key · Esc to cancel</p>`;
    return;
  }
  remapState.temp[field.id] = e.code;
  remapState.i += 1;
  if (remapState.i >= remapState.fields.length) {
    commitRemap();
    return;
  }
  showRemapPrompt();
}

function commitRemap() {
  const t = remapState.target;
  if (t === "online") {
    keyBindings.online = { ...keyBindings.online, ...remapState.temp };
  } else if (t === "p0") {
    const next = { ...keyBindings.p0, ...remapState.temp };
    next.attack = next.charge;
    keyBindings.p0 = next;
  } else if (t === "p1") {
    const next = { ...keyBindings.p1, ...remapState.temp };
    next.attack = next.charge;
    keyBindings.p1 = next;
  }
  saveKeyBindings();
  teardownRemapWizard();
  clearArcadeExtra();
  if (t === "online") {
    setupSocket();
    return;
  }
  if (t === "p0") {
    if (mode === "multi") setArcadeStep("controls_p2");
    else launchLocalRoundFromSetup();
    return;
  }
  launchLocalRoundFromSetup();
}

function startRemapWizard(playerIdx) {
  teardownRemapWizard();
  remapState.active = true;
  remapState.target = playerIdx === 0 ? "p0" : "p1";
  remapState.fields = wizardFieldsForPlayer();
  remapState.i = 0;
  remapState.temp = {};
  arcadeStep = "remap";
  stepLabelEl.textContent = "Control setup";
  arcadeTitleEl.textContent = playerIdx === 0 ? "Player 1 — set keys" : "Player 2 — set keys";
  arcadeTextEl.textContent = "";
  arcadeActionsEl.innerHTML = "";
  clearArcadeExtra();
  overlayEl.classList.remove("hidden");
  window.addEventListener("keydown", onRemapKeydown, true);
  showRemapPrompt();
}

function startRemapWizardOnline() {
  teardownRemapWizard();
  remapState.active = true;
  remapState.target = "online";
  remapState.fields = wizardFieldsOnline();
  remapState.i = 0;
  remapState.temp = {};
  arcadeStep = "remap";
  stepLabelEl.textContent = "Control setup";
  arcadeTitleEl.textContent = "Your keys (online)";
  arcadeTextEl.textContent = "";
  arcadeActionsEl.innerHTML = "";
  clearArcadeExtra();
  overlayEl.classList.remove("hidden");
  window.addEventListener("keydown", onRemapKeydown, true);
  showRemapPrompt();
}

function resetPlayerBindingsDefault(playerIdx) {
  const d = defaultKeyBindings();
  if (playerIdx === 0) keyBindings.p0 = { ...d.p0 };
  else keyBindings.p1 = { ...d.p1 };
  saveKeyBindings();
}

function resetOnlineBindingsDefault() {
  const d = defaultKeyBindings();
  keyBindings.online = { ...d.online };
  saveKeyBindings();
}

function renderControlChoiceScreen(playerIdx) {
  const name = playerIdx === 0 ? "Player 1 (Blue)" : "Player 2 (Red)";
  stepLabelEl.textContent = "Control setup";
  arcadeTitleEl.textContent = `${name}`;
  arcadeTextEl.textContent =
    "Before the round, choose the default layout or map your own keys. You will be asked to press one key for each action.";
  arcadeActionsEl.innerHTML = "";
  if (arcadeExtraEl) arcadeExtraEl.innerHTML = `<p class="arcade-bind-summary">${describeBindings(playerIdx)}</p>`;

  const keep = document.createElement("button");
  keep.type = "button";
  keep.dataset.action = playerIdx === 0 ? "bind0_keep" : "bind1_keep";
  keep.textContent = "Keep default";
  arcadeActionsEl.appendChild(keep);

  const map = document.createElement("button");
  map.type = "button";
  map.dataset.action = playerIdx === 0 ? "bind0_map" : "bind1_map";
  map.textContent = "Create new mapping";
  arcadeActionsEl.appendChild(map);

  if (playerIdx === 1) {
    const back = document.createElement("button");
    back.type = "button";
    back.dataset.action = "bind1_back";
    back.textContent = "Back";
    arcadeActionsEl.appendChild(back);
  }

  overlayEl.classList.remove("hidden");
}

function renderOnlineControlChoice() {
  stepLabelEl.textContent = "Control setup";
  arcadeTitleEl.textContent = "Your keys (online)";
  arcadeTextEl.textContent =
    "Map movement, jump, melee, and orb before you enter the lobby. These keys apply on blue or red side.";
  arcadeActionsEl.innerHTML = "";
  if (arcadeExtraEl) arcadeExtraEl.innerHTML = `<p class="arcade-bind-summary">${describeOnlineBindings()}</p>`;

  const keep = document.createElement("button");
  keep.type = "button";
  keep.dataset.action = "online_bind_keep";
  keep.textContent = "Keep default";
  arcadeActionsEl.appendChild(keep);

  const map = document.createElement("button");
  map.type = "button";
  map.dataset.action = "online_bind_map";
  map.textContent = "Create new mapping";
  arcadeActionsEl.appendChild(map);

  overlayEl.classList.remove("hidden");
}

/** Distinct level layouts; `getLevelForRound` cycles (first-to-5 match length is independent). */
const LEVELS = [
  {
    name: "Neon Wharf",
    bg: "night",
    ground: "#30466f",
    platforms: [
      { x: 140, y: 490, w: 180, h: 14 },
      { x: 420, y: 430, w: 210, h: 14 },
      { x: 760, y: 500, w: 170, h: 14 },
      { x: 620, y: 340, w: 150, h: 14 },
    ],
  },
  {
    name: "Sunrise Deck",
    bg: "sunny",
    ground: "#4a8f6a",
    platforms: [
      { x: 90, y: 485, w: 170, h: 14 },
      { x: 360, y: 415, w: 220, h: 14 },
      { x: 680, y: 495, w: 200, h: 14 },
      { x: 540, y: 330, w: 160, h: 14 },
    ],
  },
  {
    name: "Violet Docks",
    bg: "dusk",
    ground: "#4a3f62",
    platforms: [
      { x: 120, y: 500, w: 200, h: 14 },
      { x: 400, y: 445, w: 180, h: 14 },
      { x: 720, y: 475, w: 175, h: 14 },
      { x: 580, y: 355, w: 155, h: 14 },
    ],
  },
  {
    name: "Solar Yard",
    bg: "sunny",
    ground: "#5a9356",
    platforms: [
      { x: 160, y: 478, w: 150, h: 14 },
      { x: 330, y: 380, w: 240, h: 14 },
      { x: 640, y: 510, w: 190, h: 14 },
      { x: 800, y: 420, w: 130, h: 14 },
    ],
  },
  {
    name: "Storm Pier",
    bg: "storm",
    ground: "#354c5c",
    platforms: [
      { x: 110, y: 492, w: 190, h: 14 },
      { x: 380, y: 438, w: 200, h: 14 },
      { x: 650, y: 488, w: 210, h: 14 },
      { x: 500, y: 320, w: 170, h: 14 },
    ],
  },
  {
    name: "Aurora Span",
    bg: "aurora",
    ground: "#2f4d5c",
    platforms: [
      { x: 130, y: 505, w: 175, h: 14 },
      { x: 410, y: 360, w: 165, h: 14 },
      { x: 610, y: 455, w: 195, h: 14 },
      { x: 780, y: 385, w: 145, h: 14 },
    ],
  },
  {
    name: "Brightline Roof",
    bg: "sunny",
    ground: "#6a9b78",
    platforms: [
      { x: 70, y: 470, w: 160, h: 14 },
      { x: 280, y: 400, w: 260, h: 14 },
      { x: 600, y: 500, w: 180, h: 14 },
      { x: 850, y: 450, w: 120, h: 14 },
    ],
  },
  {
    name: "Midnight Run",
    bg: "night",
    ground: "#2a3a58",
    platforms: [
      { x: 150, y: 488, w: 165, h: 14 },
      { x: 450, y: 425, w: 195, h: 14 },
      { x: 740, y: 498, w: 165, h: 14 },
      { x: 590, y: 348, w: 145, h: 14 },
    ],
  },
  {
    name: "Copper Haze",
    bg: "dusk",
    ground: "#5c4550",
    platforms: [
      { x: 100, y: 495, w: 185, h: 14 },
      { x: 350, y: 430, w: 225, h: 14 },
      { x: 670, y: 465, w: 185, h: 14 },
      { x: 520, y: 365, w: 150, h: 14 },
    ],
  },
  {
    name: "Clear Skies Arena",
    bg: "sunny",
    ground: "#509068",
    platforms: [
      { x: 140, y: 500, w: 175, h: 14 },
      { x: 400, y: 395, w: 200, h: 14 },
      { x: 700, y: 505, w: 170, h: 14 },
      { x: 560, y: 335, w: 155, h: 14 },
    ],
  },
];

function getLevelForRound(round) {
  return LEVELS[(Math.max(1, round) - 1) % LEVELS.length];
}

function nextLevelIndex(currentIdx) {
  if (LEVELS.length <= 1) return 0;
  const cur = Number.isInteger(currentIdx) ? currentIdx : 0;
  return (cur + 1 + Math.floor(Math.random() * (LEVELS.length - 1))) % LEVELS.length;
}

function currentLevel() {
  if (Number.isInteger(localState.levelIndex)) return LEVELS[localState.levelIndex % LEVELS.length];
  return getLevelForRound(localState.round);
}

function currentPlatforms() {
  return currentLevel().platforms;
}

let mode = "single";
/** Konami-style: last digit keys typed (digits only); `2017` → red (P2) gets 1000 max HP in local play. */
let cheatRedDigitBuffer = "";
let cheatRedThousandHp = false;
let cheatBlueMeleeBurstHits = 0;
let cheatBlueMeleeBurstPendingOnlineHits = 0;
const CHEAT_RED_MAX_HP = 1000;
const CHEAT_BLUE_MELEE_BURST_DAMAGE = 1000;
const CHEAT_BLUE_MELEE_BURST_HITS = 5;
let socket = null;
let roomId = null;
let playerIndex = 0;
let arcadeStep = "welcome";
let myShareName = "";
let myLobbyUserId = "";
/** @type {{ userId: string, shareName: string, username: string }[]} */
let lobbyRoster = [];
/** @type {{ roomId: string, fromShareName: string, fromUserId: string }[]} */
let pendingInvites = [];
const visualState = [
  {
    recoilUntil: 0,
    attackUntil: 0,
    attackStartAt: 0,
    /** @type {number | undefined} if set, melee swing VFX uses this duration in ms */
    swingDurationMs: undefined,
    /** Melee damage + knockback applied at most once per swing (when blade AABB hits). */
    meleeDealt: false,
    charging: false,
    prevHealth: 100,
    chargeKeyDownAt: 0,
    shootFlashUntil: 0,
    /** @type {number | undefined} last `p.x` for run animation (blue) */
    prevDrawX: undefined,
  },
  {
    recoilUntil: 0,
    attackUntil: 0,
    attackStartAt: 0,
    swingDurationMs: undefined,
    meleeDealt: false,
    charging: false,
    prevHealth: 100,
    chargeKeyDownAt: 0,
    shootFlashUntil: 0,
    /** @type {number | undefined} last `p.x` for run animation (red) */
    prevDrawX: undefined,
  },
];
let roundLockUntil = 0;
/** Start time of current between-round countdown (local single/multi). */
let roundIntermissionStartAt = 0;

function startLocalRoundCountdown(durationMs = ROUND_INTERMISSION_MS) {
  roundIntermissionStartAt = Date.now();
  roundLockUntil = roundIntermissionStartAt + durationMs;
}

function launchLocalRoundFromSetup() {
  hideArcadeOverlay();
  startLocalRoundCountdown();
  showBanner(`${mode === "single" ? "Single Player" : "Local Multiplayer"} started`);
}
/** Smoothed x for walk animation (online); snaps to `p.x` offline. */
const playerPrevRenderX = [220, 760];
const ONLINE_RENDER_PREV_LERP = 0.42;

function syncPlayerRenderPrev(idx, x) {
  if (mode === "online") {
    const prev = playerPrevRenderX[idx];
    playerPrevRenderX[idx] = prev + (x - prev) * ONLINE_RENDER_PREV_LERP;
  } else {
    playerPrevRenderX[idx] = x;
  }
}
let localState = {
  round: 1,
  levelIndex: 0,
  players: [
    {
      x: 220,
      y: FLOOR_Y - PLAYER_BODY_H,
      vx: 0,
      vy: 0,
      health: 100,
      facing: 1,
      score: 0,
      color: "#2f7dff",
      orbAmmo: ORB_AMMO_PER_ROUND,
      lastShotAt: Date.now(),
      jumpsUsed: 0,
      onGround: true,
      chargeStartAt: 0,
    },
    {
      x: 760,
      y: FLOOR_Y - PLAYER_BODY_H,
      vx: 0,
      vy: 0,
      health: 100,
      facing: -1,
      score: 0,
      color: "#e44b4b",
      orbAmmo: ORB_AMMO_PER_ROUND,
      lastShotAt: Date.now(),
      jumpsUsed: 0,
      onGround: true,
      chargeStartAt: 0,
    },
  ],
  projectiles: [],
  buffPickActive: false,
  buffPickLoser: 0,
  buffPickInputUnlocked: false,
  buffPickOptions: null,
  /** Sorted id triplet for the last intermission; next pick avoids repeating the same set. */
  buffLastOfferedKey: null,
  roundResult: null,
};

const profile = {
  token: ACCOUNT_AUTH_DISABLED ? "" : localStorage.getItem(authTokenKey) || "",
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
const touchOverlayEl = document.getElementById("touchOverlay");
const touchJoystickEl = document.getElementById("touchJoystick");
const touchStickEl = document.getElementById("touchStick");
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0;
const touchState = {
  enabled: isTouchDevice,
  left: false,
  right: false,
  jumpFromStick: false,
  attack: false,
  orb: false,
  fire: false,
  prevLeft: false,
  prevRight: false,
  prevJumpFromStick: false,
  prevAttack: false,
  prevOrb: false,
  prevFire: false,
};

function onlineControlsFromInput() {
  const ok = onlineK();
  return {
    left: keys.has(ok.left) || touchState.left,
    right: keys.has(ok.right) || touchState.right,
    jump: keys.has(ok.jump) || touchState.jumpFromStick,
  };
}

function refreshTouchOverlayVisibility() {
  if (!touchOverlayEl) return;
  const visible =
    touchState.enabled && overlayEl.classList.contains("hidden") && !settingsDrawerEl.classList.contains("open");
  touchOverlayEl.classList.toggle("hidden", !visible);
  const fireBtn = touchOverlayEl.querySelector('[data-touch-action="fire"]');
  const localPlayer = mode === "online" ? localState.players[playerIndex] : localState.players[0];
  if (fireBtn) fireBtn.classList.toggle("hidden", !visible || !localPlayer?.fireBreath);
}

function showBanner(text, durationMs = 1200) {
  const el = document.getElementById("roundBanner");
  el.textContent = text;
  el.classList.remove("hidden");
  if (showBanner._hideT) {
    clearTimeout(showBanner._hideT);
  }
  showBanner._hideT = setTimeout(() => {
    el.classList.add("hidden");
    showBanner._hideT = null;
  }, durationMs);
}

function setMatchStatus(text) {
  document.getElementById("matchStatus").textContent = text;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function refreshOnlineLobbyIfOpen() {
  if (arcadeStep === "online_lobby" && !roomId) renderOnlineLobby();
}

function renderOnlineLobby() {
  stepLabelEl.textContent = "Online";
  arcadeTitleEl.textContent = "Play online";
  arcadeTextEl.textContent =
    "Choose Host to open one spot. Share your 5-digit code, and your friend can press Join and enter it.";
  arcadeActionsEl.innerHTML = "";

  const host = document.createElement("button");
  host.type = "button";
  host.dataset.action = "lobby_host";
  host.textContent = "Host match (wait for join)";
  arcadeActionsEl.appendChild(host);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.dataset.action = "cancelOnline";
  cancel.textContent = "Disconnect";
  arcadeActionsEl.appendChild(cancel);

  let extra = `<p class="lobby-share">Your host code: <strong>${escapeHtml(myShareName || "…")}</strong></p>`;
  extra += `<div class="lobby-section"><h3 class="lobby-h3">Join with host code</h3>`;
  extra += `<div class="profile-row"><input id="joinCodeInput" type="text" inputmode="numeric" maxlength="5" placeholder="5-digit host code" />`;
  extra += `<button type="button" class="lobby-accept" data-lobby-action="joinCode">Join</button></div>`;
  extra += `<p class="lobby-empty">Host must click “Host match (wait for join)” first.</p></div>`;
  if (pendingInvites.length) {
    extra += `<div class="lobby-section"><h3 class="lobby-h3">Invites</h3><ul class="lobby-invites">`;
    for (const inv of pendingInvites) {
      extra += `<li class="lobby-invite-row"><span class="lobby-invite-from">${escapeHtml(inv.fromShareName)}</span>`;
      extra += `<button type="button" class="lobby-accept" data-lobby-action="accept" data-room-id="${escapeHtml(inv.roomId)}">Accept</button>`;
      extra += `<button type="button" class="lobby-decline" data-lobby-action="decline" data-room-id="${escapeHtml(inv.roomId)}">Decline</button></li>`;
    }
    extra += `</ul></div>`;
  }
  if (arcadeExtraEl) arcadeExtraEl.innerHTML = extra;
  overlayEl.classList.remove("hidden");
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
  teardownRemapWizard();
  clearArcadeExtra();
  arcadeActionsEl.classList.remove("arcade-actions--char-pick");

  if (step === "controls_p1") {
    renderControlChoiceScreen(0);
    return;
  }
  if (step === "controls_p2") {
    renderControlChoiceScreen(1);
    return;
  }
  if (step === "controls_online") {
    renderOnlineControlChoice();
    return;
  }
  if (step === "online_lobby") {
    renderOnlineLobby();
    return;
  }

  const steps = {
    welcome: {
      index: "Step 1 of 3",
      title: "Welcome to Bat Duel",
      text: "Start a new arcade session and map your keys before the round.",
      actions: [{ id: "next", label: "Start Setup" }],
    },
    mode: {
      index: "Step 2 of 3",
      title: "Choose Game Mode",
      text: "Single and local start instantly. Online gives you a 5-digit code — no account.",
      actions: [
        { id: "single", label: "Single Player" },
        { id: "multi", label: "Local Multiplayer" },
        { id: "online", label: "Online (lobby)" },
      ],
    },
  };
  const view = steps[step];
  if (!view) {
    overlayEl.classList.remove("hidden");
    return;
  }
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

/**
 * Melee: keyed sword (plate points left in source; hilt at origin) + light reach hint.
 * Art is shared for both fighters (P0 / P1 / fallback bodies).
 */
function drawMeleeSwingIndicator(p, v, baseY) {
  const now = Date.now();
  if (now >= v.attackUntil) return;
  const swingDur = v.swingDurationMs != null ? v.swingDurationMs : SWING_DURATION_MS;
  const swingT = clamp((now - v.attackStartAt) / Math.max(1, swingDur), 0, 1);
  const fac = p.facing || 1;
  const hx = Math.floor(p.x + PLAYER_BODY_W * 0.5);
  const hy = Math.floor(baseY + 24);
  const reach = MELEE_RANGE * (p.meleeRangeScale != null ? p.meleeRangeScale : 1) + 10;
  const active = swingT > 0.12 && swingT < 0.62;
  const steps = Math.ceil(reach / 3);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (meleeSwordBlit) {
    const bl = meleeSwordBlit;
    const s = Math.max(1.85, 17 / bl.ch) / 13.2;
    const duelistSwordMult =
      p.meleeRangeScale != null && p.meleeRangeScale >= 2 ? 2 : 1;
    const w = bl.cw * s * duelistSwordMult;
    const h = bl.ch * s * duelistSwordMult;
    const handX = hx + fac * 8;
    const handY = Math.floor(baseY + 20);
    const ang = (0.52 - swingT) * Math.PI * 0.55;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(ang);
    ctx.scale(-fac, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -w, -h * 0.5, w, h);
    ctx.restore();
    for (let i = 1; i < steps; i += 1) {
      const px = hx + fac * i * 3;
      const arc = Math.sin((i / steps) * Math.PI) * 6;
      const py = hy - arc;
      ctx.fillStyle = `rgba(200, 220, 255, ${0.06 + swingT * 0.1})`;
      ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
    }
  } else {
    const pulse = 0.35 + 0.4 * Math.sin(swingT * Math.PI);
    for (let i = 1; i < steps; i += 1) {
      const px = hx + fac * i * 3;
      const arc = Math.sin((i / steps) * Math.PI) * 6;
      const py = hy - arc;
      if (active && i > 3) {
        ctx.fillStyle = `rgba(255, 235, 140, ${pulse * (0.25 + i * 0.028)})`;
      } else {
        ctx.fillStyle = `rgba(190, 210, 255, ${0.1 + swingT * 0.18})`;
      }
      ctx.fillRect(Math.floor(px), Math.floor(py), 2, 2);
    }
  }
  if (active) {
    const tip = hx + fac * reach;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + swingT * 0.25})`;
    ctx.fillRect(Math.floor(tip), hy - 8, 3, 3);
    ctx.fillRect(Math.floor(tip - fac * 4), hy - 4, 3, 3);
    ctx.fillRect(Math.floor(tip - fac * 8), hy, 3, 3);
  }
  ctx.restore();
}

/** Visible team strip at the top of the body box (P0 blue, P1 red). */
function drawFighterTopColorBand(p, baseY, idx) {
  if (idx !== 0 && idx !== 1) return;
  const bandH = Math.max(4, Math.floor(PLAYER_BODY_H * 0.13));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = idx === 0 ? "rgba(70, 170, 255, 0.7)" : "rgba(255, 110, 120, 0.72)";
  ctx.fillRect(p.x, baseY, PLAYER_BODY_W, bandH);
  ctx.fillStyle = idx === 0 ? "rgba(35, 100, 220, 0.5)" : "rgba(200, 60, 70, 0.5)";
  ctx.fillRect(p.x, baseY, PLAYER_BODY_W, 2);
  ctx.restore();
}

function drawFighterHealthBar(p, baseY, idx) {
  if (idx !== 0 && idx !== 1) return;
  const maxHp = Math.max(1, playerMaxHp(p));
  const ratio = clamp((p.health ?? maxHp) / maxHp, 0, 1);
  const bw = 48;
  const bh = 6;
  const x = Math.round(p.x + PLAYER_BODY_W / 2 - bw / 2);
  const y = Math.round(Math.max(6, baseY - 13));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "rgba(4, 8, 18, 0.88)";
  ctx.fillRect(x - 1, y - 1, bw + 2, bh + 2);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(x, y, bw, bh);
  ctx.fillStyle = idx === 0 ? "#46aaff" : "#ff6e78";
  ctx.fillRect(x, y, Math.round(bw * ratio), bh);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x, y, Math.round(bw * ratio), 1);
  ctx.restore();
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

  const baseY = p.y !== undefined && p.y !== null ? p.y : FLOOR_Y - PLAYER_BODY_H;
  const px = Math.floor(p.x);
  const py = Math.floor(baseY);

  if (idx === 0 && percivalIdleBlit) {
    const movingH =
      mode === "online"
        ? v.prevDrawX != null && Math.abs(p.x - v.prevDrawX) > 0.2
        : Math.abs(p.vx) > 0.1;
    const useHit = recoil > 0 && percivalHitBlit != null;
    const useRun =
      !useHit && percivalRun != null && percivalRun.frames.length >= 4 && movingH;
    const bl = useHit
      ? percivalHitBlit
      : useRun
        ? (() => {
            const f = percivalRun.frames;
            const fi = Math.floor(performance.now() * 0.012) % f.length;
            const fr = f[fi];
            return { canvas: fr.canvas, cx: fr.cx, cy: fr.cy, cw: fr.cw, ch: fr.ch };
          })()
        : percivalIdleBlit;
    const s = Math.min((PLAYER_BODY_W * 0.96) / bl.cw, (PLAYER_BODY_H * 0.99) / bl.ch);
    const dw = bl.cw * s;
    const dh = bl.ch * s;
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1);
    const footY = baseY + PLAYER_BODY_H;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil && !useHit) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x, baseY, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.translate(footX, footY);
    ctx.scale(p.facing || 1, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -dw / 2, -dh, dw, dh);
    ctx.restore();
  } else if (idx === 1 && guy2IdleBlit) {
    const movingH =
      mode === "online"
        ? v.prevDrawX != null && Math.abs(p.x - v.prevDrawX) > 0.2
        : Math.abs(p.vx) > 0.1;
    const useHit = recoil > 0 && guy2HitBlit != null;
    const useRun =
      !useHit && guy2Run != null && guy2Run.frames.length >= 4 && movingH;
    const bl = useHit
      ? guy2HitBlit
      : useRun
        ? (() => {
            const f = guy2Run.frames;
            const fi = Math.floor(performance.now() * 0.012) % f.length;
            const fr = f[fi];
            return { canvas: fr.canvas, cx: fr.cx, cy: fr.cy, cw: fr.cw, ch: fr.ch };
          })()
        : guy2IdleBlit;
    const s = Math.min((PLAYER_BODY_W * 0.96) / bl.cw, (PLAYER_BODY_H * 0.99) / bl.ch);
    const dw = bl.cw * s;
    const dh = bl.ch * s;
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1);
    const footY = baseY + PLAYER_BODY_H;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil && !useHit) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x, baseY, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.translate(footX, footY);
    ctx.scale(p.facing || 1, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -dw / 2, -dh, dw, dh);
    ctx.restore();
  } else {
    const body = idx === 0 ? "#2f7dff" : "#e44b4b";
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(px - 2, py - 2, PLAYER_BODY_W + 4, PLAYER_BODY_H + 4);
    ctx.fillStyle = body;
    ctx.fillRect(px, py, PLAYER_BODY_W, PLAYER_BODY_H);
    if (recoil) {
      ctx.fillStyle = "rgba(255,60,60,0.35)";
      ctx.fillRect(px, py, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.restore();
  }

  drawFighterHealthBar(p, baseY, idx);
  drawFighterTopColorBand(p, baseY, idx);

  if (attackPose) drawMeleeSwingIndicator(p, v, baseY);

  const cx = p.x + PLAYER_BODY_W / 2 - recoil * 6 * (p.facing || 1);
  const feetY = baseY + PLAYER_BODY_H;
  drawShootMuzzleWorld(p, v, cx, feetY);

  if (idx === 0 || idx === 1) v.prevDrawX = p.x;

  syncPlayerRenderPrev(idx, p.x);
}

/** Extra world-space pixels so muzzle flash reads even if sprite bbox is tight. */
function drawShootMuzzleWorld(p, v, cx, feetY) {
  if (Date.now() >= v.shootFlashUntil) return;
  const fac = p.facing || 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const ox = cx + fac * 22;
  const oy = feetY - 38;
  const pix = [
    [0, 0, "#fff"],
    [4 * fac, -2, "#fef08a"],
    [8 * fac, 1, "#fde047"],
    [12 * fac, -4, "#fff"],
  ];
  for (const [dx, dy, c] of pix) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(ox + dx), Math.round(oy + dy), 3, 3);
  }
  ctx.restore();
}

function playerMaxHp(p) {
  return p.maxHealth != null ? p.maxHealth : DEFAULT_MAX_HP;
}

function playerOrbAmmoDisplay(p) {
  if (mode === "online") return null;
  if (p.infiniteAmmo) return ORB_AMMO_PER_ROUND;
  return clamp(p.orbAmmo != null ? p.orbAmmo : ORB_AMMO_PER_ROUND, 0, ORB_AMMO_PER_ROUND);
}

/** 5 distinct tiers: higher ratio = more charge. Colors read clearly in-game. */
function chargeTierFromDisplayRatio(r) {
  const x = clamp(r, 0, 1);
  if (x < 0.2) return { label: "I", core: "#fef08a", rim: "#a16207", glow: "rgba(254, 240, 138, 0.6)", tip: "#fde047" };
  if (x < 0.4) return { label: "II", core: "#fbbf24", rim: "#b45309", glow: "rgba(251, 191, 36, 0.62)", tip: "#f59e0b" };
  if (x < 0.6) return { label: "III", core: "#fb923c", rim: "#c2410c", glow: "rgba(251, 146, 60, 0.64)", tip: "#ea580c" };
  if (x < 0.8) return { label: "IV", core: "#e879f9", rim: "#a21caf", glow: "rgba(232, 121, 249, 0.65)", tip: "#c026d3" };
  return { label: "V", core: "#e0e7ff", rim: "#5b21b6", glow: "rgba(196, 181, 253, 0.75)", tip: "#7c3aed" };
}

function chargeTierFromDamage(damage) {
  return chargeTierFromDisplayRatio((damage - ORB_DAMAGE_MIN) / ORB_DAMAGE_RANGE);
}

function drawPixelDisc(cx0, cy0, r, fill, stroke) {
  const cx = Math.round(cx0);
  const cy = Math.round(cy0);
  const ri = Math.max(1, Math.round(r));
  for (let dy = -ri - 3; dy <= ri + 3; dy += 1) {
    for (let dx = -ri - 3; dx <= ri + 3; dx += 1) {
      const d2 = dx * dx + dy * dy;
      if (d2 <= ri * ri) {
        ctx.fillStyle = fill;
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      } else if (d2 <= (ri + 2) * (ri + 2) && d2 > ri * ri) {
        ctx.fillStyle = stroke;
        ctx.fillRect(cx + dx, cy + dy, 1, 1);
      }
    }
  }
}

function drawChargeOrb(p, playerIdx) {
  const vs = visualState[playerIdx];
  if (!vs.charging) return;
  const ammo = playerOrbAmmoDisplay(p);
  if (ammo !== null && ammo <= 0) return;
  const start =
    p.chargeStartAt != null && p.chargeStartAt > 0 ? p.chargeStartAt : vs.chargeKeyDownAt || 0;
  if (start === 0) return;
  let displayRatio;
  if (p.instantMaxCharge) {
    displayRatio = 1;
  } else {
    const holdMs = Date.now() - start;
    if (holdMs < CHARGE_THRESHOLD_MS) return;
    displayRatio = clamp((holdMs - CHARGE_THRESHOLD_MS) / CHARGE_SCALE_MS, 0, 1);
  }
  const tier = chargeTierFromDisplayRatio(displayRatio);
  const pulse = 1 + 0.08 * Math.sin(performance.now() * 0.014);
  const baseY = p.y !== undefined && p.y !== null ? p.y : FLOOR_Y - PLAYER_BODY_H;
  const cx = p.x + Math.floor(PLAYER_BODY_W * 0.52) + p.facing * (14 + displayRatio * 22);
  const cy = baseY + Math.floor(PLAYER_BODY_H * 0.42);
  const baseR = (3 + displayRatio * 18) * pulse;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  drawPixelDisc(cx, cy, baseR + 4 + displayRatio * 5, tier.tip, "#0a0a0a");
  drawPixelDisc(cx, cy, baseR + 1, tier.tip, "#1a1828");
  drawPixelDisc(cx, cy, baseR, tier.core, tier.rim);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 4, 2, 6);
  ctx.fillRect(Math.round(cx) + 2, Math.round(cy) - 4, 2, 6);
  ctx.fillStyle = "#f1f5ff";
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = "center";
  ctx.fillText(tier.label, Math.round(cx), Math.round(cy) + 3);
  ctx.restore();
}

function drawProjectile(s) {
  const tier = chargeTierFromDamage(s.damage);
  const t = clamp((s.damage - ORB_DAMAGE_MIN) / ORB_DAMAGE_RANGE, 0, 1);
  const x = Math.floor(s.x);
  const y = Math.floor(s.y);
  const w = Math.max(2, Math.ceil(s.w));
  const h = Math.max(2, Math.ceil(s.h));
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  const mid = Math.max(1, Math.floor(h / 2));
  ctx.fillStyle = tier.core;
  ctx.fillRect(x, y, w, mid);
  ctx.fillStyle = tier.tip;
  ctx.fillRect(x, y + mid, w, h - mid);
  ctx.fillStyle = tier.rim;
  for (let i = 0; i < w; i += 2) {
    ctx.fillRect(x + i, y + h - 2, 1, 2);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 1, y + 1, 2 + Math.floor(t * 3), 2);
  const trail = 3 + Math.floor(t * 5);
  const back = s.vx >= 0 ? -1 : 1;
  for (let k = 1; k <= trail; k += 1) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 - k * 0.08})`;
    ctx.fillRect(x - back * k * 2, y + Math.floor(h / 3), 2, 2);
  }
  ctx.restore();
}

function render() {
  applyTouchInput();
  refreshTouchOverlayVisibility();
  updateLocalGame();
  beginPixelGameFrame();
  drawArenaBackground();
  drawPlatforms();
  drawPixelGroundStrip();
  localState.projectiles.forEach(drawProjectile);
  localState.players.forEach(drawFireBreath);
  localState.players.forEach(drawPlayer);
  if (overlayEl.classList.contains("hidden")) {
    localState.players.forEach((p, i) => drawChargeOrb(p, i));
  }
  endPixelGameFrame();
  drawHudOnView();
  requestAnimationFrame(render);
}

function applyTouchInput() {
  if (!touchState.enabled || remapState.active || localState.buffPickActive || !overlayEl.classList.contains("hidden")) {
    touchState.prevLeft = touchState.left;
    touchState.prevRight = touchState.right;
    touchState.prevJumpFromStick = touchState.jumpFromStick;
    touchState.prevAttack = touchState.attack;
    touchState.prevOrb = touchState.orb;
    touchState.prevFire = touchState.fire;
    return;
  }
  const jumpNow = touchState.jumpFromStick;
  const jumpPrev = touchState.prevJumpFromStick;

  if (mode !== "online") {
    const b0 = keyBindings.p0;
    if (jumpNow && !jumpPrev) {
      tryJump(0, b0.jump);
    }
    if (touchState.attack && !touchState.prevAttack) {
      doMelee(0);
    }
    if (touchState.orb && !touchState.prevOrb && !visualState[0].charging) {
      if (Date.now() >= roundLockUntil) {
        const p0 = localState.players[0];
        const a0 = p0.orbAmmo != null ? p0.orbAmmo : ORB_AMMO_PER_ROUND;
        if (p0.infiniteAmmo || a0 > 0) {
          p0.chargeStartAt = Date.now();
          visualState[0].charging = true;
        }
      }
    }
    if (!touchState.orb && touchState.prevOrb) {
      const wasCharging = visualState[0].charging;
      const heldMs = Date.now() - localState.players[0].chargeStartAt;
      visualState[0].charging = false;
      if (wasCharging && heldMs >= CHARGE_THRESHOLD_MS) {
        fireProjectile(0);
      }
    }
    if (touchState.fire && !touchState.prevFire) startFireBreathLocal(0);
    if (!touchState.fire && touchState.prevFire) stopFireBreathLocal(0);
  } else if (socket && roomId) {
    const controls = onlineControlsFromInput();
    if (touchState.left !== touchState.prevLeft || touchState.right !== touchState.prevRight) {
      socket.emit("match:input", { controls });
    }
    if (touchState.attack && !touchState.prevAttack && !onlineIntermissionActive()) {
      triggerSwing(playerIndex);
      socket.emit("match:input", { action: "melee", controls });
    }
    if (touchState.orb && !touchState.prevOrb && !onlineIntermissionActive()) {
      visualState[playerIndex].charging = true;
      visualState[playerIndex].chargeKeyDownAt = Date.now();
      socket.emit("match:input", { action: "chargeStart", controls });
    }
    if (!touchState.orb && touchState.prevOrb && !onlineIntermissionActive()) {
      visualState[playerIndex].charging = false;
      triggerSwing(playerIndex);
      socket.emit("match:input", { action: "chargeRelease", controls });
    }
    if (touchState.fire && !touchState.prevFire && !onlineIntermissionActive()) {
      socket.emit("match:input", { action: "fireStart", controls });
    }
    if (!touchState.fire && touchState.prevFire) {
      socket.emit("match:input", { action: "fireEnd", controls });
    }
  }

  touchState.prevLeft = touchState.left;
  touchState.prevRight = touchState.right;
  touchState.prevJumpFromStick = touchState.jumpFromStick;
  touchState.prevAttack = touchState.attack;
  touchState.prevOrb = touchState.orb;
  touchState.prevFire = touchState.fire;
}

/** Horizontal stepped sky (no smooth gradients) for pixel look. */
function fillPixelSkyBands(y0, y1, palette) {
  const bands = palette.length;
  const span = y1 - y0;
  for (let y = y0; y < y1; y += 1) {
    const t = (y - y0) / span;
    const i = Math.min(bands - 1, Math.floor(t * bands));
    ctx.fillStyle = palette[i];
    ctx.fillRect(0, y, VIEW_W, 1);
  }
}

function drawPixelFarSilhouettes(farColor, nearColor) {
  for (let i = 0; i < 9; i += 1) {
    const x = i * 130 - 20;
    const hh = 72 + ((i * 41) % 62);
    ctx.fillStyle = i % 2 === 0 ? farColor : nearColor;
    ctx.fillRect(Math.floor(x), FLOOR_Y - hh, 90, hh);
    ctx.strokeStyle = "#0a0a12";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.floor(x) + 1, FLOOR_Y - hh + 1, 88, hh - 2);
  }
}

function drawArenaBackground() {
  ctx.imageSmoothingEnabled = false;
  const level = currentLevel();
  const theme = level.bg;
  const w = VIEW_W;

  if (theme === "sunny") {
    fillPixelSkyBands(0, FLOOR_Y, ["#5ab8f0", "#7ecfff", "#b8ecff", "#ffe6a8", "#ffc860"]);
    const sunX = Math.floor(w * 0.76);
    const sunY = 88;
    for (let dy = -28; dy <= 28; dy += 1) {
      for (let dx = -28; dx <= 28; dx += 1) {
        if (dx * dx + dy * dy <= 28 * 28) {
          ctx.fillStyle = dx * dx + dy * dy < 18 * 18 ? "#fff8dc" : "#ffe8a0";
          ctx.fillRect(sunX + dx, sunY + dy, 1, 1);
        }
      }
    }
    for (let i = 0; i < 5; i += 1) {
      const cx = Math.floor(((i * 247 + 30) % (w + 80)) - 30);
      const cy = 48 + (i * 23) % 40;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 28, cy - 8, 56, 16);
      ctx.fillRect(cx + 6, cy - 6, 48, 14);
      ctx.fillRect(cx - 40, cy - 4, 40, 12);
    }
    drawPixelFarSilhouettes("#5a8068", "#4a7058");
  } else if (theme === "dusk") {
    fillPixelSkyBands(0, FLOOR_Y, ["#4a3d6e", "#6b3d5a", "#a85a4a", "#3a3048"]);
    drawPixelFarSilhouettes("#3a3058", "#2a2040");
  } else if (theme === "storm") {
    fillPixelSkyBands(0, FLOOR_Y, ["#3d4f60", "#2f3c4a", "#1e2834", "#141c24"]);
    ctx.strokeStyle = "#8aa0b8";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i += 1) {
      const x0 = (i * 97) % w;
      const y0 = 40 + (i * 17) % 120;
      const x1 = (i * 97 + 40) % w;
      const y1 = 90 + (i * 13) % 100;
      for (let t = 0; t <= 24; t += 1) {
        const px = Math.floor(x0 + ((x1 - x0) * t) / 24);
        const py = Math.floor(y0 + ((y1 - y0) * t) / 24);
        ctx.fillStyle = "#a8c0d8";
        ctx.fillRect(px, py, 2, 2);
      }
    }
    drawPixelFarSilhouettes("#3a4858", "#2a3848");
  } else if (theme === "aurora") {
    fillPixelSkyBands(0, FLOOR_Y, ["#0f2035", "#1a4d4a", "#2a6a62", "#2a3060", "#121828"]);
    ctx.fillStyle = "#4ad0a8";
    for (let j = 0; j < 3; j += 1) {
      for (let x = 0; x < w; x += 6) {
        const wave = Math.floor(18 + 10 * Math.sin(x * 0.02 + j * 1.7) + j * 22);
        ctx.fillRect(x, 90 + wave, 4, 4);
      }
    }
    drawPixelFarSilhouettes("#3a4a70", "#2a3858");
  } else {
    fillPixelSkyBands(0, FLOOR_Y, ["#1d2a4f", "#182440", "#15203b", "#121a30", "#101827"]);
    drawPixelFarSilhouettes("#3a4880", "#2a3868");
  }

  ctx.fillStyle = "rgba(90, 110, 160, 0.35)";
  ctx.fillRect(0, FLOOR_Y - 28, w, 32);
}

function drawPixelGroundStrip() {
  const g = currentLevel().ground;
  const y0 = FLOOR_Y;
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, y0, VIEW_W, VIEW_H - y0);
  for (let x = 0; x < VIEW_W; x += 16) {
    const alt = (x / 16) % 2 === 0;
    ctx.fillStyle = alt ? g : shadeHex(g, 0.88);
    ctx.fillRect(x, y0, 16, VIEW_H - y0);
  }
  ctx.fillStyle = "#1a1a22";
  for (let x = 0; x < VIEW_W; x += 8) {
    ctx.fillRect(x, y0, 8, 4);
  }
}

function shadeHex(hex, mul) {
  const h = hex.replace("#", "");
  const r = Math.min(255, Math.floor(parseInt(h.slice(0, 2), 16) * mul));
  const g = Math.min(255, Math.floor(parseInt(h.slice(2, 4), 16) * mul));
  const b = Math.min(255, Math.floor(parseInt(h.slice(4, 6), 16) * mul));
  return `rgb(${r},${g},${b})`;
}

function drawPlatforms() {
  ctx.imageSmoothingEnabled = false;
  currentPlatforms().forEach((plat) => {
    const x = Math.floor(plat.x);
    const y = Math.floor(plat.y);
    const w = Math.ceil(plat.w);
    const h = Math.ceil(plat.h);
    for (let bx = x; bx < x + w; bx += 8) {
      for (let by = y; by < y + h; by += 6) {
        const stripe = ((bx >> 3) + (by >> 2)) % 2 === 0;
        ctx.fillStyle = stripe ? "#4a6ab8" : "#3a5590";
        ctx.fillRect(bx, by, Math.min(8, x + w - bx), Math.min(6, y + h - by));
      }
    }
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = "#6a8ad0";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 3, w - 8, h - 6);
  });
}

function fireBreathRectForPlayer(p) {
  const baseY = p.y !== undefined && p.y !== null ? p.y : FLOOR_Y - PLAYER_BODY_H;
  const fac = p.facing || 1;
  const x = fac > 0 ? p.x + PLAYER_BODY_W : p.x - FIRE_BREATH_RANGE;
  return {
    x,
    y: baseY + Math.floor(PLAYER_BODY_H * 0.32),
    w: FIRE_BREATH_RANGE,
    h: FIRE_BREATH_H,
  };
}

function playerInEnemyFire(idx) {
  const p = localState.players[idx];
  const enemy = localState.players[1 - idx];
  if (!p || !enemy?.fireBreathing) return false;
  return rectsOverlap(fireBreathRectForPlayer(enemy), {
    x: p.x,
    y: getPlayerBaseY(p),
    w: PLAYER_BODY_W,
    h: PLAYER_BODY_H,
  });
}

function drawFireBreath(p) {
  if (!p.fireBreathing) return;
  const r = fireBreathRectForPlayer(p);
  const held = Math.max(0, Date.now() - (p.fireStartAt || Date.now()));
  const pulse = 0.72 + 0.16 * Math.sin(performance.now() * 0.03);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = `rgba(255, 86, 22, ${pulse})`;
  ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.ceil(r.w), Math.ceil(r.h));
  ctx.fillStyle = "rgba(255, 210, 74, 0.85)";
  ctx.fillRect(Math.floor(r.x), Math.floor(r.y + 4), Math.ceil(r.w * 0.84), Math.max(4, Math.floor(r.h * 0.38)));
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillRect(Math.floor(r.x), Math.floor(r.y + 7), Math.ceil(r.w * 0.52), 3);
  ctx.fillStyle = "rgba(130, 20, 10, 0.5)";
  const tip = p.facing >= 0 ? r.x + r.w - 6 : r.x + 2;
  for (let i = 0; i < 5; i += 1) {
    const yy = r.y + 2 + ((i * 5 + Math.floor(held / 80)) % r.h);
    ctx.fillRect(Math.floor(tip), Math.floor(yy), 5, 2);
  }
  ctx.restore();
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function getPlayerBaseY(p) {
  return p.y !== undefined && p.y !== null ? p.y : FLOOR_Y - PLAYER_BODY_H;
}

/**
 * World-space AABB of the visible sword blade for this frame (must match `drawMeleeSwingIndicator`).
 * Only valid during the same "active" time window as the attack arc. Returns null if no hit window.
 */
function getMeleeSwordBladeAabb(attacker, v, tNow) {
  if (tNow < v.attackStartAt || tNow >= v.attackUntil) return null;
  const baseY = getPlayerBaseY(attacker);
  const dur = v.swingDurationMs != null ? v.swingDurationMs : SWING_DURATION_MS;
  const swingT = (tNow - v.attackStartAt) / Math.max(1, dur);
  if (swingT < 0.12 || swingT > 0.62) return null;
  const fac = attacker.facing || 1;
  const hx = Math.floor(attacker.x + PLAYER_BODY_W * 0.5);
  if (!meleeSwordBlit) {
    const mrs = attacker.meleeRangeScale != null ? attacker.meleeRangeScale : 1;
    const bladeL = 28 * mrs;
    const ph = 12;
    const y0 = baseY + 12;
    if (fac > 0) {
      return { x: hx + 2, y: y0, w: bladeL, h: ph };
    }
    return { x: hx - 2 - bladeL, y: y0, w: bladeL, h: ph };
  }
  const bl = meleeSwordBlit;
  const s = Math.max(1.85, 17 / bl.ch) / 13.2;
  const duel = attacker.meleeRangeScale != null && attacker.meleeRangeScale >= 2 ? 2 : 1;
  const w = bl.cw * s * duel;
  const h = bl.ch * s * duel;
  const handX = hx + fac * 8;
  const handY = Math.floor(baseY + 20);
  const ang = (0.52 - swingT) * Math.PI * 0.55;
  const c = Math.cos(ang);
  const sn = Math.sin(ang);
  function worldFromBlade(lx, ly) {
    const sx = -fac * lx;
    const sy = ly;
    return {
      x: handX + sx * c - sy * sn,
      y: handY + sx * sn + sy * c,
    };
  }
  const p0 = worldFromBlade(-w, -h * 0.5);
  const p1 = worldFromBlade(0, -h * 0.5);
  const p2 = worldFromBlade(0, h * 0.5);
  const p3 = worldFromBlade(-w, h * 0.5);
  const xs = [p0.x, p1.x, p2.x, p3.x];
  const ys = [p0.y, p1.y, p2.y, p3.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: Math.max(0.1, maxX - minX), h: Math.max(0.1, maxY - minY) };
}

/** Once per local tick: melee hits only if blade AABB overlaps defender body. */
function processMeleeSwordHits() {
  const tNow = Date.now();
  for (let ai = 0; ai < 2; ai += 1) {
    const vA = visualState[ai];
    if (vA.meleeDealt) continue;
    if (tNow >= vA.attackUntil || tNow < vA.attackStartAt) continue;
    const at = localState.players[ai];
    const dIdx = 1 - ai;
    const def = localState.players[dIdx];
    if ((def.x - at.x) * (at.facing || 1) <= 0) continue;
    const blade = getMeleeSwordBladeAabb(at, vA, tNow);
    if (!blade) continue;
    const defRect = { x: def.x, y: getPlayerBaseY(def), w: PLAYER_BODY_W, h: PLAYER_BODY_H };
    if (rectsOverlap(blade, defRect)) {
      vA.meleeDealt = true;
      const mult = at.damageMult != null ? at.damageMult : 1;
      let dmg = Math.round(10 * mult);
      if (ai === 0 && cheatBlueMeleeBurstHits > 0) {
        dmg = CHEAT_BLUE_MELEE_BURST_DAMAGE;
        cheatBlueMeleeBurstHits -= 1;
      }
      def.health = clamp(def.health - dmg, 0, playerMaxHp(def));
      def.vx = (def.x >= at.x ? 1 : -1) * MELEE_KNOCKBACK_VX;
    }
  }
}

function processFireBreathDamage() {
  const now = Date.now();
  for (let ai = 0; ai < 2; ai += 1) {
    const at = localState.players[ai];
    if (!at?.fireBreathing) continue;
    const def = localState.players[1 - ai];
    if (!def) continue;
    if (!at.fireNextDamageAt || at.fireNextDamageAt < now - FIRE_BREATH_TICK_MS * 4) {
      at.fireNextDamageAt = now;
    }
    const flame = fireBreathRectForPlayer(at);
    const defRect = { x: def.x, y: getPlayerBaseY(def), w: PLAYER_BODY_W, h: PLAYER_BODY_H };
    while (at.fireNextDamageAt <= now) {
      if (rectsOverlap(flame, defRect)) {
        const heldMs = Math.max(0, at.fireNextDamageAt - (at.fireStartAt || at.fireNextDamageAt));
        const dmg = FIRE_BREATH_BASE_DAMAGE + Math.floor(heldMs / 1000);
        def.health = clamp(def.health - dmg, 0, playerMaxHp(def));
      }
      at.fireNextDamageAt += FIRE_BREATH_TICK_MS;
    }
  }
}

function tryJump(idx, code) {
  if (visualState[idx].charging) return;
  const p = localState.players[idx];
  const now = performance.now();
  const prev = keyTimes.get(code) || 0;
  keyTimes.set(code, now);
  const boosted = now - prev < 260;
  if (p.infiniteJumps) {
    p.vy = JUMP_VELOCITY * (boosted ? 1.12 : 1);
    p.onGround = false;
    p.jumpsUsed = Math.min(p.jumpsUsed + 1, 9);
    return;
  }
  if (p.onGround || p.jumpsUsed < 2) {
    p.vy = JUMP_VELOCITY * (boosted ? 1.12 : 1);
    p.onGround = false;
    p.jumpsUsed += 1;
  }
}

function doMelee(attackerIdx) {
  const attacker = localState.players[attackerIdx];
  const dur = Math.round(SWING_DURATION_MS * (attacker.meleeSwingScale != null ? attacker.meleeSwingScale : 1));
  const t0 = Date.now();
  visualState[attackerIdx].attackStartAt = t0;
  visualState[attackerIdx].attackUntil = t0 + dur;
  visualState[attackerIdx].swingDurationMs = dur;
  visualState[attackerIdx].meleeDealt = false;
}

function triggerSwing(idx) {
  const p = localState.players[idx];
  const dur = Math.round(SWING_DURATION_MS * (p.meleeSwingScale != null ? p.meleeSwingScale : 1));
  const t0 = Date.now();
  visualState[idx].attackStartAt = t0;
  visualState[idx].attackUntil = t0 + dur;
  visualState[idx].swingDurationMs = dur;
  visualState[idx].meleeDealt = false;
}

function computeChargedShot(heldMs) {
  const effective = clamp(heldMs - CHARGE_THRESHOLD_MS, 0, CHARGE_SCALE_MS);
  const ratio = CHARGE_SCALE_MS > 0 ? effective / CHARGE_SCALE_MS : 0;
  const curved = Math.pow(ratio, 0.88);
  return {
    damage: Math.round(ORB_DAMAGE_MIN + ORB_DAMAGE_RANGE * curved),
    w: 9 + Math.round(20 * curved),
    h: 4 + Math.round(11 * curved),
    speed: 9 + 4 * curved,
  };
}

/**
 * @param {number} attackerIdx
 * @param {number | { damage: number, w?: number, h?: number, speed?: number } | null} override - null = use current charge hold
 */
function fireProjectile(attackerIdx, override = null) {
  if (Date.now() < roundLockUntil) return;
  const attacker = localState.players[attackerIdx];
  const orbCost = attacker.tripleShot ? 3 : 1;
  const ammo = attacker.orbAmmo != null ? attacker.orbAmmo : ORB_AMMO_PER_ROUND;
  if (!attacker.infiniteAmmo && ammo < orbCost) return;
  let damage;
  let w;
  let h;
  let speed;
  if (override != null && typeof override === "object") {
    damage = override.damage;
    w = override.w ?? 14;
    h = override.h ?? 6;
    speed = override.speed ?? 9;
  } else if (typeof override === "number") {
    damage = override;
    w = 14;
    h = 6;
    speed = 9;
  } else {
    const heldMs = attacker.instantMaxCharge
      ? CHARGE_THRESHOLD_MS + CHARGE_SCALE_MS
      : clamp(Date.now() - attacker.chargeStartAt, 0, MAX_CHARGE_MS);
    const s = computeChargedShot(heldMs);
    damage = s.damage;
    w = s.w;
    h = s.h;
    speed = s.speed;
  }
  const mult = attacker.damageMult != null ? attacker.damageMult : 1;
  const dmg = Math.round(damage * mult);
  const cy = attacker.y + Math.floor(PLAYER_BODY_H * 0.42) + (6 - h) / 2;
  const baseX = attacker.x + Math.floor(PLAYER_BODY_W * 0.62) + 2;
  const target = attackerIdx === 0 ? 1 : 0;
  const pushShot = (vx, vy) => {
    localState.projectiles.push({
      x: baseX,
      y: cy,
      w,
      h,
      vx,
      vy: vy ?? 0,
      target,
      damage: dmg,
    });
  };
  if (attacker.tripleShot) {
    const fac = attacker.facing;
    const baseAng = fac === 1 ? 0 : Math.PI;
    const spread = 0.17;
    [-spread, 0, spread].forEach((da) => {
      const ang = baseAng + da * fac;
      pushShot(speed * Math.cos(ang), speed * Math.sin(ang));
    });
  } else {
    pushShot(attacker.facing * speed, 0);
  }
  if (!attacker.infiniteAmmo) {
    attacker.orbAmmo = ammo - orbCost;
  } else {
    attacker.orbAmmo = ORB_AMMO_PER_ROUND;
  }
  attacker.lastShotAt = Date.now();
  visualState[attackerIdx].shootFlashUntil = Date.now() + 120;
}

function resetInputState() {
  keys.clear();
  touchState.left = false;
  touchState.right = false;
  touchState.jumpFromStick = false;
  touchState.attack = false;
  touchState.orb = false;
  touchState.fire = false;
  touchState.prevLeft = false;
  touchState.prevRight = false;
  touchState.prevJumpFromStick = false;
  touchState.prevAttack = false;
  touchState.prevOrb = false;
  touchState.prevFire = false;
  visualState[0].charging = false;
  visualState[1].charging = false;
}

function clearCombatBuffsFromPlayers() {
  for (const p of localState.players) {
    delete p.maxHealth;
    delete p.tripleShot;
    delete p.damageMult;
    delete p.infiniteJumps;
    delete p.infiniteAmmo;
    delete p.instantMaxCharge;
    delete p.meleeRangeScale;
    delete p.meleeSwingScale;
    delete p.fireBreath;
    delete p.fireBreathing;
    delete p.fireStartAt;
    delete p.fireNextDamageAt;
  }
}

function healPlayerToCap(p) {
  p.health = playerMaxHp(p);
}

function isTypingInFormField() {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

function keyCodeToCheatDigit(code) {
  if (typeof code !== "string") return null;
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  if (code.startsWith("Numpad") && code.length === 7) {
    const d = code.slice(6);
    if (d >= "0" && d <= "9") return d;
  }
  return null;
}

function applyRedThousandHpCheat() {
  cheatRedThousandHp = true;
  if (mode !== "online" && localState.players[1]) {
    const p = localState.players[1];
    p.maxHealth = CHEAT_RED_MAX_HP;
    healPlayerToCap(p);
  }
  showBanner("Red — 1000 HP", 2000);
}

function applyBlueMeleeBurstCheat() {
  if (mode === "online") {
    if (socket && roomId) socket.emit("cheat:blue_melee_burst", { hits: CHEAT_BLUE_MELEE_BURST_HITS });
    else cheatBlueMeleeBurstPendingOnlineHits += CHEAT_BLUE_MELEE_BURST_HITS;
  } else {
    cheatBlueMeleeBurstHits += CHEAT_BLUE_MELEE_BURST_HITS;
  }
  showBanner("Blue melee: 1000 dmg for next 5 hits", 2200);
}

/**
 * Call from global keydown (before game / buff handlers). Digits only extend the buffer.
 */
function tryRedThousandHpCheatFromKeydown(e) {
  if (remapState.active) return;
  if (e.repeat) return;
  if (isTypingInFormField()) return;
  const d = keyCodeToCheatDigit(e.code);
  if (!d) return;
  cheatRedDigitBuffer = (cheatRedDigitBuffer + d).slice(-4);
  if (!cheatRedThousandHp && cheatRedDigitBuffer === "2017") {
    cheatRedDigitBuffer = "";
    applyRedThousandHpCheat();
    return;
  }
  if (cheatRedDigitBuffer === "6767") {
    cheatRedDigitBuffer = "";
    applyBlueMeleeBurstCheat();
  }
}

function syncRedThousandHpAfterLocalReset() {
  if (!cheatRedThousandHp || mode === "online" || !localState.players[1]) return;
  const p = localState.players[1];
  p.maxHealth = CHEAT_RED_MAX_HP;
  healPlayerToCap(p);
}

let fireBindState = { active: false, playerIdx: 0, online: false };

function startFireBreathKeyBind(playerIdx, online = false) {
  if (touchState.enabled) return;
  if (fireBindState.active) return;
  fireBindState = { active: true, playerIdx, online };
  showBanner("Press a key for Fire Breath", 5000);
  window.addEventListener("keydown", onFireBreathBindKeydown, true);
}

function onFireBreathBindKeydown(e) {
  if (!fireBindState.active) return;
  e.preventDefault();
  e.stopPropagation();
  const code = e.code;
  if (!code || code === "Escape") return;
  if (fireBindState.online) {
    keyBindings.online.fire = code;
  } else if (fireBindState.playerIdx === 0) {
    keyBindings.p0.fire = code;
  } else {
    keyBindings.p1.fire = code;
  }
  saveKeyBindings();
  fireBindState.active = false;
  window.removeEventListener("keydown", onFireBreathBindKeydown, true);
  showBanner(`Fire Breath mapped to ${formatKeyLabel(code)}`, 2200);
}

function startFireBreathLocal(idx) {
  const p = localState.players[idx];
  if (!p?.fireBreath || p.fireBreathing || Date.now() < roundLockUntil) return;
  p.fireBreathing = true;
  p.fireStartAt = Date.now();
  p.fireNextDamageAt = Date.now();
  p.vx = 0;
}

function stopFireBreathLocal(idx) {
  const p = localState.players[idx];
  if (!p) return;
  p.fireBreathing = false;
}

let buffAutoPickTimer = null;
let buffPickGateTimer = null;

function hideBuffPickOverlay() {
  const wrap = document.getElementById("buffPickOverlay");
  if (wrap) wrap.classList.add("hidden");
  const gate = document.getElementById("buffPickGateBlock");
  if (gate) gate.classList.add("hidden");
  if (buffAutoPickTimer != null) {
    clearTimeout(buffAutoPickTimer);
    buffAutoPickTimer = null;
  }
  if (buffPickGateTimer != null) {
    clearTimeout(buffPickGateTimer);
    buffPickGateTimer = null;
  }
  localState.buffPickInputUnlocked = false;
}

function applyBuffChoice(buffId) {
  if (!localState.buffPickActive || !localState.buffPickInputUnlocked) return;
  if (!BUFF_DEFS[buffId]) return;
  if (mode === "online") {
    if (socket && roomId) socket.emit("buff:pick", { buffId });
    if (buffId === "fireBreath") startFireBreathKeyBind(playerIndex, true);
    localState.buffPickActive = false;
    hideBuffPickOverlay();
    return;
  }
  const loser = localState.buffPickLoser;
  const win = loser === 0 ? 1 : 0;
  const L = localState.players[loser];
  const W = localState.players[win];
  healPlayerToCap(W);
  if (buffId === "triple") {
    L.tripleShot = true;
  } else if (buffId === "tank") {
    const prevMax = playerMaxHp(L);
    L.maxHealth = prevMax + 30;
  } else if (buffId === "power") {
    const cur = L.damageMult != null && L.damageMult > 0 ? L.damageMult : 1;
    L.damageMult = cur * POWER_BUFF_DAMAGE_MULT;
  } else if (buffId === "infiniteJumps") {
    L.infiniteJumps = true;
  } else if (buffId === "infiniteAmmo") {
    L.infiniteAmmo = true;
    L.orbAmmo = ORB_AMMO_PER_ROUND;
  } else if (buffId === "instantMaxCharge") {
    L.instantMaxCharge = true;
  } else if (buffId === "meleeLong") {
    L.meleeRangeScale = (L.meleeRangeScale != null ? L.meleeRangeScale : 1) * 2;
    L.meleeSwingScale = (L.meleeSwingScale != null ? L.meleeSwingScale : 1) * 2;
  } else if (buffId === "fireBreath") {
    L.fireBreath = true;
    startFireBreathKeyBind(loser, false);
  }
  healPlayerToCap(L);
  localState.buffPickActive = false;
  hideBuffPickOverlay();
  startLocalRoundCountdown();
  localState.players[0].chargeStartAt = 0;
  localState.players[1].chargeStartAt = 0;
  visualState[0].charging = false;
  visualState[1].charging = false;
}

function showBuffPickOverlay(loserIdx, forcedTriplet = null) {
  const wrap = document.getElementById("buffPickOverlay");
  if (!wrap) return;
  const picked = forcedTriplet
    ? { triplet: forcedTriplet, key: [...forcedTriplet].sort().join("|") }
    : pickRandomBuffTriplet();
  const { triplet, key } = picked;
  localState.buffPickOptions = triplet;
  localState.buffLastOfferedKey = key;
  const btnWrap = document.getElementById("buffPickButtons");
  if (btnWrap) {
    btnWrap.innerHTML = "";
    const keyRows = [
      { k1: "A", k2: "←" },
      { k1: "W", k2: "↑" },
      { k1: "D", k2: "→" },
    ];
    for (let i = 0; i < 3; i += 1) {
      const id = triplet[i];
      const d = BUFF_DEFS[id];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "buff-card buff-btn";
      b.setAttribute("data-buff", id);
      b.innerHTML = `<span class="buff-card-face">
        <span class="buff-name">${d.name}</span>
        <span class="buff-desc">${d.desc}</span>
        <span class="buff-keys" aria-label="Shortcuts"><kbd>${keyRows[i].k1}</kbd><kbd>${keyRows[i].k2}</kbd></span>
      </span>`;
      btnWrap.appendChild(b);
    }
  }
  const title = document.getElementById("buffPickTitle");
  const sub = document.getElementById("buffPickSub");
  const gate = document.getElementById("buffPickGateBlock");
  const name = loserIdx === 0 ? "Blue" : "Red";
  if (title) title.textContent = `${name} lost — choose a comeback buff`;
  if (sub) {
    sub.textContent =
      "Wait 2 seconds without clicking — then pick a card or use A/← · W/↑ · D/→.";
  }
  localState.buffPickInputUnlocked = false;
  if (gate) gate.classList.remove("hidden");
  wrap.classList.remove("hidden");
  if (buffPickGateTimer != null) {
    clearTimeout(buffPickGateTimer);
    buffPickGateTimer = null;
  }
  buffPickGateTimer = setTimeout(() => {
    buffPickGateTimer = null;
    localState.buffPickInputUnlocked = true;
    if (gate) gate.classList.add("hidden");
    if (sub && localState.buffPickActive) {
      sub.textContent =
        "Buff lasts the rest of the match. Click a card, or A/← (buff 1), W/↑ (buff 2), D/→ (buff 3).";
    }
    const firstCard = wrap.querySelector(".buff-card");
    if (firstCard && typeof firstCard.focus === "function") {
      requestAnimationFrame(() => firstCard.focus());
    }
  }, BUFF_PICK_GATE_MS);
  if (buffAutoPickTimer != null) {
    clearTimeout(buffAutoPickTimer);
    buffAutoPickTimer = null;
  }
  if (mode === "single" && loserIdx === 1) {
    buffAutoPickTimer = setTimeout(() => {
      buffAutoPickTimer = null;
      const opts = localState.buffPickOptions;
      if (opts && opts.length) applyBuffChoice(opts[Math.floor(Math.random() * opts.length)]);
    }, BUFF_PICK_GATE_MS + 450);
  }
}

function updateLocalGame() {
  if (mode === "online") return;
  if (!overlayEl.classList.contains("hidden")) return;
  if (localState.buffPickActive) return;
  if (Date.now() < roundLockUntil) return;

  // Guard against missed keyup when focus changes.
  const now = Date.now();
  for (const p of localState.players) {
    if (p.infiniteAmmo) continue;
    const ammo = p.orbAmmo != null ? p.orbAmmo : ORB_AMMO_PER_ROUND;
    if (ammo >= ORB_AMMO_PER_ROUND) continue;
    const lastShotAt = p.lastShotAt || 0;
    if (now - lastShotAt >= AMMO_RELOAD_IDLE_MS) {
      p.orbAmmo = Math.min(ORB_AMMO_PER_ROUND, ammo + AMMO_RELOAD_AMOUNT);
      p.lastShotAt = now;
    }
  }
  const b0 = keyBindings.p0;
  const b1 = keyBindings.p1;
  if (!keys.has(p0FireKey()) && !touchState.orb) visualState[0].charging = false;
  if (!keys.has(p1FireKey())) visualState[1].charging = false;

  const p1 = localState.players[0];
  const p2 = localState.players[1];
  if (p1.fireBreathing) p1.vx = 0;
  if (p2.fireBreathing) p2.vx = 0;
  const p1Left = !p1.fireBreathing && (keys.has(b0.left) || touchState.left);
  const p1Right = !p1.fireBreathing && (keys.has(b0.right) || touchState.right);
  const p2Left = mode === "multi" && !p2.fireBreathing ? keys.has(b1.left) : false;
  const p2Right = mode === "multi" && !p2.fireBreathing ? keys.has(b1.right) : false;
  const p1MoveSpeed = MOVE_SPEED * (playerInEnemyFire(0) ? FIRE_BREATH_SLOW_MULT : 1);
  const p2MoveSpeed = MOVE_SPEED * (playerInEnemyFire(1) ? FIRE_BREATH_SLOW_MULT : 1);

  const target1 = p1Left === p1Right ? 0 : p1Left ? -p1MoveSpeed : p1MoveSpeed;
  const ax1 = Math.abs(target1) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL;
  p1.vx += (target1 - p1.vx) * ax1;
  if (Math.abs(target1) < 0.01 && Math.abs(p1.vx) < MOVE_VX_SNAP) p1.vx = 0;
  if (Math.abs(target1) > 0.01) p1.facing = target1 > 0 ? 1 : -1;
  else if (Math.abs(p1.vx) > 0.18) p1.facing = p1.vx > 0 ? 1 : -1;

  if (mode === "multi") {
    const target2 = p2Left === p2Right ? 0 : p2Left ? -p2MoveSpeed : p2MoveSpeed;
    const ax2 = Math.abs(target2) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL;
    p2.vx += (target2 - p2.vx) * ax2;
    if (Math.abs(target2) < 0.01 && Math.abs(p2.vx) < MOVE_VX_SNAP) p2.vx = 0;
    if (Math.abs(target2) > 0.01) p2.facing = target2 > 0 ? 1 : -1;
    else if (Math.abs(p2.vx) > 0.18) p2.facing = p2.vx > 0 ? 1 : -1;
  } else {
    const d = p1.x - p2.x;
    const target2 = Math.abs(d) > 60 ? (d > 0 ? MOVE_SPEED * 0.75 : -MOVE_SPEED * 0.75) : 0;
    const ax2b = Math.abs(target2) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL * 0.88;
    p2.vx += (target2 - p2.vx) * ax2b;
    if (Math.abs(target2) < 0.01 && Math.abs(p2.vx) < MOVE_VX_SNAP) p2.vx = 0;
    if (Math.abs(target2) > 0.01) p2.facing = target2 > 0 ? 1 : -1;
    else if (Math.abs(p2.vx) > 0.14) p2.facing = p2.vx > 0 ? 1 : -1;
    if (Math.abs(d) < MELEE_RANGE + 12 && Math.random() < 0.02) doMelee(1);
    if (Math.abs(d) > 140 && Math.random() < 0.01) {
      const p2c = localState.players[1];
      const cost = p2c.tripleShot ? 3 : 1;
      const am = p2c.orbAmmo != null ? p2c.orbAmmo : ORB_AMMO_PER_ROUND;
      if (am >= cost || p2c.infiniteAmmo) {
        p2c.chargeStartAt = Date.now() - CHARGE_THRESHOLD_MS - CHARGE_SCALE_MS * 0.35;
        fireProjectile(1);
      }
    }
    if (p2.onGround && Math.random() < 0.005) {
      p2.vy = JUMP_VELOCITY;
      p2.onGround = false;
      p2.jumpsUsed = 1;
    }
  }

  for (let pi = 0; pi < localState.players.length; pi += 1) {
    const p = localState.players[pi];
    const previousBottom = p.y + PLAYER_BODY_H;
    const slowFall = visualState[pi].charging && !p.onGround;
    p.vy += GRAVITY * (slowFall ? CHARGE_AIR_GRAVITY_MULT : 1);
    p.x = clamp(p.x + p.vx, 0, VIEW_W - PLAYER_BODY_W);
    p.y += p.vy;
    const bottom = p.y + PLAYER_BODY_H;
    let landed = false;

    if (p.vy >= 0) {
      const plats = [...currentPlatforms()].sort((a, b) => a.y - b.y);
      for (const plat of plats) {
        const crossed = previousBottom <= plat.y && bottom >= plat.y;
        const insideX = p.x + PLAYER_BODY_W > plat.x && p.x < plat.x + plat.w;
        if (crossed && insideX) {
          p.y = plat.y - PLAYER_BODY_H;
          p.vy = 0;
          p.onGround = true;
          p.jumpsUsed = 0;
          landed = true;
          break;
        }
      }
    }

    if (!landed && bottom >= FLOOR_Y) {
      p.y = FLOOR_Y - PLAYER_BODY_H;
      p.vy = 0;
      p.onGround = true;
      p.jumpsUsed = 0;
    } else if (!landed) {
      p.onGround = false;
    }
  }

  processMeleeSwordHits();
  processFireBreathDamage();

  localState.projectiles.forEach((shot) => {
    shot.x += shot.vx;
    shot.y += shot.vy ?? 0;
    const shotRect = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
    for (const plat of currentPlatforms()) {
      if (rectsOverlap(shotRect, plat)) {
        shot.dead = true;
        break;
      }
    }
    if (shot.dead) return;
    const target = localState.players[shot.target];
    const hit = rectsOverlap(shotRect, {
      x: target.x,
      y: target.y,
      w: PLAYER_BODY_W,
      h: PLAYER_BODY_H,
    });
    if (hit) {
      target.health = clamp(target.health - shot.damage, 0, playerMaxHp(target));
      shot.dead = true;
    }
    if (shot.x < -50 || shot.x > VIEW_W + 50 || shot.y < -80 || shot.y > VIEW_H + 40) {
      shot.dead = true;
    }
  });
  localState.projectiles = localState.projectiles.filter((s) => !s.dead);

  if (p1.health <= 0 || p2.health <= 0) {
    const winner = p1.health <= 0 ? 1 : 0;
    const loser = winner === 0 ? 1 : 0;
    const winnerHealth = localState.players[winner].health;
    const loserHealth = localState.players[loser].health;
    localState.players[winner].score += 1;
    const winName = winner === 0 ? "Blue" : "Red";
    const matchOver =
      p1.score >= WINS_TO_END_MATCH || p2.score >= WINS_TO_END_MATCH;
    localState.roundResult = {
      winnerIdx: winner,
      loserIdx: loser,
      winnerHealth,
      loserHealth,
      winnerScore: localState.players[winner].score,
      loserScore: localState.players[loser].score,
    };
    if (matchOver) {
      showBanner(`${winName} wins the match!`, 3200);
      localState.round = 1;
      p1.score = 0;
      p2.score = 0;
      clearCombatBuffsFromPlayers();
      syncRedThousandHpAfterLocalReset();
    } else {
      showBanner(`${winName} wins round`);
      localState.round += 1;
    }
    localState.levelIndex = nextLevelIndex(localState.levelIndex);
    healPlayerToCap(p1);
    healPlayerToCap(p2);
    p1.x = 220;
    p2.x = 760;
    playerPrevRenderX[0] = p1.x;
    playerPrevRenderX[1] = p2.x;
    p1.y = FLOOR_Y - PLAYER_BODY_H;
    p2.y = FLOOR_Y - PLAYER_BODY_H;
    p1.vx = p2.vx = p1.vy = p2.vy = 0;
    p1.orbAmmo = ORB_AMMO_PER_ROUND;
    p2.orbAmmo = ORB_AMMO_PER_ROUND;
    p1.fireBreathing = false;
    p2.fireBreathing = false;
    p1.fireStartAt = 0;
    p2.fireStartAt = 0;
    p1.fireNextDamageAt = 0;
    p2.fireNextDamageAt = 0;
    localState.projectiles = [];
    if (!matchOver && mode !== "single") {
      localState.buffPickLoser = loser;
      localState.buffPickActive = true;
      showBuffPickOverlay(loser);
    } else {
      localState.buffPickActive = false;
      hideBuffPickOverlay();
      startLocalRoundCountdown();
    }
  }
}

async function api(path, method = "GET", body) {
  if (
    ACCOUNT_AUTH_DISABLED &&
    (path === "/api/profile" || path === "/api/friends" || path === "/api/friends/invite")
  ) {
    if (method === "GET" && path === "/api/friends") return { friends: [] };
    if (method === "GET" && path === "/api/profile") return { username: "", email: "" };
    return { ok: false };
  }
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
  if (ACCOUNT_AUTH_DISABLED) return;
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
  if (socket) socket.disconnect();
  pendingInvites = [];
  lobbyRoster = [];
  myShareName = "…";
  myLobbyUserId = "";
  arcadeStep = "online_lobby";
  renderOnlineLobby();
  socket = io();

  socket.on("connect", () => {
    setMatchStatus("Online — pick someone to challenge or host a match.");
    socket.emit("lobby:list");
    setArcadeStep("online_lobby");
  });

  socket.on("lobby:players", (list) => {
    lobbyRoster = Array.isArray(list) ? list : [];
    refreshOnlineLobbyIfOpen();
  });

  socket.on("lobby:self", (me) => {
    myShareName = me.shareName || "";
    myLobbyUserId = me.userId || "";
    refreshOnlineLobbyIfOpen();
  });

  socket.on("invite:incoming", (inv) => {
    pendingInvites = pendingInvites.filter((x) => x.roomId !== inv.roomId);
    pendingInvites.push({
      roomId: inv.roomId,
      fromShareName: inv.fromShareName,
      fromUserId: inv.fromUserId,
    });
    if (arcadeStep === "online_lobby") {
      refreshOnlineLobbyIfOpen();
      showBanner(`Invite from ${inv.fromShareName}`);
    } else {
      const ok = window.confirm(`${inv.fromShareName} invited you to a match. Accept?`);
      if (ok) {
        socket.emit("invite:accept", { roomId: inv.roomId });
      }
      pendingInvites = pendingInvites.filter((x) => x.roomId !== inv.roomId);
    }
  });

  socket.on("connect_error", (err) => {
    showBanner(err.message || "Could not connect to game server");
  });

  socket.on("game:error", (p) => {
    showBanner(p.message || "Something went wrong");
  });

  socket.on("match:start", (payload) => {
    roomId = payload.roomId;
    arcadeStep = "in_match";
    playerIndex = payload.playerIndex;
    socket.emit("match:join", { roomId });
    mode = "online";
    if (cheatBlueMeleeBurstPendingOnlineHits > 0) {
      socket.emit("cheat:blue_melee_burst", { hits: cheatBlueMeleeBurstPendingOnlineHits });
      cheatBlueMeleeBurstPendingOnlineHits = 0;
    }
    showBanner(playerIndex === 0 ? "You’re blue (host)" : "You’re red — fight!");
    setMatchStatus(`Online · ${roomId.slice(0, 8)}…`);
    hideArcadeOverlay();
  });

  socket.on("match:countdown", ({ seconds }) => {
    hideArcadeOverlay();
    const s = Number.isFinite(seconds) ? seconds : 3;
    const now = Date.now();
    localState.intermissionStartedAt = now;
    localState.lockUntil = now + s * 1000;
    setMatchStatus(`Opponent joined. Starting in ${s}...`);
  });

  socket.on("match:state", (state) => {
    localState = {
      ...localState,
      round: state.round,
      players: state.players || [],
      projectiles: state.projectiles || [],
      lockUntil: state.lockUntil ?? 0,
      intermissionStartedAt: state.intermissionStartedAt ?? 0,
      buffPickActive: !!state.buffPickActive,
      buffPickLoser: state.buffPickLoser ?? 0,
      buffPickInputUnlocked: !!state.buffPickInputUnlocked,
      buffPickOptions: Array.isArray(state.buffPickOptions) ? state.buffPickOptions : null,
      roundResult: state.roundResult || null,
      levelIndex: Number.isInteger(state.levelIndex) ? state.levelIndex : localState.levelIndex,
    };
    localState.players.forEach((p, i) => {
      if (p?.fireBreathing && !p.fireStartAt) p.fireStartAt = Date.now();
      if (p?.fireBreath && i === playerIndex && !touchState.enabled && !onlineK().fire) {
        startFireBreathKeyBind(playerIndex, true);
      }
    });
    for (let i = 0; i < 2; i += 1) {
      if (!visualState[i]) continue;
      visualState[i].charging = !!localState.players[i]?.charging;
    }
    if (localState.buffPickActive && Array.isArray(localState.buffPickOptions)) {
      if (!document.getElementById("buffPickOverlay")?.classList.contains("hidden")) return;
      showBuffPickOverlay(localState.buffPickLoser, localState.buffPickOptions);
      localState.buffPickInputUnlocked = !!state.buffPickInputUnlocked;
      const gate = document.getElementById("buffPickGateBlock");
      if (gate) gate.classList.toggle("hidden", localState.buffPickInputUnlocked);
    } else if (!localState.buffPickActive) {
      hideBuffPickOverlay();
    }
  });

  socket.on("match:end", ({ reason }) => {
    setMatchStatus(reason);
    showBanner(reason);
    roomId = null;
    mode = "single";
    pendingInvites = [];
    setupSocket();
  });
}

function joinHostByCodeFromUi() {
  if (!socket || !socket.connected) {
    showBanner("Still connecting to online...");
    return;
  }
  const input = document.getElementById("joinCodeInput");
  if (!(input instanceof HTMLInputElement)) return;
  const code = input.value.trim();
  if (!/^\d{5}$/.test(code)) {
    showBanner("Enter a 5-digit host code");
    return;
  }
  setMatchStatus(`Joining host ${code}...`);
  socket.emit("join:code", { code }, (res) => {
    if (!res || !res.ok) {
      showBanner(res?.message || "Could not join that host");
      return;
    }
    showBanner("Join request accepted");
  });
}

function localReset() {
  clearCombatBuffsFromPlayers();
  localState = {
    round: 1,
    levelIndex: 0,
    players: [
      {
        x: 220,
        y: FLOOR_Y - PLAYER_BODY_H,
        vx: 0,
        vy: 0,
        health: 100,
        facing: 1,
        score: 0,
        color: "#2f7dff",
        orbAmmo: ORB_AMMO_PER_ROUND,
        lastShotAt: Date.now(),
        jumpsUsed: 0,
        onGround: true,
        chargeStartAt: 0,
      },
      {
        x: 760,
        y: FLOOR_Y - PLAYER_BODY_H,
        vx: 0,
        vy: 0,
        health: 100,
        facing: -1,
        score: 0,
        color: "#e44b4b",
        orbAmmo: ORB_AMMO_PER_ROUND,
        lastShotAt: Date.now(),
        jumpsUsed: 0,
        onGround: true,
        chargeStartAt: 0,
      },
    ],
    projectiles: [],
    buffPickActive: false,
    buffPickLoser: 0,
    buffPickInputUnlocked: false,
    buffPickOptions: null,
    buffLastOfferedKey: null,
    roundResult: null,
  };
  hideBuffPickOverlay();
  roundLockUntil = 0;
  roundIntermissionStartAt = 0;
  playerPrevRenderX[0] = 220;
  playerPrevRenderX[1] = 760;
  visualState[0] = {
    recoilUntil: 0,
    attackUntil: 0,
    attackStartAt: 0,
    swingDurationMs: undefined,
    meleeDealt: false,
    charging: false,
    prevHealth: 100,
    chargeKeyDownAt: 0,
    shootFlashUntil: 0,
    prevDrawX: undefined,
  };
  visualState[1] = {
    recoilUntil: 0,
    attackUntil: 0,
    attackStartAt: 0,
    swingDurationMs: undefined,
    meleeDealt: false,
    charging: false,
    prevHealth: 100,
    chargeKeyDownAt: 0,
    shootFlashUntil: 0,
    prevDrawX: undefined,
  };
  syncRedThousandHpAfterLocalReset();
}

function onlineIntermissionActive() {
  return mode === "online" && (localState.lockUntil || 0) > Date.now();
}

window.addEventListener("keydown", (e) => {
  tryRedThousandHpCheatFromKeydown(e);
  if (remapState.active) {
    return;
  }
  if (localState.buffPickActive) {
    e.preventDefault();
    if (e.repeat) return;
    if (!localState.buffPickInputUnlocked) return;
    const bopt = localState.buffPickOptions;
    if (bopt && bopt[0] && bopt[1] && bopt[2]) {
      if (e.code === "KeyA" || e.code === "ArrowLeft") applyBuffChoice(bopt[0]);
      else if (e.code === "KeyW" || e.code === "ArrowUp") applyBuffChoice(bopt[1]);
      else if (e.code === "KeyD" || e.code === "ArrowRight") applyBuffChoice(bopt[2]);
    }
    return;
  }
  if (shouldPreventGameKey(e.code)) e.preventDefault();
  keys.add(e.code);
  if (mode !== "online") {
    const b0 = keyBindings.p0;
    const b1 = keyBindings.p1;
    if (e.code === b0.jump) tryJump(0, b0.jump);
    if (mode === "multi" && e.code === b1.jump) tryJump(1, b1.jump);
    if (e.code === b0.melee && !e.repeat) {
      doMelee(0);
    }
    if (mode === "multi" && e.code === b1.melee && !e.repeat) {
      doMelee(1);
    }
    if (localState.players[0]?.fireBreath && b0.fire && e.code === b0.fire && !e.repeat) {
      startFireBreathLocal(0);
    }
    if (mode === "multi" && localState.players[1]?.fireBreath && b1.fire && e.code === b1.fire && !e.repeat) {
      startFireBreathLocal(1);
    }
    if (e.code === p0FireKey() && !visualState[0].charging) {
      if (Date.now() >= roundLockUntil) {
        const p0 = localState.players[0];
        const a0 = p0.orbAmmo != null ? p0.orbAmmo : ORB_AMMO_PER_ROUND;
        if (p0.infiniteAmmo || a0 > 0) {
          p0.chargeStartAt = Date.now();
          visualState[0].charging = true;
        }
      }
    }
    if (mode === "multi" && e.code === p1FireKey() && !visualState[1].charging) {
      if (Date.now() >= roundLockUntil) {
        const pr = localState.players[1];
        const a1 = pr.orbAmmo != null ? pr.orbAmmo : ORB_AMMO_PER_ROUND;
        if (pr.infiniteAmmo || a1 > 0) {
          pr.chargeStartAt = Date.now();
          visualState[1].charging = true;
        }
      }
    }
  }
  if (mode === "online" && socket && roomId) {
    const ok = onlineK();
    const controls = onlineControlsFromInput();
    if (e.code === ok.melee && !e.repeat && !onlineIntermissionActive()) {
      triggerSwing(playerIndex);
      socket.emit("match:input", { action: "melee", controls });
    }
    if (e.code === ok.orb && !onlineIntermissionActive()) {
      visualState[playerIndex].charging = true;
      visualState[playerIndex].chargeKeyDownAt = Date.now();
      socket.emit("match:input", { action: "chargeStart", controls });
    }
    if (localState.players[playerIndex]?.fireBreath && ok.fire && e.code === ok.fire && !e.repeat && !onlineIntermissionActive()) {
      socket.emit("match:input", { action: "fireStart", controls });
    }
    socket.emit("match:input", { controls });
  }
});

window.addEventListener("keyup", (e) => {
  if (remapState.active) {
    return;
  }
  if (localState.buffPickActive) {
    e.preventDefault();
    return;
  }
  if (shouldPreventGameKey(e.code)) e.preventDefault();
  keys.delete(e.code);
  if (mode !== "online") {
    if (e.code === p0FireKey()) {
      const wasCharging = visualState[0].charging;
      const heldMs = Date.now() - localState.players[0].chargeStartAt;
      visualState[0].charging = false;
      if (wasCharging && heldMs >= CHARGE_THRESHOLD_MS) {
        fireProjectile(0);
      }
    }
    if (mode === "multi" && e.code === p1FireKey()) {
      const wasCharging = visualState[1].charging;
      const heldMs = Date.now() - localState.players[1].chargeStartAt;
      visualState[1].charging = false;
      if (wasCharging && heldMs >= CHARGE_THRESHOLD_MS) {
        fireProjectile(1);
      }
    }
    if (e.code === keyBindings.p0.fire) stopFireBreathLocal(0);
    if (mode === "multi" && e.code === keyBindings.p1.fire) stopFireBreathLocal(1);
  }
  if (mode === "online" && socket && roomId) {
    const ok = onlineK();
    const controls = onlineControlsFromInput();
    if (e.code === ok.orb && !onlineIntermissionActive()) {
      const heldMs = Date.now() - (visualState[playerIndex].chargeKeyDownAt || Date.now());
      visualState[playerIndex].charging = false;
      socket.emit("match:input", { action: "chargeRelease", controls });
    }
    if (ok.fire && e.code === ok.fire) {
      socket.emit("match:input", { action: "fireEnd", controls });
    }
    socket.emit("match:input", { controls });
  }
});

window.addEventListener("blur", resetInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetInputState();
});

function setupUI() {
  if (touchOverlayEl) {
    const applyTouchAction = (action, pressed) => {
      if (action === "left") touchState.left = pressed;
      if (action === "right") touchState.right = pressed;
      if (action === "attack") touchState.attack = pressed;
      if (action === "orb") touchState.orb = pressed;
      if (action === "fire") touchState.fire = pressed;
    };

    touchOverlayEl.querySelectorAll("[data-touch-action]").forEach((btn) => {
      const action = btn.getAttribute("data-touch-action");
      if (!action) return;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        applyTouchAction(action, true);
      });
      btn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        applyTouchAction(action, false);
      });
      btn.addEventListener("pointercancel", () => applyTouchAction(action, false));
      btn.addEventListener("pointerleave", () => applyTouchAction(action, false));
    });

    if (touchJoystickEl) {
      const JOY_RADIUS = 34;
      const resetStick = () => {
        touchState.left = false;
        touchState.right = false;
        touchState.jumpFromStick = false;
        if (touchStickEl) touchStickEl.style.transform = "translate(-50%, -50%)";
      };
      const moveStick = (clientX, clientY) => {
        const rect = touchJoystickEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        const scale = dist > JOY_RADIUS ? JOY_RADIUS / dist : 1;
        const clampedX = dx * scale;
        const clampedY = dy * scale;
        if (touchStickEl) {
          touchStickEl.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
        }
        touchState.left = clampedX < -10;
        touchState.right = clampedX > 10;
        touchState.jumpFromStick = clampedY < -14;
      };
      touchJoystickEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        moveStick(e.clientX, e.clientY);
      });
      touchJoystickEl.addEventListener("pointermove", (e) => {
        if ((e.buttons & 1) === 0) return;
        e.preventDefault();
        moveStick(e.clientX, e.clientY);
      });
      touchJoystickEl.addEventListener("pointerup", resetStick);
      touchJoystickEl.addEventListener("pointercancel", resetStick);
      touchJoystickEl.addEventListener("pointerleave", resetStick);
    }
  }

  document.getElementById("singleBtn").addEventListener("click", () => {
    mode = "single";
    setMatchStatus("Single player mode.");
    localReset();
    setArcadeStep("controls_p1");
    closeSettings();
  });
  document.getElementById("multiBtn").addEventListener("click", () => {
    mode = "multi";
    setMatchStatus("Local multiplayer (same keyboard).");
    localReset();
    setArcadeStep("controls_p1");
    closeSettings();
  });
  document.getElementById("onlineBtn").addEventListener("click", () => {
    mode = "online";
    closeSettings();
    if (touchState.enabled) setupSocket();
    else setArcadeStep("controls_online");
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
        setupSocket();
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
    const from = e.target instanceof Element ? e.target : null;
    const t = from && typeof from.closest === "function" ? from.closest("[data-action]") : null;
    const action = t && t.dataset ? t.dataset.action : from?.dataset?.action;
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    if (action === "next") setArcadeStep("mode");
    if (action === "single") {
      mode = "single";
      localReset();
      setMatchStatus("Single player mode.");
      setArcadeStep("controls_p1");
    }
    if (action === "multi") {
      mode = "multi";
      localReset();
      setMatchStatus("Local multiplayer (same keyboard).");
      setArcadeStep("controls_p1");
    }
    if (action === "online") {
      mode = "online";
      if (touchState.enabled) setupSocket();
      else setArcadeStep("controls_online");
    }
    if (action === "bind0_keep") {
      resetPlayerBindingsDefault(0);
      if (mode === "multi") setArcadeStep("controls_p2");
      else launchLocalRoundFromSetup();
    }
    if (action === "bind0_map") {
      startRemapWizard(0);
    }
    if (action === "bind1_keep") {
      resetPlayerBindingsDefault(1);
      launchLocalRoundFromSetup();
    }
    if (action === "bind1_map") {
      startRemapWizard(1);
    }
    if (action === "bind1_back") {
      setArcadeStep("controls_p1");
    }
    if (action === "online_bind_keep") {
      resetOnlineBindingsDefault();
      setupSocket();
    }
    if (action === "online_bind_map") {
      startRemapWizardOnline();
    }
    if (action === "backMode") setArcadeStep("mode");
    if (action === "cancelOnline") {
      if (socket) socket.disconnect();
      socket = null;
      roomId = null;
      mode = "single";
      pendingInvites = [];
      lobbyRoster = [];
      myShareName = "";
      myLobbyUserId = "";
      setMatchStatus("Disconnected from online.");
      setArcadeStep("mode");
    }
    if (action === "lobby_host") {
      if (!socket || !socket.connected) {
        showBanner("Still connecting to online...");
      } else {
        socket.emit("room:create");
        setMatchStatus("Hosting: waiting for join by your code.");
        showBanner("Host room open (1 spot)");
      }
    }
  });

  overlayEl.addEventListener("click", (e) => {
    const from = e.target instanceof Element ? e.target : null;
    const btn = from && typeof from.closest === "function" ? from.closest("[data-lobby-action]") : null;
    if (!btn || !socket) return;
    const act = btn.getAttribute("data-lobby-action");
    if (act === "joinCode") {
      joinHostByCodeFromUi();
    }
    if (act === "accept") {
      const rid = btn.getAttribute("data-room-id");
      if (rid) {
        socket.emit("invite:accept", { roomId: rid });
        pendingInvites = pendingInvites.filter((x) => x.roomId !== rid);
        refreshOnlineLobbyIfOpen();
      }
    }
    if (act === "decline") {
      const rid = btn.getAttribute("data-room-id");
      pendingInvites = pendingInvites.filter((x) => x.roomId !== rid);
      refreshOnlineLobbyIfOpen();
    }
  });

  document.getElementById("settingsToggleBtn").addEventListener("click", openSettings);
  document.getElementById("settingsCloseBtn").addEventListener("click", closeSettings);
  settingsBackdropEl.addEventListener("click", closeSettings);

  overlayEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id !== "joinCodeInput") return;
    e.preventDefault();
    joinHostByCodeFromUi();
  });

  const buffOverlay = document.getElementById("buffPickOverlay");
  if (buffOverlay) {
    buffOverlay.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-buff]");
      if (!btn) return;
      applyBuffChoice(btn.getAttribute("data-buff"));
    });
  }
}

async function boot() {
  loadKeyBindings();
  if (ACCOUNT_AUTH_DISABLED) {
    profile.token = "";
    localStorage.removeItem(authTokenKey);
  }
  /* Interactive arcade before profile fetch — was awaiting and blocking `setupUI` + controls. */
  setupUI();
  setArcadeStep("welcome");
  render();
  await loadProfileFromServer();
  const usernameInput = document.getElementById("usernameInput");
  if (usernameInput) usernameInput.value = profile.username;
  const emailInput = document.getElementById("emailInput");
  if (emailInput) emailInput.value = profile.email;
  renderFriends();
}

boot();
