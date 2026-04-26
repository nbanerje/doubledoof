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
  const shake = screenShakeOffset();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, GAME_W, GAME_H);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(GAME_W / VIEW_W, 0, 0, GAME_H / VIEW_H, 0, 0);
  if (shake.x || shake.y) ctx.translate(shake.x, shake.y);
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
  const max = playerAmmoMax(p);
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
  const shake = screenShakeOffset();
  vc.save();
  vc.setTransform(vw / VIEW_W, 0, 0, vh / VIEW_H, shake.x * (vw / VIEW_W), shake.y * (vh / VIEW_H));
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
const FLOOR_Y = 520;
const PLATFORM_RAISE_PX = 40;
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
const CHARGE_JUMP_HEIGHT_MULT = 0.72;
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
  "freeze",
  "groundPound",
  "poisonSword",
  "teleport",
  "vampSlash",
  "heavyLanding",
  "secondWind",
  "ricochetOrb",
  "trapSeed",
  "echoSlash",
];
const BUFF_DEFS = {
  triple: { name: "Burst", desc: "+1 bullet per shot (fires in sequence)", icon: "🔺" },
  tank: { name: "Tank", desc: "+75 max HP for the match", icon: "🛡️" },
  power: { name: "Power", desc: "+35% damage for the match", icon: "⚡" },
  infiniteJumps: { name: "Sky", desc: "Unlimited mid-air jumps", icon: "🪽" },
  infiniteAmmo: { name: "Ammo+", desc: "+1 max ammo (stacks)", icon: "♾️" },
  instantMaxCharge: { name: "Overcharge", desc: "Shots are always full tier V", icon: "💥" },
  meleeLong: { name: "Duelist", desc: "Melee range and swing 2× longer", icon: "🗡️" },
  fireBreath: {
    name: "Fire Breath",
    desc: "Hold to breathe fire; release shoots a bolt (10 dmg + 5s burn)",
    icon: "🐉",
  },
  freeze: { name: "Freeze", desc: "Orbs root enemies on hit and fire a trailing orb", icon: "❄️" },
  groundPound: { name: "Ground Pound", desc: "Map a key to slam: same ground layer launches + 25% damage", icon: "🪨" },
  poisonSword: { name: "Poison Sword", desc: "Melee/staff hits poison for 5s: green flash + damage over time", icon: "☠️" },
  teleport: { name: "Teleport", desc: "Map a key to teleport to your opponent once per round", icon: "🌀" },
  vampSlash: { name: "Vamp Slash", desc: "Heal for 30% of melee damage dealt (stacks)", icon: "🩸" },
  heavyLanding: { name: "Heavy Landing", desc: "Landing near enemies deals burst damage + pop-up", icon: "🦶" },
  secondWind: { name: "Second Wind", desc: "Below 35% HP: move faster and deal bonus damage", icon: "💨" },
  ricochetOrb: { name: "Ricochet Orb", desc: "Orbs bounce once off walls/platforms (stacks)", icon: "🪃" },
  trapSeed: { name: "Trap Seed", desc: "Melee plants a seed spot; stepping in poisons for 10s (2 dmg/sec)", icon: "🌱" },
  echoSlash: { name: "Echo Slash", desc: "Melee hits add bonus echo damage (stacks)", icon: "👻" },
  fungalBloom: { name: "Fungal Bloom", desc: "Damaging poisoned foes spawns toxic bloom spots", icon: "🍄" },
  sporeDash: { name: "Spore Dash", desc: "Jumping grants a short burst of speed", icon: "🏃" },
  thornSkin: { name: "Thorn Skin", desc: "Melee attackers take reflect damage", icon: "🌵" },
  rootPrison: { name: "Root Prison", desc: "First trap trigger each round also roots", icon: "🪢" },
  toxicBurst: { name: "Toxic Burst", desc: "Poison ending pops for bonus damage", icon: "🧪" },
  adrenalBite: { name: "Adrenal Bite", desc: "Taking damage grants a short damage boost", icon: "❤️‍🔥" },
  orbLeech: { name: "Orb Leech", desc: "Orb hits heal you for a small amount", icon: "🧲" },
  chainRot: { name: "Chain Rot", desc: "Poisoned targets are easier to keep poisoned", icon: "🦠" },
  phaseStep: { name: "Phase Step", desc: "Ignore first knockback each round", icon: "👣" },
  gravityWell: { name: "Gravity Well", desc: "Orb hits pull enemies toward impact", icon: "🕳️" },
  overgrowthArmor: { name: "Overgrowth Armor", desc: "Standing still grants damage reduction", icon: "🪵" },
  bloodPact: { name: "Blood Pact", desc: "Melee can consume HP to hit much harder", icon: "🩹" },
  reboundGuard: { name: "Rebound Guard", desc: "Air hits bounce you upward", icon: "⤴️" },
  ambushSeed: { name: "Ambush Seed", desc: "Trap seeds become harder to see", icon: "🥷" },
  echoOrb: { name: "Echo Orb", desc: "Every few orb shots emit a delayed echo orb", icon: "📡" },
  predatorInstinct: { name: "Predator Instinct", desc: "Bonus damage vs low-HP enemies", icon: "🦈" },
  manaBattery: { name: "Mana Battery", desc: "Melee hits refund orb ammo", icon: "🔋" },
  windCut: { name: "Wind Cut", desc: "Melee sends a short-range slash projectile", icon: "🌬️" },
  snapFreeze: { name: "Snap Freeze", desc: "After unfreezing, your next hit roots briefly", icon: "🧊" },
  lastStand: { name: "Last Stand", desc: "Once per round, survive lethal damage at 1 HP", icon: "🛟" },
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
/** Extra weight for Fire Breath when the loser plays Dragon (still competes with other buffs). */
const BUFF_DRAGON_FIRE_BREATH_PICK_WEIGHT = 8;
function buffPickWeight(id, opts = {}) {
  if (id === "infiniteAmmo") return BUFF_INFINITE_AMMO_RARITY;
  if (opts.dragonLoser && id === "fireBreath") return BUFF_DRAGON_FIRE_BREATH_PICK_WEIGHT;
  return 1;
}

/**
 * Picks 2 distinct buffs from `ids` without replacement, favoring rarer `infiniteAmmo` less often.
 */
function pickWeightedPairWithoutReplacement(ids, weightOpts = {}) {
  if (ids.length < 2) {
    return ids.length === 1 ? [ids[0], ids[0]] : ["tank", "power"];
  }
  let wSum = 0;
  for (const id of ids) wSum += buffPickWeight(id, weightOpts);
  let r = Math.random() * wSum;
  let first = ids[ids.length - 1];
  for (const id of ids) {
    r -= buffPickWeight(id, weightOpts);
    if (r <= 0) {
      first = id;
      break;
    }
  }
  const rest = ids.filter((id) => id !== first);
  wSum = 0;
  for (const id of rest) wSum += buffPickWeight(id, weightOpts);
  r = Math.random() * wSum;
  let second = rest[rest.length - 1];
  for (const id of rest) {
    r -= buffPickWeight(id, weightOpts);
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
function pickRandomBuffTriplet(loserIdx) {
  const weightOpts = { dragonLoser: loserIdx != null && isDragonCharacterForPlayer(loserIdx) };
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const [x, y] = pickWeightedPairWithoutReplacement([...BUFF_POOL_NO_TRIPLE], weightOpts);
    const triplet = ["triple", x, y];
    shuffleInPlace(triplet);
    const key = [...triplet].sort().join("|");
    if (!localState.buffLastOfferedKey || key !== localState.buffLastOfferedKey) {
      return { triplet, key };
    }
  }
  const [x, y] = pickWeightedPairWithoutReplacement([...BUFF_POOL_NO_TRIPLE], weightOpts);
  const triplet = ["triple", x, y];
  shuffleInPlace(triplet);
  return { triplet, key: [...triplet].sort().join("|") };
}
const SWING_DURATION_MS = 160;
/** Bat swing reach (shorter than before) */
const MELEE_RANGE = 48;
/** Horizontal push on defender when melee connects */
const MELEE_KNOCKBACK_VX = 50;
const STAFF_DAMAGE = 20;
const STAFF_KNOCKBACK_VX = 70;
const STAFF_COOLDOWN_MS = 500;
const STAFF_SWING_DURATION_MS = 220;
const SWORD_COOLDOWN_MS = 0;
const STACK_COOLDOWN_REDUCTION_MULT = 0.9;
const MIN_MELEE_COOLDOWN_MS = 150;
const STAFF_SWING_FRAMES = 5;
const STAFF_SWING_ANIM_SPEED = 2.5;
const FIRE_BREATH_RANGE = PLAYER_BODY_W * 1.5;
const FIRE_BREATH_H = 20;
const FIRE_BREATH_TICK_MS = 100;
const FIRE_BREATH_FRAME_COUNT = 26;
const FIRE_BREATH_FRAME_MS = 24;
const FIRE_BREATH_BASE_DAMAGE = 7;
const FIRE_BREATH_SLOW_MULT = 0.25;
const FIRE_BREATH_GROWTH_PER_TICK = 0.12;
/** Caps range/height growth while holding (uncapped was ~7× at max hold). */
const FIRE_BREATH_MAX_SCALE = 2.5;
const FIRE_BREATH_MAX_HOLD_MS = 5000;
const FIRE_BREATH_COOLDOWN_MS = 5000;
const GROUND_POUND_DAMAGE_FRACTION = 0.25;
const GROUND_POUND_LAUNCH_VY = -14;
const GROUND_POUND_LAYER_EPSILON = 2;
const GROUND_POUND_SHAKE_MS = 240;
const GROUND_POUND_SHAKE_AMPLITUDE = 7;
const GROUND_POUND_FREEZE_MS = 3000;
const FROZEN_VIBRATE_PX = 2;
const POISON_DURATION_MS = 5000;
const POISON_TICK_MS = 1000;
const POISON_TICK_DAMAGE = 2;
/** Fire-breath release: fast bolt + burn on hit */
const BURN_DURATION_MS = 5000;
const BURN_TICK_MS = 300;
const BURN_TICK_DAMAGE = 0.5;
const FIRE_BURST_SPEED = 22;
const FIRE_BURST_W = 32;
const FIRE_BURST_H = 12;
const FIRE_BURST_HIT_DAMAGE = 10;
const FIRE_BURST_FRAME_MS = 70;
const DEFAULT_MAX_HP = 100;
/** Max HP gained per Tank card pick (stacks if picked again). */
const TANK_BUFF_HP_PER_PICK = 75;
/** A match ends as soon as one side reaches this many round wins. */
const WINS_TO_END_MATCH = 10;
/** Charged orb damage = `ORB_DAMAGE_MIN + ORB_DAMAGE_RANGE * chargeCurve` (before power buff). */
const ORB_DAMAGE_MIN = 6;
const ORB_DAMAGE_RANGE = 26;
/** Charged shots per fighter per round (each projectile counts; triple uses 3). */
const ORB_AMMO_PER_ROUND = 1;
const AMMO_RELOAD_IDLE_MS = 5000;
const AMMO_RELOAD_AMOUNT = 1;
const POWER_BUFF_DAMAGE_MULT = 1.35;
const CARD_LOADOUT_MAX = 8;
const FREEZE_HIT_ROOT_MS = 1600;
const FREEZE_TRAIL_ORB_OFFSET = 26;
const VAMP_SLASH_HEAL_FRAC = 0.3;
const VAMP_SLASH_STACK_BONUS = 0.1;
const HEAVY_LANDING_RANGE = 96;
const HEAVY_LANDING_DAMAGE = 8;
const HEAVY_LANDING_STACK_BONUS = 4;
const HEAVY_LANDING_UPWARD_VY = -8;
const HEAVY_LANDING_GRAVITY_MULT = 1.45;
const HEAVY_LANDING_STACK_GRAVITY_BONUS = 0.12;
const HEAVY_LANDING_SHAKE_MS = 320;
const HEAVY_LANDING_SHAKE_AMPLITUDE = 11;
const SECOND_WIND_HP_THRESHOLD = 0.35;
const SECOND_WIND_SPEED_BONUS = 0.25;
const SECOND_WIND_DAMAGE_BONUS = 0.2;
const SECOND_WIND_STACK_BONUS = 0.1;
const TRAP_SEED_POISON_DURATION_MS = 10000;
const TRAP_SEED_POISON_TICK_MS = 1000;
const TRAP_SEED_POISON_TICK_DAMAGE = 2;
const TRAP_SEED_SPOT_W = 22;
const TRAP_SEED_SPOT_H = 8;
const TRAP_SEED_SPOT_DURATION_MS = 10000;
const ECHO_SLASH_BONUS_FRAC = 0.5;
const ECHO_SLASH_STACK_BONUS_FRAC = 0.15;
const THORN_SKIN_REFLECT = 0.25;
const ADRENAL_BITE_MS = 3000;
const ADRENAL_BITE_BONUS = 0.2;
const ORB_LEECH_HEAL = 2;
const PHASE_STEP_REDUCE_KB = 0;
const GRAVITY_WELL_PULL = 24;
const OVERGROWTH_ARMOR_STILL_MS = 2000;
const OVERGROWTH_ARMOR_DR = 0.25;
const BLOOD_PACT_HP_COST = 10;
const BLOOD_PACT_BONUS = 0.5;
const ECHO_ORB_INTERVAL = 3;
const PREDATOR_INSTINCT_THRESHOLD = 0.3;
const PREDATOR_INSTINCT_BONUS = 0.25;
const MANA_BATTERY_REFUND = 1;
const SNAP_FREEZE_ROOT_MS = 1000;
const TOXIC_BURST_DAMAGE = 8;
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
const DRAGON_IDLE_URL = "./assets/dragon-idle.png?v=4";
const DRAGON_RUN_URLS = [
  "./assets/dragon-run-1.png?v=4",
  "./assets/dragon-run-2.png?v=4",
  "./assets/dragon-run-3.png?v=4",
  "./assets/dragon-run-4.png?v=4",
];
const FUNUS_IDLE_URL = "./assets/funus_idle_4.png";
const FUNUS_RUN_URLS = [
  "./assets/funus_run_1.png",
  "./assets/funus_run_2.png",
  "./assets/funus_run_3.png",
];
const STAFF_SLAP_URLS = [
  "./assets/staff-slap-1.png",
  "./assets/staff-slap-2.png",
  "./assets/staff-slap-3.png",
  "./assets/staff-slap-4.png",
  "./assets/staff-slap-5.png",
];
const MELEE_SWORD_URL = "./assets/melee-sword.png";
const FIRE_BREATH_RIGHT_URL = "./assets/fire-breath-right-sheet.png";
const FIRE_BREATH_LEFT_URL = "./assets/fire-breath-left-sheet.png";
const CASTLE_PLATFORM_BG_URL = "./assets/castle-platform-bg.png";
const WATERFALL_BG_URL = "./assets/bg-waterfall.png";
const FOREST_BG_URL = "./assets/bg-forest.png";
const CASTLE_WIDE_BG_URL = "./assets/bg-castle-2.png";
const FIRE_BURST_FRAME_URLS = [
  "./assets/fire-burst-1.png",
  "./assets/fire-burst-2.png",
  "./assets/fire-burst-3.png",
  "./assets/fire-burst-4.png",
];
const percivalIdleImage = new Image();
const meleeSwordImage = new Image();
const fireBreathRightImage = new Image();
const fireBreathLeftImage = new Image();
const castlePlatformBgImage = new Image();
const waterfallBgImage = new Image();
const forestBgImage = new Image();
const castleWideBgImage = new Image();
const percivalHitImage = new Image();
const guy2IdleImage = new Image();
const guy2HitImage = new Image();
const dragonIdleImage = new Image();
const funusIdleImage = new Image();
const percivalRunImages = PERCIVAL_RUN_URLS.map(() => new Image());
const guy2RunImages = GUY2_RUN_URLS.map(() => new Image());
const dragonRunImages = DRAGON_RUN_URLS.map(() => new Image());
const funusRunImages = FUNUS_RUN_URLS.map(() => new Image());
const staffSlapImages = STAFF_SLAP_URLS.map(() => new Image());
const fireBurstFrameImages = FIRE_BURST_FRAME_URLS.map(() => new Image());
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let percivalIdleBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let percivalHitBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let guy2IdleBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let guy2HitBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let dragonIdleBlit = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let funusIdleBlit = null;
/**
 * Four run blits in order: 1 → 2 → 3 → 4 → loop (each file is keyed + cropped to the knight).
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let percivalRun = null;
/**
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let guy2Run = null;
/**
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let dragonRun = null;
/**
 * Three run blits in order: 1 → 2 → 3 → loop.
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let funusRun = null;
/**
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let staffSlap = null;
/** @type {{ canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number } | null} */
let meleeSwordBlit = null;
/**
 * Four burst frames in order: 1 -> 2 -> 3 -> 4 -> loop.
 * @type {{ frames: { canvas: HTMLCanvasElement; cx: number; cy: number; cw: number; ch: number }[] } | null}
 */
let fireBurstAnim = null;

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
  const ba = (d[c00 + 3] + d[c10 + 3] + d[c01 + 3] + d[c11 + 3]) / 4;
  if (ba < 8) return { canvas: c, d, iw, ih };
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

/**
 * Staff frames use a strict corner-color key so only the maroon plate gets removed.
 * Remaining pixels are forced opaque to avoid a washed/translucent staff look.
 */
function keyStaffToCanvas(img) {
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
  const ba = (d[c00 + 3] + d[c10 + 3] + d[c01 + 3] + d[c11 + 3]) / 4;
  if (ba < 8) return { canvas: c, d, iw, ih };
  const br = (d[c00] + d[c10] + d[c01] + d[c11]) / 4;
  const bg = (d[c00 + 1] + d[c10 + 1] + d[c01 + 1] + d[c11 + 1]) / 4;
  const bb = (d[c00 + 2] + d[c10 + 2] + d[c01 + 2] + d[c11 + 2]) / 4;
  const bgThresh = 26 * 26;
  for (let p = 0; p < d.length; p += 4) {
    const r = d[p] - br;
    const g = d[p + 1] - bg;
    const b = d[p + 2] - bb;
    if (r * r + g * g + b * b < bgThresh) {
      d[p + 3] = 0;
    } else if (d[p + 3] > 0) {
      d[p + 3] = 255;
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

/** Staff frames: maroon keyed out, but sprite pixels stay fully opaque. */
function buildStaffSlapBlit(img) {
  const k = keyStaffToCanvas(img);
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

function buildFireBurstFrameBlit(img) {
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

function initDragonIdleBlit() {
  if (!dragonIdleImage.naturalWidth) return;
  dragonIdleBlit = buildPercivalIdleBlit(dragonIdleImage);
}
dragonIdleImage.onload = initDragonIdleBlit;
dragonIdleImage.src = DRAGON_IDLE_URL;
if (dragonIdleImage.complete) initDragonIdleBlit();

function initFunusIdleBlit() {
  if (!funusIdleImage.naturalWidth) return;
  funusIdleBlit = buildPercivalIdleBlit(funusIdleImage);
}
funusIdleImage.onload = initFunusIdleBlit;
funusIdleImage.src = FUNUS_IDLE_URL;
if (funusIdleImage.complete) initFunusIdleBlit();

function initMeleeSwordBlit() {
  if (!meleeSwordImage.naturalWidth) return;
  meleeSwordBlit = buildPercivalIdleBlit(meleeSwordImage);
}
meleeSwordImage.onload = initMeleeSwordBlit;
meleeSwordImage.src = MELEE_SWORD_URL;
if (meleeSwordImage.complete) initMeleeSwordBlit();

fireBreathRightImage.src = FIRE_BREATH_RIGHT_URL;
fireBreathLeftImage.src = FIRE_BREATH_LEFT_URL;
castlePlatformBgImage.src = CASTLE_PLATFORM_BG_URL;
waterfallBgImage.src = WATERFALL_BG_URL;
forestBgImage.src = FOREST_BG_URL;
castleWideBgImage.src = CASTLE_WIDE_BG_URL;

function tryInitFireBurstFrames() {
  for (let i = 0; i < fireBurstFrameImages.length; i += 1) {
    const im = fireBurstFrameImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < fireBurstFrameImages.length; i += 1) {
    const b = buildFireBurstFrameBlit(fireBurstFrameImages[i]);
    if (!b) return;
    frames.push(b);
  }
  fireBurstAnim = { frames };
}
for (let i = 0; i < fireBurstFrameImages.length; i += 1) {
  fireBurstFrameImages[i].onload = tryInitFireBurstFrames;
  fireBurstFrameImages[i].src = FIRE_BURST_FRAME_URLS[i];
  if (fireBurstFrameImages[i].complete) tryInitFireBurstFrames();
}

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

function tryInitDragonRun() {
  for (let i = 0; i < dragonRunImages.length; i += 1) {
    const im = dragonRunImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < dragonRunImages.length; i += 1) {
    const b = buildPercivalIdleBlit(dragonRunImages[i]);
    if (!b) return;
    frames.push(b);
  }
  dragonRun = { frames };
}
for (let i = 0; i < dragonRunImages.length; i += 1) {
  dragonRunImages[i].onload = tryInitDragonRun;
  dragonRunImages[i].src = DRAGON_RUN_URLS[i];
  if (dragonRunImages[i].complete) tryInitDragonRun();
}

function tryInitFunusRun() {
  for (let i = 0; i < funusRunImages.length; i += 1) {
    const im = funusRunImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < funusRunImages.length; i += 1) {
    const b = buildPercivalIdleBlit(funusRunImages[i]);
    if (!b) return;
    frames.push(b);
  }
  funusRun = { frames };
}
for (let i = 0; i < funusRunImages.length; i += 1) {
  funusRunImages[i].onload = tryInitFunusRun;
  funusRunImages[i].src = FUNUS_RUN_URLS[i];
  if (funusRunImages[i].complete) tryInitFunusRun();
}

function tryInitStaffSlap() {
  for (let i = 0; i < staffSlapImages.length; i += 1) {
    const im = staffSlapImages[i];
    if (!im.complete || !im.naturalWidth) return;
  }
  const frames = [];
  for (let i = 0; i < staffSlapImages.length; i += 1) {
    const b = buildStaffSlapBlit(staffSlapImages[i]);
    if (!b) return;
    frames.push(b);
  }
  staffSlap = { frames };
}
for (let i = 0; i < staffSlapImages.length; i += 1) {
  staffSlapImages[i].onload = tryInitStaffSlap;
  staffSlapImages[i].src = STAFF_SLAP_URLS[i];
  if (staffSlapImages[i].complete) tryInitStaffSlap();
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
      groundPound: "",
      teleport: "",
    },
    p1: {
      left: "ArrowLeft",
      right: "ArrowRight",
      jump: "ArrowUp",
      melee: "Comma",
      charge: "ArrowDown",
      attack: "ArrowDown",
      fire: "",
      groundPound: "",
      teleport: "",
    },
    online: {
      left: "KeyA",
      right: "KeyD",
      jump: "KeyW",
      melee: "KeyF",
      orb: "KeyS",
      fire: "",
      groundPound: "",
      teleport: "",
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
    if (keyBindings.p0.groundPound == null) keyBindings.p0.groundPound = def.p0.groundPound;
    if (keyBindings.p0.teleport == null) keyBindings.p0.teleport = def.p0.teleport;
    if (keyBindings.p1.fire == null) keyBindings.p1.fire = def.p1.fire;
    if (keyBindings.p1.groundPound == null) keyBindings.p1.groundPound = def.p1.groundPound;
    if (keyBindings.p1.teleport == null) keyBindings.p1.teleport = def.p1.teleport;
    keyBindings.p0.attack = keyBindings.p0.charge;
    keyBindings.p1.attack = keyBindings.p1.charge;
    if (!keyBindings.online.melee) keyBindings.online.melee = def.online.melee;
    if (!keyBindings.online.orb) keyBindings.online.orb = keyBindings.online.attack || def.online.orb;
    if (keyBindings.online.fire == null) keyBindings.online.fire = def.online.fire;
    if (keyBindings.online.groundPound == null) keyBindings.online.groundPound = def.online.groundPound;
    if (keyBindings.online.teleport == null) keyBindings.online.teleport = def.online.teleport;
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
  add(p0.groundPound);
  add(p0.teleport);
  add(p1.left);
  add(p1.right);
  add(p1.jump);
  add(p1.melee);
  add(p1.charge);
  add(p1.attack);
  add(p1.fire);
  add(p1.groundPound);
  add(p1.teleport);
  add(online.left);
  add(online.right);
  add(online.jump);
  add(online.melee);
  add(online.orb);
  add(online.fire);
  add(online.groundPound);
  add(online.teleport);
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

function activeLoadoutForPlayer(playerIdx) {
  return mode === "online" ? selectedOnlineLoadout : selectedLoadouts[playerIdx];
}

function playerLabelForSetup(playerIdx) {
  if (mode === "online") return "Your fighter";
  return playerIdx === 0 ? "Player 1 (Blue)" : "Player 2 (Red)";
}

function renderLoadoutSelectScreen(kind, playerIdx) {
  const isCharacter = kind === "character";
  const options = isCharacter ? CHARACTER_OPTIONS : WEAPON_OPTIONS;
  const action = isCharacter ? "select_character" : "select_weapon";
  const selectedKey = isCharacter ? "character" : "weapon";
  const loadout = activeLoadoutForPlayer(playerIdx);
  const label = playerLabelForSetup(playerIdx);

  stepLabelEl.textContent = isCharacter ? "Pick character" : "Pick weapon";
  arcadeTitleEl.textContent = isCharacter ? "Pick Character" : "Pick Weapon";
  arcadeTextEl.textContent = isCharacter
    ? `${label}: choose from 6 character slots. Knight, Dragon, and Funus are available right now.`
    : `${label}: choose from 6 weapon slots. Sword and Staff are available right now.`;
  arcadeActionsEl.innerHTML = "";
  arcadeActionsEl.classList.add("arcade-actions--char-pick");
  arcadeCardEl?.classList.add("arcade-card--wide");

  const grid = document.createElement("div");
  grid.className = "char-pick-grid";
  options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-tile";
    btn.dataset.action = action;
    btn.dataset.optionId = opt.id;
    btn.dataset.playerIdx = String(playerIdx);
    if (!opt.enabled) btn.disabled = true;
    if (loadout[selectedKey] === opt.id) btn.classList.add("selected");
    const preview = document.createElement("span");
    preview.className = `char-tile-preview char-tile-preview--${isCharacter ? "character" : "weapon"}`;
    preview.textContent = opt.enabled
      ? isCharacter
        ? opt.id === "dragon"
          ? "D"
          : opt.id === "funus"
            ? "F"
          : "K"
        : opt.id === "staff"
          ? "T"
          : "S"
      : String(i + 1);
    const text = document.createElement("span");
    text.className = "char-tile-label";
    text.textContent = opt.label;
    btn.append(preview, text);
    grid.appendChild(btn);
  });
  arcadeActionsEl.appendChild(grid);

  const back = document.createElement("button");
  back.type = "button";
  back.dataset.action = "loadout_back";
  back.dataset.kind = kind;
  back.dataset.playerIdx = String(playerIdx);
  back.textContent = "Back";
  arcadeActionsEl.appendChild(back);

  if (arcadeExtraEl) {
    arcadeExtraEl.innerHTML = `<p class="arcade-bind-summary">${label}: ${escapeHtml(loadout.character)} + ${escapeHtml(loadout.weapon)}</p>`;
  }
  overlayEl.classList.remove("hidden");
}

function nextStepAfterCharacter(playerIdx) {
  return `weapon_p${playerIdx + 1}`;
}

function nextStepAfterWeapon(playerIdx) {
  if (mode === "multi" && playerIdx === 0) return "character_p2";
  if (mode === "online") return "controls_online";
  return "controls_p1";
}

function selectedCharacterForRender(idx) {
  if (mode === "online") {
    return idx === playerIndex ? selectedOnlineLoadout.character : "knight";
  }
  return selectedLoadouts[idx]?.character || "knight";
}

function selectedWeaponForPlayer(idx, p = null) {
  if (p?.weapon) return p.weapon;
  if (mode === "online") {
    return idx === playerIndex ? selectedOnlineLoadout.weapon : "sword";
  }
  return selectedLoadouts[idx]?.weapon || "sword";
}

function weaponStatsForId(id) {
  if (id === "staff") {
    return {
      id: "staff",
      damage: STAFF_DAMAGE,
      knockback: STAFF_KNOCKBACK_VX,
      cooldownMs: STAFF_COOLDOWN_MS,
      swingDurationMs: STAFF_SWING_DURATION_MS,
      frames: STAFF_SWING_FRAMES,
    };
  }
  return {
    id: "sword",
    damage: 7,
    knockback: MELEE_KNOCKBACK_VX,
    cooldownMs: SWORD_COOLDOWN_MS,
    swingDurationMs: SWING_DURATION_MS,
    frames: 0,
  };
}

function onlineInputPayload(action, controls) {
  const payload = {
    controls,
    weapon: selectedOnlineLoadout.weapon || "sword",
    character: selectedOnlineLoadout.character || "knight",
  };
  if (action) payload.action = action;
  return payload;
}

function isDragonCharacterForPlayer(idx, p = null) {
  if (p?.character) return p.character === "dragon";
  if (mode === "online") {
    if (idx === playerIndex) return (selectedOnlineLoadout.character || "knight") === "dragon";
    return (localState.players[idx]?.character || "knight") === "dragon";
  }
  return (selectedLoadouts[idx]?.character || "knight") === "dragon";
}

function sanitizeBuffTripletForPlayer(triplet, loserIdx) {
  if (!Array.isArray(triplet)) return triplet;
  if (isDragonCharacterForPlayer(loserIdx)) return [...triplet];
  const out = [...triplet];
  const fallbackPool = BUFF_POOL.filter((id) => id !== "fireBreath");
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] !== "fireBreath") continue;
    const used = new Set(out);
    used.delete("fireBreath");
    const choices = fallbackPool.filter((id) => !used.has(id));
    out[i] = choices.length ? choices[Math.floor(Math.random() * choices.length)] : "tank";
  }
  return out;
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
    name: "Castle Gate",
    bg: "castle",
    ground: "#495867",
    platforms: [
      { x: 140, y: 500, w: 175, h: 14 },
      { x: 400, y: 395, w: 200, h: 14 },
      { x: 700, y: 505, w: 170, h: 14 },
      { x: 560, y: 335, w: 155, h: 14 },
    ],
  },
  {
    name: "Waterfall Ruins",
    bg: "waterfall",
    ground: "#5c8a6a",
    platforms: [
      { x: 140, y: 500, w: 175, h: 14 },
      { x: 400, y: 395, w: 200, h: 14 },
      { x: 700, y: 505, w: 170, h: 14 },
      { x: 560, y: 335, w: 155, h: 14 },
    ],
  },
  {
    name: "Deepwood Reach",
    bg: "forest",
    ground: "#2c6c5f",
    platforms: [
      { x: 140, y: 500, w: 175, h: 14 },
      { x: 400, y: 395, w: 200, h: 14 },
      { x: 700, y: 505, w: 170, h: 14 },
      { x: 560, y: 335, w: 155, h: 14 },
    ],
  },
  {
    name: "High Keep",
    bg: "castleWide",
    ground: "#6f7a88",
    platforms: [
      { x: 140, y: 500, w: 175, h: 14 },
      { x: 400, y: 395, w: 200, h: 14 },
      { x: 700, y: 505, w: 170, h: 14 },
      { x: 560, y: 335, w: 155, h: 14 },
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

function platformsForRound(basePlatforms, round) {
  if (!Array.isArray(basePlatforms) || basePlatforms.length <= 1) return basePlatforms || [];
  const count = basePlatforms.length;
  const shift = ((Math.max(1, round) - 1) % count + count) % count;
  if (shift === 0) return basePlatforms;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const size = basePlatforms[i];
    const slot = basePlatforms[(i + shift) % count];
    out.push({ x: slot.x, y: slot.y, w: size.w, h: size.h });
  }
  return out;
}

function currentPlatforms() {
  return platformsForRound(currentLevel().platforms, localState.round).map((plat) => ({
    ...plat,
    y: plat.y - PLATFORM_RAISE_PX,
  }));
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
const CHARACTER_OPTIONS = [
  { id: "knight", label: "Knight", enabled: true },
  { id: "dragon", label: "Dragon", enabled: true },
  { id: "funus", label: "Funus", enabled: true },
  { id: "locked-3", label: "Coming soon", enabled: false },
  { id: "locked-4", label: "Coming soon", enabled: false },
  { id: "locked-5", label: "Coming soon", enabled: false },
];
const WEAPON_OPTIONS = [
  { id: "sword", label: "Sword", enabled: true },
  { id: "staff", label: "Staff", enabled: true },
  { id: "locked-2", label: "Coming soon", enabled: false },
  { id: "locked-3", label: "Coming soon", enabled: false },
  { id: "locked-4", label: "Coming soon", enabled: false },
  { id: "locked-5", label: "Coming soon", enabled: false },
];
const selectedLoadouts = [
  { character: "knight", weapon: "sword" },
  { character: "knight", weapon: "sword" },
];
const selectedOnlineLoadout = { character: "knight", weapon: "sword" };
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
    dragonRunStartedAt: 0,
    dragonWasRunning: false,
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
    dragonRunStartedAt: 0,
    dragonWasRunning: false,
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
      cardLoadout: [],
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
      cardLoadout: [],
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
const arcadeCardEl = document.getElementById("arcadeCard");
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

const screenShakeState = {
  until: 0,
  amplitude: 0,
};

function triggerScreenShake(durationMs = GROUND_POUND_SHAKE_MS, amplitude = GROUND_POUND_SHAKE_AMPLITUDE) {
  const now = performance.now();
  screenShakeState.until = Math.max(screenShakeState.until, now + Math.max(0, durationMs));
  screenShakeState.amplitude = Math.max(screenShakeState.amplitude, Math.max(0, amplitude));
}

function screenShakeOffset() {
  const now = performance.now();
  if (now >= screenShakeState.until || screenShakeState.amplitude <= 0) {
    screenShakeState.amplitude = 0;
    return { x: 0, y: 0 };
  }
  const remaining = Math.max(0, (screenShakeState.until - now) / Math.max(1, GROUND_POUND_SHAKE_MS));
  const amp = screenShakeState.amplitude * remaining;
  const t = now * 0.095;
  return {
    x: Math.sin(t * 1.8) * amp,
    y: Math.cos(t * 2.3) * amp * 0.65,
  };
}

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
  arcadeActionsEl.classList.remove("arcade-actions--char-pick");
  arcadeCardEl?.classList.remove("arcade-card--wide");
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
  arcadeCardEl?.classList.remove("arcade-card--wide");

  if (step === "character_p1") {
    renderLoadoutSelectScreen("character", 0);
    return;
  }
  if (step === "weapon_p1") {
    renderLoadoutSelectScreen("weapon", 0);
    return;
  }
  if (step === "character_p2") {
    renderLoadoutSelectScreen("character", 1);
    return;
  }
  if (step === "weapon_p2") {
    renderLoadoutSelectScreen("weapon", 1);
    return;
  }
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
      text: "First choose how you want to play. Character and weapon picks come next.",
      actions: [
        { id: "single", label: "1 Player" },
        { id: "multi", label: "Local" },
        { id: "online", label: "Online" },
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
  const idx = p.color === "#2f7dff" ? 0 : 1;
  const weapon = selectedWeaponForPlayer(idx, p);
  const hx = Math.floor(p.x + PLAYER_BODY_W * 0.5);
  const hy = Math.floor(baseY + 24);
  const reach = MELEE_RANGE * (p.meleeRangeScale != null ? p.meleeRangeScale : 1) + 10;
  const active = swingT > 0.12 && swingT < 0.62;
  const steps = Math.ceil(reach / 3);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (weapon === "staff" && staffSlap?.frames?.length >= STAFF_SWING_FRAMES) {
    const animT = clamp(swingT * STAFF_SWING_ANIM_SPEED, 0, 0.999);
    const frameIdx = Math.min(STAFF_SWING_FRAMES - 1, Math.floor(animT * STAFF_SWING_FRAMES));
    const bl = staffSlap.frames[frameIdx];
    const s = ((72 / Math.max(1, bl.cw)) / 1.5) * 1.5;
    const w = bl.cw * s;
    const h = bl.ch * s;
    const handX = hx + fac * 22;
    const handY = Math.floor(baseY + 20);
    ctx.save();
    ctx.translate(handX, handY);
    ctx.scale(fac, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -8 - w * 0.1, -h * 0.5, w, h);
    ctx.restore();
  } else if (meleeSwordBlit) {
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
  if (active && weapon !== "staff") {
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

function dragonRunInputDirection(idx, p, v) {
  if (mode === "online") {
    if (idx === playerIndex) {
      const ok = onlineK();
      const left = keys.has(ok.left) || touchState.left;
      const right = keys.has(ok.right) || touchState.right;
      if (left !== right) return left ? -1 : 1;
      if (Math.abs(p.vx || 0) > 0.1) return Math.sign(p.vx);
      return 0;
    }
    if (v.prevDrawX == null || Math.abs(p.x - v.prevDrawX) <= 0.2) return 0;
    return Math.sign(p.x - v.prevDrawX);
  }

  if (idx === 0 || mode === "multi") {
    const b = idx === 0 ? keyBindings.p0 : keyBindings.p1;
    const left = keys.has(b.left) || (idx === 0 && touchState.left);
    const right = keys.has(b.right) || (idx === 0 && touchState.right);
    if (left !== right) return left ? -1 : 1;
    if (Math.abs(p.vx || 0) > 0.1) return Math.sign(p.vx);
    return 0;
  }

  return Math.abs(p.vx || 0) > 0.1 ? Math.sign(p.vx) : 0;
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
  const frozen = (p.freezeRootUntil || 0) > now;
  const poisoned = (p.poisonUntil || 0) > now;
  const burning = (p.burnUntil || 0) > now;
  const freezeVibeX = frozen ? Math.round(Math.sin(now * 0.12) * FROZEN_VIBRATE_PX) : 0;
  const freezeVibeY = frozen ? Math.round(Math.cos(now * 0.17) * (FROZEN_VIBRATE_PX * 0.5)) : 0;

  const baseY = p.y !== undefined && p.y !== null ? p.y : FLOOR_Y - PLAYER_BODY_H;
  const px = Math.floor(p.x);
  const py = Math.floor(baseY);
  const characterId = selectedCharacterForRender(idx);

  if (characterId === "dragon" && dragonIdleBlit) {
    const runDir = dragonRunInputDirection(idx, p, v);
    const movingH = runDir !== 0;
    const dragonFacing = movingH ? runDir : p.facing || 1;
    if (movingH && !v.dragonWasRunning) {
      v.dragonRunStartedAt = performance.now();
    } else if (!movingH) {
      v.dragonRunStartedAt = 0;
    }
    v.dragonWasRunning = movingH;
    const useRun = dragonRun != null && dragonRun.frames.length >= 4 && movingH;
    const bl = useRun
      ? (() => {
          const f = dragonRun.frames;
          const elapsed = performance.now() - (v.dragonRunStartedAt || performance.now());
          const fi = Math.floor(elapsed * 0.012) % f.length;
          const fr = f[fi];
          return { canvas: fr.canvas, cx: fr.cx, cy: fr.cy, cw: fr.cw, ch: fr.ch };
        })()
      : dragonIdleBlit;
    const s = Math.min((PLAYER_BODY_W * 1.14) / bl.cw, (PLAYER_BODY_H * 1.04) / bl.ch);
    const dw = bl.cw * s;
    const dh = bl.ch * s;
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1) + freezeVibeX;
    const footY = baseY + PLAYER_BODY_H + freezeVibeY;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x + freezeVibeX, baseY + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.translate(footX, footY);
    ctx.scale(dragonFacing, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -dw / 2, -dh, dw, dh);
    ctx.restore();
  } else if (characterId === "funus" && funusIdleBlit) {
    const runDir = dragonRunInputDirection(idx, p, v);
    const movingH = runDir !== 0;
    const funusFacing = movingH ? runDir : p.facing || 1;
    if (movingH && !v.dragonWasRunning) {
      v.dragonRunStartedAt = performance.now();
    } else if (!movingH) {
      v.dragonRunStartedAt = 0;
    }
    v.dragonWasRunning = movingH;
    const useRun = funusRun != null && funusRun.frames.length >= 3 && movingH;
    const bl = useRun
      ? (() => {
          const f = funusRun.frames;
          const elapsed = performance.now() - (v.dragonRunStartedAt || performance.now());
          const fi = Math.floor(elapsed * 0.012) % f.length;
          const fr = f[fi];
          return { canvas: fr.canvas, cx: fr.cx, cy: fr.cy, cw: fr.cw, ch: fr.ch };
        })()
      : funusIdleBlit;
    const s = Math.min((PLAYER_BODY_W * 1.02) / bl.cw, (PLAYER_BODY_H * 1.02) / bl.ch);
    const dw = bl.cw * s;
    const dh = bl.ch * s;
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1) + freezeVibeX;
    const footY = baseY + PLAYER_BODY_H + freezeVibeY;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x + freezeVibeX, baseY + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.translate(footX, footY);
    ctx.scale(funusFacing, 1);
    ctx.drawImage(bl.canvas, bl.cx, bl.cy, bl.cw, bl.ch, -dw / 2, -dh, dw, dh);
    ctx.restore();
  } else if (idx === 0 && percivalIdleBlit) {
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
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1) + freezeVibeX;
    const footY = baseY + PLAYER_BODY_H + freezeVibeY;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil && !useHit) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x + freezeVibeX, baseY + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
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
    const footX = p.x + PLAYER_BODY_W / 2 - recoil * 4 * (p.facing || 1) + freezeVibeX;
    const footY = baseY + PLAYER_BODY_H + freezeVibeY;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (recoil && !useHit) {
      ctx.fillStyle = "rgba(255, 60, 60, 0.22)";
      ctx.fillRect(p.x + freezeVibeX, baseY + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
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
    ctx.fillRect(px - 2 + freezeVibeX, py - 2 + freezeVibeY, PLAYER_BODY_W + 4, PLAYER_BODY_H + 4);
    ctx.fillStyle = body;
    ctx.fillRect(px + freezeVibeX, py + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    if (recoil) {
      ctx.fillStyle = "rgba(255,60,60,0.35)";
      ctx.fillRect(px + freezeVibeX, py + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    }
    ctx.restore();
  }

  if (poisoned) {
    const pulse = 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(now * 0.03));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = `rgba(56, 214, 92, ${pulse.toFixed(3)})`;
    ctx.fillRect(px + freezeVibeX, py + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    ctx.restore();
  }
  if (burning) {
    const pulse = 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(now * 0.045));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255, 55, 40, ${pulse.toFixed(3)})`;
    ctx.fillRect(px + freezeVibeX, py + freezeVibeY, PLAYER_BODY_W, PLAYER_BODY_H);
    ctx.fillStyle = `rgba(255, 160, 60, ${(pulse * 0.55).toFixed(3)})`;
    ctx.fillRect(px + freezeVibeX, py + freezeVibeY + 4, PLAYER_BODY_W, Math.max(8, PLAYER_BODY_H - 8));
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

function playerAmmoMax(p) {
  return Math.max(1, p.maxAmmo != null ? p.maxAmmo : ORB_AMMO_PER_ROUND);
}

function playerOrbAmmoDisplay(p) {
  if (mode === "online") return null;
  return clamp(p.orbAmmo != null ? p.orbAmmo : playerAmmoMax(p), 0, playerAmmoMax(p));
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
  if ((s.dormantUntil || 0) > Date.now()) return;
  if (s.trapSeedSpot) {
    const x = Math.floor(s.x);
    const y = Math.floor(s.y);
    const w = Math.max(6, Math.ceil(s.w || TRAP_SEED_SPOT_W));
    const h = Math.max(4, Math.ceil(s.h || TRAP_SEED_SPOT_H));
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.014);
    const ring = 2 + Math.round((1 - pulse) * 3);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // High-contrast warning halo so trap location is obvious on any stage.
    ctx.fillStyle = `rgba(255, 72, 72, ${0.35 * pulse})`;
    ctx.fillRect(x - ring, y - ring, w + ring * 2, h + ring * 2);
    ctx.strokeStyle = "#ffea4d";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#27b84f";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#d7ff7f";
    ctx.fillRect(x + 1, y + 1, w - 2, 2);
    // Center warning marker.
    const cx = x + Math.floor(w / 2);
    const cy = y + Math.floor(h / 2);
    ctx.fillStyle = "#1b2b1d";
    ctx.fillRect(cx - 1, cy - 1, 3, 3);
    ctx.restore();
    return;
  }
  if (s.fireBurst) {
    const x = Math.floor(s.x);
    const y = Math.floor(s.y);
    const w = Math.max(4, Math.ceil(s.w));
    const h = Math.max(4, Math.ceil(s.h));
    const spawnedAt = s.spawnedAt || Date.now();
    if (fireBurstAnim?.frames?.length) {
      const fi = Math.floor((Date.now() - spawnedAt) / FIRE_BURST_FRAME_MS) % fireBurstAnim.frames.length;
      const fr = fireBurstAnim.frames[fi];
      const dw = Math.max(8, Math.round(w * 2.2));
      const dh = Math.max(10, Math.round(h * 3.8));
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(fr.canvas, fr.cx, fr.cy, fr.cw, fr.ch, Math.floor(dx), Math.floor(dy), dw, dh);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255, 220, 80, 0.9)";
    ctx.fillRect(x - 2, y - 1, w + 4, h + 2);
    ctx.fillStyle = "rgba(255, 90, 30, 0.95)";
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return;
  }
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
  if (s.freezeTriangleUntil && Date.now() < s.freezeTriangleUntil) {
    const dir = s.vx >= 0 ? 1 : -1;
    const tipX = x + (dir > 0 ? w + 18 : -18);
    const midY = y + Math.floor(h / 2);
    const baseX = x + (dir > 0 ? w + 6 : -6);
    const halfH = Math.max(6, Math.floor(h * 1.05));
    ctx.beginPath();
    ctx.moveTo(tipX, midY);
    ctx.lineTo(baseX, midY - halfH);
    ctx.lineTo(baseX, midY + halfH);
    ctx.closePath();
    ctx.fillStyle = "#3eb5ff";
    ctx.fill();
    ctx.strokeStyle = "#bde9ff";
    ctx.lineWidth = 1;
    ctx.stroke();
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
      if (Date.now() >= roundLockUntil && !playerInEnemyFire(0)) {
        const p0 = localState.players[0];
        const a0 = p0.orbAmmo != null ? p0.orbAmmo : playerAmmoMax(p0);
        if (a0 > 0) {
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
      socket.emit("match:input", onlineInputPayload(null, controls));
    }
    if (touchState.attack && !touchState.prevAttack && !onlineIntermissionActive() && !playerInEnemyFire(playerIndex)) {
      if (triggerSwing(playerIndex)) socket.emit("match:input", onlineInputPayload("melee", controls));
    }
    if (touchState.orb && !touchState.prevOrb && !onlineIntermissionActive() && !playerInEnemyFire(playerIndex)) {
      visualState[playerIndex].charging = true;
      visualState[playerIndex].chargeKeyDownAt = Date.now();
      socket.emit("match:input", onlineInputPayload("chargeStart", controls));
    }
    if (!touchState.orb && touchState.prevOrb && !onlineIntermissionActive()) {
      visualState[playerIndex].charging = false;
      triggerSwing(playerIndex);
      socket.emit("match:input", onlineInputPayload("chargeRelease", controls));
    }
    if (touchState.fire && !touchState.prevFire && !onlineIntermissionActive() && !playerInEnemyFire(playerIndex)) {
      socket.emit("match:input", onlineInputPayload("fireStart", controls));
    }
    if (!touchState.fire && touchState.prevFire) {
      socket.emit("match:input", onlineInputPayload("fireEnd", controls));
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
  const drawCoverBg = (img, tint = "rgba(8, 12, 20, 0.2)") => {
    if (!img.complete || !img.naturalWidth) return false;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, FLOOR_Y / ih);
    const dw = Math.ceil(iw * scale);
    const dh = Math.ceil(ih * scale);
    const dx = Math.floor((w - dw) / 2);
    const dy = Math.floor((FLOOR_Y - dh) / 2);
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, FLOOR_Y);
    return true;
  };

  if (theme === "castle" && drawCoverBg(castlePlatformBgImage, "rgba(8, 12, 20, 0.22)")) {
    // Rendered from imported image.
  } else if (theme === "waterfall" && drawCoverBg(waterfallBgImage, "rgba(6, 16, 22, 0.16)")) {
    // Rendered from imported image.
  } else if (theme === "forest" && drawCoverBg(forestBgImage, "rgba(8, 20, 16, 0.22)")) {
    // Rendered from imported image.
  } else if (theme === "castleWide" && drawCoverBg(castleWideBgImage, "rgba(10, 14, 20, 0.2)")) {
    // Rendered from imported image.
  } else if (theme === "sunny") {
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
  const heldMs = Math.max(0, Date.now() - (p.fireStartAt || Date.now()));
  const rawScale = 1 + Math.floor(heldMs / FIRE_BREATH_TICK_MS) * FIRE_BREATH_GROWTH_PER_TICK;
  const scale = Math.min(rawScale, FIRE_BREATH_MAX_SCALE);
  const range = FIRE_BREATH_RANGE * scale;
  const height = FIRE_BREATH_H * scale;
  const x = fac > 0 ? p.x + PLAYER_BODY_W : p.x - range;
  return {
    x,
    y: baseY + Math.floor(PLAYER_BODY_H * 0.42) - height / 2,
    w: range,
    h: height,
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
  const img = p.facing >= 0 ? fireBreathRightImage : fireBreathLeftImage;
  const pulse = 1 + 0.06 * Math.sin(performance.now() * 0.035);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = "lighter";
  if (fireBurstAnim?.frames?.length) {
    const fi = Math.floor(held / FIRE_BURST_FRAME_MS) % fireBurstAnim.frames.length;
    const fr = fireBurstAnim.frames[fi];
    const flameW = Math.max(14, Math.round(r.w * 0.88));
    const flameH = Math.max(18, Math.round(r.h * 2.1 * pulse));
    const jitter = Math.sin(held * 0.026) * 2;
    const x = p.facing >= 0 ? r.x - 3 : r.x + r.w - flameW + 3;
    const y = r.y + r.h / 2 - flameH / 2 + jitter;
    const cx = x + flameW / 2;
    const cy = y + flameH / 2;
    const baseRot = p.facing >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    const wobble = Math.sin(held * 0.012) * 0.08;
    ctx.translate(Math.floor(cx), Math.floor(cy));
    ctx.rotate(baseRot + wobble);
    ctx.drawImage(fr.canvas, fr.cx, fr.cy, fr.cw, fr.ch, Math.floor(-flameW / 2), Math.floor(-flameH / 2), flameW, flameH);
  } else if (img.complete && img.naturalWidth) {
    const frameW = Math.floor(img.naturalWidth / FIRE_BREATH_FRAME_COUNT);
    const frame = Math.floor(held / FIRE_BREATH_FRAME_MS) % FIRE_BREATH_FRAME_COUNT;
    const h = Math.round(r.h * 2.4 * pulse);
    const w = Math.round(r.w * 1.22);
    const jitter = Math.sin(held * 0.026) * 2;
    const x = p.facing >= 0 ? r.x - 3 : r.x + r.w - w + 3;
    const y = r.y + r.h / 2 - h / 2 + jitter;
    ctx.drawImage(img, frame * frameW, 0, frameW, img.naturalHeight, Math.floor(x), Math.floor(y), w, h);
  } else {
    ctx.fillStyle = "rgba(255, 86, 22, 0.78)";
    ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.ceil(r.w), Math.ceil(r.h));
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
  const idx = attacker.color === "#2f7dff" ? 0 : 1;
  if (selectedWeaponForPlayer(idx, attacker) === "staff") {
    const mrs = attacker.meleeRangeScale != null ? attacker.meleeRangeScale : 1;
    const bladeL = MELEE_RANGE * mrs;
    const y0 = baseY + 10;
    if (fac > 0) return { x: hx + 2, y: y0, w: bladeL, h: 28 };
    return { x: hx - 2 - bladeL, y: y0, w: bladeL, h: 28 };
  }
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
      const hp = playerMaxHp(at);
      const secondWindActive = hp > 0 && (at.health ?? hp) / hp <= SECOND_WIND_HP_THRESHOLD;
      const secondWindTier = at.secondWindTier || 1;
      const secondWindMult = secondWindActive
        ? 1 + SECOND_WIND_DAMAGE_BONUS + Math.max(0, secondWindTier - 1) * SECOND_WIND_STACK_BONUS
        : 1;
      const weaponStats = weaponStatsForId(selectedWeaponForPlayer(ai, at));
      let dmg = Math.round(weaponStats.damage * mult * secondWindMult);
      if (ai === 0 && cheatBlueMeleeBurstHits > 0) {
        dmg = CHEAT_BLUE_MELEE_BURST_DAMAGE;
        cheatBlueMeleeBurstHits -= 1;
      }
      if (at.echoSlash) {
        const echoTier = at.echoSlashTier || 1;
        const echoFrac = ECHO_SLASH_BONUS_FRAC + Math.max(0, echoTier - 1) * ECHO_SLASH_STACK_BONUS_FRAC;
        dmg += Math.max(1, Math.round(weaponStats.damage * mult * echoFrac));
      }
      def.health = clamp(def.health - dmg, 0, playerMaxHp(def));
      if (at.vampSlash) {
        const vampTier = at.vampSlashTier || 1;
        const healFrac = VAMP_SLASH_HEAL_FRAC + Math.max(0, vampTier - 1) * VAMP_SLASH_STACK_BONUS;
        at.health = clamp((at.health || 0) + Math.max(1, Math.round(dmg * healFrac)), 0, playerMaxHp(at));
      }
      if (at.poisonSword) {
        def.poisonUntil = Math.max(def.poisonUntil || 0, tNow + POISON_DURATION_MS);
        def.poisonNextTickAt = tNow + POISON_TICK_MS;
        const tier = at.poisonSwordTier != null ? at.poisonSwordTier : 1;
        def.poisonTickDamage = POISON_TICK_DAMAGE + Math.max(0, tier - 1);
      }
      if (at.trapSeed) {
        const usesLeft = Number.isFinite(at.trapSeedUsesLeft) ? at.trapSeedUsesLeft : 0;
        if (usesLeft <= 0) continue;
        at.trapSeedUsesLeft = usesLeft - 1;
        const tier = at.trapSeedTier || 1;
        const durMs = TRAP_SEED_SPOT_DURATION_MS + Math.max(0, tier - 1) * 1500;
        const spotY = Math.floor(getPlayerBaseY(def) + PLAYER_BODY_H - TRAP_SEED_SPOT_H);
        localState.projectiles.push({
          trapSeedSpot: true,
          spawnedAt: tNow,
          expiresAt: tNow + durMs,
          x: Math.floor(def.x + (PLAYER_BODY_W - TRAP_SEED_SPOT_W) / 2),
          y: spotY,
          w: TRAP_SEED_SPOT_W,
          h: TRAP_SEED_SPOT_H,
          vx: 0,
          vy: 0,
          target: dIdx,
          damage: 0,
        });
      }
      def.vx = (def.x >= at.x ? 1 : -1) * weaponStats.knockback;
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
        const tierBonus = ((at.fireBreathTier || 1) - 1) * 2;
        const dmg = FIRE_BREATH_BASE_DAMAGE + Math.floor(heldMs / 1000) + tierBonus;
        def.health = clamp(def.health - dmg, 0, playerMaxHp(def));
      }
      at.fireNextDamageAt += FIRE_BREATH_TICK_MS;
    }
  }
}

function processPoisonDamage() {
  const now = Date.now();
  for (const p of localState.players) {
    if (!p || (p.poisonUntil || 0) <= now) continue;
    if (!p.poisonNextTickAt || p.poisonNextTickAt < now - POISON_TICK_MS * 3) {
      p.poisonNextTickAt = now;
    }
    while (p.poisonNextTickAt <= now && p.poisonNextTickAt <= (p.poisonUntil || 0)) {
      const tickDmg = p.poisonTickDamage != null ? p.poisonTickDamage : POISON_TICK_DAMAGE;
      p.health = clamp(p.health - tickDmg, 0, playerMaxHp(p));
      p.poisonNextTickAt += POISON_TICK_MS;
    }
  }
}

function applyBurnToPlayer(p, now = Date.now()) {
  if (!p) return;
  p.burnUntil = Math.max(p.burnUntil || 0, now + BURN_DURATION_MS);
  p.burnNextTickAt = now + BURN_TICK_MS;
}

function processBurnDamage() {
  const now = Date.now();
  for (const p of localState.players) {
    if (!p || (p.burnUntil || 0) <= now) continue;
    if (!p.burnNextTickAt || p.burnNextTickAt < now - BURN_TICK_MS * 3) {
      p.burnNextTickAt = now;
    }
    while (p.burnNextTickAt <= now && p.burnNextTickAt <= (p.burnUntil || 0)) {
      p.health = clamp(p.health - BURN_TICK_DAMAGE, 0, playerMaxHp(p));
      p.burnNextTickAt += BURN_TICK_MS;
    }
  }
}

function spawnFireBreathBurst(attackerIdx) {
  if (Date.now() < roundLockUntil) return;
  const attacker = localState.players[attackerIdx];
  if (!attacker?.fireBreath || !isDragonCharacterForPlayer(attackerIdx)) return;
  const fac = attacker.facing >= 0 ? 1 : -1;
  const baseY = getPlayerBaseY(attacker);
  const cy = baseY + Math.floor(PLAYER_BODY_H * 0.42) - FIRE_BURST_H / 2;
  const baseX = fac > 0 ? attacker.x + PLAYER_BODY_W : attacker.x - FIRE_BURST_W;
  localState.projectiles.push({
    fireBurst: true,
    spawnedAt: Date.now(),
    x: baseX,
    y: cy,
    w: FIRE_BURST_W,
    h: FIRE_BURST_H,
    vx: fac * FIRE_BURST_SPEED,
    vy: 0,
    target: attackerIdx === 0 ? 1 : 0,
    damage: FIRE_BURST_HIT_DAMAGE,
    freezeTriangleUntil: 0,
    freezeRootMs: 0,
  });
}

function tryJump(idx, code) {
  const p = localState.players[idx];
  if ((p.freezeRootUntil || 0) > Date.now()) return;
  const now = performance.now();
  const prev = keyTimes.get(code) || 0;
  keyTimes.set(code, now);
  const boosted = now - prev < 260;
  const jumpMult = visualState[idx].charging ? CHARGE_JUMP_HEIGHT_MULT : 1;
  if (p.infiniteJumps) {
    const jm = 1 + 0.06 * (p.skyJumpStacks || 0);
    p.vy = JUMP_VELOCITY * jm * (boosted ? 1.12 : 1) * jumpMult;
    p.onGround = false;
    p.jumpsUsed = Math.min(p.jumpsUsed + 1, 9);
    return;
  }
  if (p.onGround || p.jumpsUsed < 2) {
    p.vy = JUMP_VELOCITY * (boosted ? 1.12 : 1) * jumpMult;
    p.onGround = false;
    p.jumpsUsed += 1;
  }
}

function doMelee(attackerIdx) {
  if (playerInEnemyFire(attackerIdx)) return false;
  const attacker = localState.players[attackerIdx];
  const t0 = Date.now();
  const weaponStats = weaponStatsForId(selectedWeaponForPlayer(attackerIdx, attacker));
  const cdMult = attacker.meleeCooldownMult != null ? attacker.meleeCooldownMult : 1;
  const cooldownMs = Math.max(MIN_MELEE_COOLDOWN_MS, Math.round(weaponStats.cooldownMs * cdMult));
  const v = visualState[attackerIdx];
  if (cooldownMs > 0 && t0 < (v.nextMeleeAt || 0)) return false;
  const dur = Math.round(weaponStats.swingDurationMs * (attacker.meleeSwingScale != null ? attacker.meleeSwingScale : 1));
  visualState[attackerIdx].attackStartAt = t0;
  visualState[attackerIdx].attackUntil = t0 + dur;
  visualState[attackerIdx].swingDurationMs = dur;
  visualState[attackerIdx].meleeDealt = false;
  visualState[attackerIdx].nextMeleeAt = t0 + (weaponStats.id === "staff" ? dur + cooldownMs : cooldownMs);
  return true;
}

function triggerSwing(idx) {
  const p = localState.players[idx];
  const t0 = Date.now();
  const weaponStats = weaponStatsForId(selectedWeaponForPlayer(idx, p));
  const cdMult = p.meleeCooldownMult != null ? p.meleeCooldownMult : 1;
  const cooldownMs = Math.max(MIN_MELEE_COOLDOWN_MS, Math.round(weaponStats.cooldownMs * cdMult));
  const v = visualState[idx];
  if (cooldownMs > 0 && t0 < (v.nextMeleeAt || 0)) return false;
  const dur = Math.round(weaponStats.swingDurationMs * (p.meleeSwingScale != null ? p.meleeSwingScale : 1));
  visualState[idx].attackStartAt = t0;
  visualState[idx].attackUntil = t0 + dur;
  visualState[idx].swingDurationMs = dur;
  visualState[idx].meleeDealt = false;
  visualState[idx].nextMeleeAt = t0 + (weaponStats.id === "staff" ? dur + cooldownMs : cooldownMs);
  return true;
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
  if (playerInEnemyFire(attackerIdx)) return;
  const attacker = localState.players[attackerIdx];
  const orbCost = 1;
  const ammoMax = playerAmmoMax(attacker);
  const ammo = attacker.orbAmmo != null ? attacker.orbAmmo : ammoMax;
  if (ammo < orbCost) return;
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
  const hp = playerMaxHp(attacker);
  const secondWindActive = hp > 0 && (attacker.health ?? hp) / hp <= SECOND_WIND_HP_THRESHOLD;
  const secondWindTier = attacker.secondWindTier || 1;
  const secondWindMult = secondWindActive
    ? 1 + SECOND_WIND_DAMAGE_BONUS + Math.max(0, secondWindTier - 1) * SECOND_WIND_STACK_BONUS
    : 1;
  const instBonus = attacker.instantMaxCharge ? attacker.instantChargeBonusDmg || 0 : 0;
  const dmg = Math.round(damage * mult * secondWindMult) + instBonus;
  const freezeBonus = attacker.freezeRootBonusMs || 0;
  const freezeTriangleUntil = attacker.freezeShot ? Date.now() + FREEZE_HIT_ROOT_MS + freezeBonus : 0;
  const freezeRootMs = attacker.freezeShot ? FREEZE_HIT_ROOT_MS + freezeBonus : 0;
  const cy = attacker.y + Math.floor(PLAYER_BODY_H * 0.42) + (6 - h) / 2;
  const baseX = attacker.x + Math.floor(PLAYER_BODY_W * 0.62) + 2;
  const target = attackerIdx === 0 ? 1 : 0;
  const pushShot = (vx, vy, xOffset = 0, delayMs = 0) => {
    localState.projectiles.push({
      x: baseX + xOffset,
      y: cy,
      w,
      h,
      vx,
      vy: vy ?? 0,
      target,
      damage: dmg,
      freezeTriangleUntil,
      freezeRootMs,
      ricochetLeft: attacker.ricochetOrb ? 1 + Math.max(0, (attacker.ricochetOrbTier || 1) - 1) : 0,
      dormantUntil: delayMs > 0 ? Date.now() + delayMs : 0,
    });
  };
  const burstCount = Math.max(1, attacker.burstCount || 1);
  for (let i = 0; i < burstCount; i += 1) {
    pushShot(attacker.facing * speed, 0, 0, i * 70);
  }
  if (attacker.freezeShot) {
    const dir = attacker.facing >= 0 ? 1 : -1;
    pushShot(attacker.facing * speed, 0, -dir * FREEZE_TRAIL_ORB_OFFSET);
  }
  attacker.orbAmmo = ammo - orbCost;
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
    delete p.burstCount;
    delete p.damageMult;
    delete p.infiniteJumps;
    delete p.infiniteAmmo;
    delete p.maxAmmo;
    delete p.instantMaxCharge;
    delete p.meleeRangeScale;
    delete p.meleeSwingScale;
    delete p.fireBreath;
    delete p.fireBreathing;
    delete p.freezeShot;
    delete p.groundPound;
    delete p.teleport;
    delete p.poisonSword;
    delete p.groundPoundUsesLeft;
    delete p.teleportUsesLeft;
    delete p.freezeRootUntil;
    delete p.fireStartAt;
    delete p.fireNextDamageAt;
    delete p.fireCooldownUntil;
    delete p.poisonUntil;
    delete p.poisonNextTickAt;
    delete p.poisonTickDamage;
    delete p.burnUntil;
    delete p.burnNextTickAt;
    delete p.fireBreathTier;
    delete p.freezeRootBonusMs;
    delete p.poisonSwordTier;
    delete p.instantChargeBonusDmg;
    delete p.tripleDamageBonus;
    delete p.skyJumpStacks;
    delete p.groundPoundStack;
    delete p.teleportStack;
    delete p.vampSlash;
    delete p.vampSlashTier;
    delete p.heavyLanding;
    delete p.heavyLandingTier;
    delete p.secondWind;
    delete p.secondWindTier;
    delete p.ricochetOrb;
    delete p.ricochetOrbTier;
    delete p.trapSeed;
    delete p.trapSeedTier;
    delete p.trapSeedUsesLeft;
    delete p.echoSlash;
    delete p.echoSlashTier;
    delete p.fungalBloomTier;
    delete p.sporeDashTier;
    delete p.thornSkinTier;
    delete p.rootPrisonTier;
    delete p.toxicBurstTier;
    delete p.adrenalBiteTier;
    delete p.adrenalBiteUntil;
    delete p.orbLeechTier;
    delete p.chainRotTier;
    delete p.phaseStepTier;
    delete p.gravityWellTier;
    delete p.overgrowthArmorTier;
    delete p.overgrowthStillAt;
    delete p.bloodPactTier;
    delete p.reboundGuardTier;
    delete p.ambushSeedTier;
    delete p.echoOrbTier;
    delete p.echoOrbCounter;
    delete p.predatorInstinctTier;
    delete p.manaBatteryTier;
    delete p.windCutTier;
    delete p.snapFreezeTier;
    delete p.lastStandTier;
    delete p.lastStandUsedRound;
    delete p.cardLoadout;
    delete p.meleeCooldownMult;
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

let fireBindState = { active: false, playerIdx: 0, online: false, onDone: null };
let groundPoundBindState = { active: false, playerIdx: 0, online: false, onDone: null };
let teleportBindState = { active: false, playerIdx: 0, online: false, onDone: null };

function finishFireBreathKeyBind() {
  const done = fireBindState.onDone;
  fireBindState = { active: false, playerIdx: 0, online: false, onDone: null };
  window.removeEventListener("keydown", onFireBreathBindKeydown, true);
  hideArcadeOverlay();
  if (typeof done === "function") done();
}

function renderFireBreathBindPrompt(message = "") {
  arcadeStep = "fire_bind";
  teardownRemapWizard();
  clearArcadeExtra();
  arcadeActionsEl.classList.remove("arcade-actions--char-pick");
  stepLabelEl.textContent = "Fire Breath";
  arcadeTitleEl.textContent = "Map Fire Breath";
  arcadeTextEl.textContent =
    "Press the key you want to hold for Fire Breath. The round is paused until you choose a key.";
  arcadeActionsEl.innerHTML = "";
  if (arcadeExtraEl) {
    arcadeExtraEl.innerHTML = message
      ? `<p class="bind-hint">${escapeHtml(message)}</p>`
      : `<p class="bind-muted">Press any key—even one you already use for move, jump, melee, or orb.</p>`;
  }
  overlayEl.classList.remove("hidden");
}

function startFireBreathKeyBind(playerIdx, online = false, onDone = null) {
  if (touchState.enabled) {
    if (typeof onDone === "function") onDone();
    return;
  }
  if (fireBindState.active || groundPoundBindState.active || teleportBindState.active) return;
  fireBindState = { active: true, playerIdx, online, onDone };
  renderFireBreathBindPrompt();
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
  showBanner(`Fire Breath mapped to ${formatKeyLabel(code)}`, 2200);
  finishFireBreathKeyBind();
}

function finishGroundPoundKeyBind() {
  const done = groundPoundBindState.onDone;
  groundPoundBindState = { active: false, playerIdx: 0, online: false, onDone: null };
  window.removeEventListener("keydown", onGroundPoundBindKeydown, true);
  hideArcadeOverlay();
  if (typeof done === "function") done();
}

function renderGroundPoundBindPrompt(message = "") {
  arcadeStep = "ground_pound_bind";
  teardownRemapWizard();
  clearArcadeExtra();
  arcadeActionsEl.classList.remove("arcade-actions--char-pick");
  stepLabelEl.textContent = "Ground Pound";
  arcadeTitleEl.textContent = "Map Ground Pound";
  arcadeTextEl.textContent = "Press the key you want to use for Ground Pound. The round is paused until you choose a key.";
  arcadeActionsEl.innerHTML = "";
  if (arcadeExtraEl) {
    arcadeExtraEl.innerHTML = message
      ? `<p class="bind-hint">${escapeHtml(message)}</p>`
      : `<p class="bind-muted">Press any key—even one you already use for move, jump, melee, orb, or Fire Breath.</p>`;
  }
  overlayEl.classList.remove("hidden");
}

function startGroundPoundKeyBind(playerIdx, online = false, onDone = null) {
  if (touchState.enabled) {
    if (typeof onDone === "function") onDone();
    return;
  }
  if (groundPoundBindState.active || fireBindState.active || teleportBindState.active) return;
  groundPoundBindState = { active: true, playerIdx, online, onDone };
  renderGroundPoundBindPrompt();
  window.addEventListener("keydown", onGroundPoundBindKeydown, true);
}

function onGroundPoundBindKeydown(e) {
  if (!groundPoundBindState.active) return;
  e.preventDefault();
  e.stopPropagation();
  const code = e.code;
  if (!code || code === "Escape") return;
  if (groundPoundBindState.online) {
    keyBindings.online.groundPound = code;
  } else if (groundPoundBindState.playerIdx === 0) {
    keyBindings.p0.groundPound = code;
  } else {
    keyBindings.p1.groundPound = code;
  }
  saveKeyBindings();
  showBanner(`Ground Pound mapped to ${formatKeyLabel(code)}`, 2200);
  finishGroundPoundKeyBind();
}

function groundedLayerY(p) {
  if (!p?.onGround) return null;
  return Math.round(getPlayerBaseY(p) + PLAYER_BODY_H);
}

function triggerGroundPoundLocal(attackerIdx) {
  if (Date.now() < roundLockUntil) return false;
  if (playerInEnemyFire(attackerIdx)) return false;
  const attacker = localState.players[attackerIdx];
  if (!attacker?.groundPound) return false;
  const usesLeft = Number.isFinite(attacker.groundPoundUsesLeft) ? attacker.groundPoundUsesLeft : 0;
  if (usesLeft <= 0) return false;
  attacker.groundPoundUsesLeft = usesLeft - 1;
  triggerScreenShake();
  const defender = localState.players[1 - attackerIdx];
  const atkLayer = groundedLayerY(attacker);
  const defLayer = groundedLayerY(defender);
  if (atkLayer == null || defLayer == null || Math.abs(atkLayer - defLayer) > GROUND_POUND_LAYER_EPSILON) {
    return true;
  }
  const dmg = Math.max(1, Math.round(playerMaxHp(defender) * GROUND_POUND_DAMAGE_FRACTION));
  defender.health = clamp(defender.health - dmg, 0, playerMaxHp(defender));
  defender.vy = Math.min(defender.vy || 0, GROUND_POUND_LAUNCH_VY);
  defender.freezeRootUntil = Math.max(defender.freezeRootUntil || 0, Date.now() + GROUND_POUND_FREEZE_MS);
  defender.onGround = false;
  defender.jumpsUsed = Math.max(defender.jumpsUsed || 0, 1);
  return true;
}

function finishTeleportKeyBind() {
  const done = teleportBindState.onDone;
  teleportBindState = { active: false, playerIdx: 0, online: false, onDone: null };
  window.removeEventListener("keydown", onTeleportBindKeydown, true);
  hideArcadeOverlay();
  if (typeof done === "function") done();
}

function renderTeleportBindPrompt(message = "") {
  arcadeStep = "teleport_bind";
  teardownRemapWizard();
  clearArcadeExtra();
  arcadeActionsEl.classList.remove("arcade-actions--char-pick");
  stepLabelEl.textContent = "Teleport";
  arcadeTitleEl.textContent = "Map Teleport";
  arcadeTextEl.textContent = "Press the key you want to use for Teleport. The round is paused until you choose a key.";
  arcadeActionsEl.innerHTML = "";
  if (arcadeExtraEl) {
    arcadeExtraEl.innerHTML = message
      ? `<p class="bind-hint">${escapeHtml(message)}</p>`
      : `<p class="bind-muted">Press any key—even one you already use for move, jump, melee, orb, Fire Breath, or Ground Pound.</p>`;
  }
  overlayEl.classList.remove("hidden");
}

function startTeleportKeyBind(playerIdx, online = false, onDone = null) {
  if (touchState.enabled) {
    if (typeof onDone === "function") onDone();
    return;
  }
  if (teleportBindState.active || fireBindState.active || groundPoundBindState.active) return;
  teleportBindState = { active: true, playerIdx, online, onDone };
  renderTeleportBindPrompt();
  window.addEventListener("keydown", onTeleportBindKeydown, true);
}

function onTeleportBindKeydown(e) {
  if (!teleportBindState.active) return;
  e.preventDefault();
  e.stopPropagation();
  const code = e.code;
  if (!code || code === "Escape") return;
  if (teleportBindState.online) {
    keyBindings.online.teleport = code;
  } else if (teleportBindState.playerIdx === 0) {
    keyBindings.p0.teleport = code;
  } else {
    keyBindings.p1.teleport = code;
  }
  saveKeyBindings();
  showBanner(`Teleport mapped to ${formatKeyLabel(code)}`, 2200);
  finishTeleportKeyBind();
}

function triggerTeleportLocal(attackerIdx) {
  if (Date.now() < roundLockUntil) return false;
  if (playerInEnemyFire(attackerIdx)) return false;
  const attacker = localState.players[attackerIdx];
  if (!attacker?.teleport) return false;
  const usesLeft = Number.isFinite(attacker.teleportUsesLeft) ? attacker.teleportUsesLeft : 0;
  if (usesLeft <= 0) return false;
  const enemy = localState.players[1 - attackerIdx];
  const dir = enemy.facing || (enemy.x >= attacker.x ? 1 : -1);
  const targetX = clamp(enemy.x - dir * (PLAYER_BODY_W + 10), 0, VIEW_W - PLAYER_BODY_W);
  attacker.teleportUsesLeft = usesLeft - 1;
  attacker.x = targetX;
  attacker.y = enemy.y;
  attacker.vx = 0;
  return true;
}

function startFireBreathLocal(idx) {
  const p = localState.players[idx];
  if (!p?.fireBreath || p.fireBreathing || Date.now() < roundLockUntil) return;
  if (playerInEnemyFire(idx)) return;
  const now = Date.now();
  if ((p.fireCooldownUntil || 0) > now) return;
  p.fireBreathing = true;
  p.fireStartAt = now;
  p.fireNextDamageAt = now;
  p.vx = 0;
}

function stopFireBreathLocal(idx, shootOnRelease = false) {
  const p = localState.players[idx];
  if (!p) return;
  const wasBreathing = !!p.fireBreathing;
  if (wasBreathing) {
    p.fireCooldownUntil = Math.max(p.fireCooldownUntil || 0, Date.now() + FIRE_BREATH_COOLDOWN_MS);
    if (shootOnRelease && mode !== "online") {
      spawnFireBreathBurst(idx);
    }
  }
  p.fireBreathing = false;
}

let buffAutoPickTimer = null;
let buffPickGateTimer = null;
let pendingBuffReplace = null;

function ensurePlayerCardLoadout(p) {
  if (!Array.isArray(p.cardLoadout)) p.cardLoadout = [];
  return p.cardLoadout;
}

function removeBuffEffectsFromPlayer(p, buffId) {
  if (buffId === "triple") {
    delete p.burstCount;
  } else if (buffId === "tank") {
    delete p.maxHealth;
    p.health = clamp(p.health, 0, playerMaxHp(p));
  } else if (buffId === "power") {
    delete p.damageMult;
  } else if (buffId === "infiniteJumps") {
    delete p.infiniteJumps;
    delete p.skyJumpStacks;
  } else if (buffId === "infiniteAmmo") {
    delete p.maxAmmo;
  } else if (buffId === "instantMaxCharge") {
    delete p.instantMaxCharge;
    delete p.instantChargeBonusDmg;
  } else if (buffId === "meleeLong") {
    delete p.meleeRangeScale;
    delete p.meleeSwingScale;
  } else if (buffId === "fireBreath") {
    delete p.fireBreath;
    delete p.fireBreathing;
    delete p.fireBreathTier;
    delete p.fireStartAt;
    delete p.fireNextDamageAt;
    delete p.fireCooldownUntil;
  } else if (buffId === "freeze") {
    delete p.freezeShot;
    delete p.freezeRootBonusMs;
  } else if (buffId === "groundPound") {
    delete p.groundPound;
    delete p.groundPoundUsesLeft;
    delete p.groundPoundStack;
  } else if (buffId === "poisonSword") {
    delete p.poisonSword;
    delete p.poisonSwordTier;
  } else if (buffId === "teleport") {
    delete p.teleport;
    delete p.teleportUsesLeft;
    delete p.teleportStack;
  } else if (buffId === "vampSlash") {
    delete p.vampSlash;
    delete p.vampSlashTier;
  } else if (buffId === "heavyLanding") {
    delete p.heavyLanding;
    delete p.heavyLandingTier;
  } else if (buffId === "secondWind") {
    delete p.secondWind;
    delete p.secondWindTier;
  } else if (buffId === "ricochetOrb") {
    delete p.ricochetOrb;
    delete p.ricochetOrbTier;
  } else if (buffId === "trapSeed") {
    delete p.trapSeed;
    delete p.trapSeedTier;
    delete p.trapSeedUsesLeft;
  } else if (buffId === "echoSlash") {
    delete p.echoSlash;
    delete p.echoSlashTier;
  } else if (buffId === "fungalBloom") {
    delete p.fungalBloomTier;
  } else if (buffId === "sporeDash") {
    delete p.sporeDashTier;
  } else if (buffId === "thornSkin") {
    delete p.thornSkinTier;
  } else if (buffId === "rootPrison") {
    delete p.rootPrisonTier;
  } else if (buffId === "toxicBurst") {
    delete p.toxicBurstTier;
  } else if (buffId === "adrenalBite") {
    delete p.adrenalBiteTier;
    delete p.adrenalBiteUntil;
  } else if (buffId === "orbLeech") {
    delete p.orbLeechTier;
  } else if (buffId === "chainRot") {
    delete p.chainRotTier;
  } else if (buffId === "phaseStep") {
    delete p.phaseStepTier;
  } else if (buffId === "gravityWell") {
    delete p.gravityWellTier;
  } else if (buffId === "overgrowthArmor") {
    delete p.overgrowthArmorTier;
    delete p.overgrowthStillAt;
  } else if (buffId === "bloodPact") {
    delete p.bloodPactTier;
  } else if (buffId === "reboundGuard") {
    delete p.reboundGuardTier;
  } else if (buffId === "ambushSeed") {
    delete p.ambushSeedTier;
  } else if (buffId === "echoOrb") {
    delete p.echoOrbTier;
    delete p.echoOrbCounter;
  } else if (buffId === "predatorInstinct") {
    delete p.predatorInstinctTier;
  } else if (buffId === "manaBattery") {
    delete p.manaBatteryTier;
  } else if (buffId === "windCut") {
    delete p.windCutTier;
  } else if (buffId === "snapFreeze") {
    delete p.snapFreezeTier;
  } else if (buffId === "lastStand") {
    delete p.lastStandTier;
    delete p.lastStandUsedRound;
  }
  delete p.meleeCooldownMult;
}

function buffIcon(id) {
  return BUFF_DEFS[id]?.icon || "🃏";
}

/**
 * First pick applies the buff; picking the same card again upgrades it for the rest of the match.
 * @returns {boolean} false if the pick is invalid (e.g. Fire Breath without Dragon)
 */
function applyOrUpgradeBuffToPlayer(L, loserIdx, buffId, replaceBuffId = null) {
  const loadout = ensurePlayerCardLoadout(L);
  const hadBuff = loadout.includes(buffId);
  if (!hadBuff && loadout.length >= CARD_LOADOUT_MAX) {
    if (!replaceBuffId || !loadout.includes(replaceBuffId) || replaceBuffId === buffId) {
      return { ok: false, reason: "replace_required" };
    }
    removeBuffEffectsFromPlayer(L, replaceBuffId);
    L.cardLoadout = loadout.filter((id) => id !== replaceBuffId);
  }
  if (buffId === "fireBreath") {
    if (!isDragonCharacterForPlayer(loserIdx, L)) return { ok: false, reason: "dragon_only" };
    if (L.fireBreath) {
      L.fireBreathTier = (L.fireBreathTier || 1) + 1;
    } else {
      L.fireBreath = true;
      L.fireBreathTier = 1;
    }
  } else if (buffId === "triple") {
    L.burstCount = Math.max(1, (L.burstCount || 1) + 1);
  } else if (buffId === "tank") {
    const base = L.maxHealth != null && L.maxHealth > 0 ? L.maxHealth : 100;
    L.maxHealth = base + TANK_BUFF_HP_PER_PICK;
  } else if (buffId === "power") {
    const cur = L.damageMult != null && L.damageMult > 0 ? L.damageMult : 1;
    L.damageMult = cur * POWER_BUFF_DAMAGE_MULT;
  } else if (buffId === "infiniteJumps") {
    if (L.infiniteJumps) {
      L.skyJumpStacks = (L.skyJumpStacks || 0) + 1;
    } else {
      L.infiniteJumps = true;
    }
  } else if (buffId === "infiniteAmmo") {
    L.maxAmmo = Math.max(1, (L.maxAmmo || ORB_AMMO_PER_ROUND) + 1);
    L.orbAmmo = Math.min(playerAmmoMax(L), (L.orbAmmo != null ? L.orbAmmo : 0) + 1);
  } else if (buffId === "instantMaxCharge") {
    if (L.instantMaxCharge) {
      L.instantChargeBonusDmg = (L.instantChargeBonusDmg || 0) + 4;
    } else {
      L.instantMaxCharge = true;
    }
  } else if (buffId === "meleeLong") {
    L.meleeRangeScale = (L.meleeRangeScale != null ? L.meleeRangeScale : 1) * 2;
    L.meleeSwingScale = (L.meleeSwingScale != null ? L.meleeSwingScale : 1) * 2;
  } else if (buffId === "freeze") {
    if (L.freezeShot) {
      L.freezeRootBonusMs = (L.freezeRootBonusMs || 0) + 600;
    } else {
      L.freezeShot = true;
    }
  } else if (buffId === "groundPound") {
    if (L.groundPound) {
      L.groundPoundStack = (L.groundPoundStack || 0) + 1;
      L.groundPoundUsesLeft = 2 + (L.groundPoundStack || 0);
    } else {
      L.groundPound = true;
      L.groundPoundStack = 0;
      L.groundPoundUsesLeft = 2;
    }
  } else if (buffId === "teleport") {
    if (L.teleport) {
      L.teleportStack = (L.teleportStack || 0) + 1;
      L.teleportUsesLeft = 1 + (L.teleportStack || 0);
    } else {
      L.teleport = true;
      L.teleportStack = 0;
      L.teleportUsesLeft = 1;
    }
  } else if (buffId === "poisonSword") {
    if (L.poisonSword) {
      L.poisonSwordTier = (L.poisonSwordTier || 1) + 1;
    } else {
      L.poisonSword = true;
      L.poisonSwordTier = 1;
    }
  } else if (buffId === "vampSlash") {
    if (L.vampSlash) {
      L.vampSlashTier = (L.vampSlashTier || 1) + 1;
    } else {
      L.vampSlash = true;
      L.vampSlashTier = 1;
    }
  } else if (buffId === "heavyLanding") {
    if (L.heavyLanding) {
      L.heavyLandingTier = (L.heavyLandingTier || 1) + 1;
    } else {
      L.heavyLanding = true;
      L.heavyLandingTier = 1;
    }
  } else if (buffId === "secondWind") {
    if (L.secondWind) {
      L.secondWindTier = (L.secondWindTier || 1) + 1;
    } else {
      L.secondWind = true;
      L.secondWindTier = 1;
    }
  } else if (buffId === "ricochetOrb") {
    if (L.ricochetOrb) {
      L.ricochetOrbTier = (L.ricochetOrbTier || 1) + 1;
    } else {
      L.ricochetOrb = true;
      L.ricochetOrbTier = 1;
    }
  } else if (buffId === "trapSeed") {
    if (L.trapSeed) {
      L.trapSeedTier = (L.trapSeedTier || 1) + 1;
      L.trapSeedUsesLeft = 2 + Math.max(0, (L.trapSeedTier || 1) - 1);
    } else {
      L.trapSeed = true;
      L.trapSeedTier = 1;
      L.trapSeedUsesLeft = 2;
    }
  } else if (buffId === "echoSlash") {
    if (L.echoSlash) {
      L.echoSlashTier = (L.echoSlashTier || 1) + 1;
    } else {
      L.echoSlash = true;
      L.echoSlashTier = 1;
    }
  } else if (buffId === "fungalBloom") {
    L.fungalBloomTier = (L.fungalBloomTier || 0) + 1;
  } else if (buffId === "sporeDash") {
    L.sporeDashTier = (L.sporeDashTier || 0) + 1;
  } else if (buffId === "thornSkin") {
    L.thornSkinTier = (L.thornSkinTier || 0) + 1;
  } else if (buffId === "rootPrison") {
    L.rootPrisonTier = (L.rootPrisonTier || 0) + 1;
  } else if (buffId === "toxicBurst") {
    L.toxicBurstTier = (L.toxicBurstTier || 0) + 1;
  } else if (buffId === "adrenalBite") {
    L.adrenalBiteTier = (L.adrenalBiteTier || 0) + 1;
  } else if (buffId === "orbLeech") {
    L.orbLeechTier = (L.orbLeechTier || 0) + 1;
  } else if (buffId === "chainRot") {
    L.chainRotTier = (L.chainRotTier || 0) + 1;
  } else if (buffId === "phaseStep") {
    L.phaseStepTier = (L.phaseStepTier || 0) + 1;
  } else if (buffId === "gravityWell") {
    L.gravityWellTier = (L.gravityWellTier || 0) + 1;
  } else if (buffId === "overgrowthArmor") {
    L.overgrowthArmorTier = (L.overgrowthArmorTier || 0) + 1;
  } else if (buffId === "bloodPact") {
    L.bloodPactTier = (L.bloodPactTier || 0) + 1;
  } else if (buffId === "reboundGuard") {
    L.reboundGuardTier = (L.reboundGuardTier || 0) + 1;
  } else if (buffId === "ambushSeed") {
    L.ambushSeedTier = (L.ambushSeedTier || 0) + 1;
  } else if (buffId === "echoOrb") {
    L.echoOrbTier = (L.echoOrbTier || 0) + 1;
  } else if (buffId === "predatorInstinct") {
    L.predatorInstinctTier = (L.predatorInstinctTier || 0) + 1;
  } else if (buffId === "manaBattery") {
    L.manaBatteryTier = (L.manaBatteryTier || 0) + 1;
  } else if (buffId === "windCut") {
    L.windCutTier = (L.windCutTier || 0) + 1;
  } else if (buffId === "snapFreeze") {
    L.snapFreezeTier = (L.snapFreezeTier || 0) + 1;
  } else if (buffId === "lastStand") {
    L.lastStandTier = (L.lastStandTier || 0) + 1;
    L.lastStandUsedRound = false;
  } else {
    return { ok: false, reason: "invalid" };
  }
  if (hadBuff) {
    const cur = L.meleeCooldownMult != null ? L.meleeCooldownMult : 1;
    L.meleeCooldownMult = Math.max(0.2, cur * STACK_COOLDOWN_REDUCTION_MULT);
  } else {
    ensurePlayerCardLoadout(L).push(buffId);
  }
  return { ok: true };
}

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
  pendingBuffReplace = null;
}

function applyBuffChoice(buffId) {
  if (!localState.buffPickActive || !localState.buffPickInputUnlocked) return;
  if (!BUFF_DEFS[buffId]) return;
  const loser = localState.buffPickLoser;
  const loserPlayer = localState.players[loser];
  const loadout = ensurePlayerCardLoadout(loserPlayer);
  const needsReplace = !loadout.includes(buffId) && loadout.length >= CARD_LOADOUT_MAX;
  if (needsReplace && pendingBuffReplace?.buffId !== buffId) {
    pendingBuffReplace = { buffId };
    showBuffReplaceChoices(loser, buffId);
    return;
  }

  if (mode === "online") {
    const replaceBuffId = pendingBuffReplace?.buffId === buffId ? pendingBuffReplace.replaceBuffId || null : null;
    if (socket && roomId) socket.emit("buff:pick", { buffId, replaceBuffId });
    // Keep overlay until server confirms via match:state. Prevents UI desync on rejected picks.
    pendingBuffReplace = null;
    return;
  }
  const win = loser === 0 ? 1 : 0;
  const L = localState.players[loser];
  const W = localState.players[win];
  healPlayerToCap(W);
  const replaceBuffId = pendingBuffReplace?.buffId === buffId ? pendingBuffReplace.replaceBuffId || null : null;
  const needFireBind = buffId === "fireBreath" && !L.fireBreath;
  const needGroundPoundBind = buffId === "groundPound" && !L.groundPound;
  const needTeleportBind = buffId === "teleport" && !L.teleport;
  const result = applyOrUpgradeBuffToPlayer(L, loser, buffId, replaceBuffId);
  if (!result.ok) {
    if (result.reason === "dragon_only") showBanner("Fire Breath is Dragon-only", 1400);
    if (result.reason === "replace_required") {
      pendingBuffReplace = { buffId };
      showBuffReplaceChoices(loser, buffId);
    }
    return;
  }
  healPlayerToCap(L);
  localState.buffPickActive = false;
  pendingBuffReplace = null;
  hideBuffPickOverlay();
  const finishIntermission = () => {
    startLocalRoundCountdown();
    localState.players[0].chargeStartAt = 0;
    localState.players[1].chargeStartAt = 0;
    visualState[0].charging = false;
    visualState[1].charging = false;
  };
  if (needFireBind) {
    startFireBreathKeyBind(loser, false, finishIntermission);
    return;
  }
  if (needGroundPoundBind) {
    startGroundPoundKeyBind(loser, false, finishIntermission);
    return;
  }
  if (needTeleportBind) {
    startTeleportKeyBind(loser, false, finishIntermission);
    return;
  }
  finishIntermission();
}

function showBuffReplaceChoices(loserIdx, pickedBuffId) {
  const wrap = document.getElementById("buffPickOverlay");
  const btnWrap = document.getElementById("buffPickButtons");
  const title = document.getElementById("buffPickTitle");
  const sub = document.getElementById("buffPickSub");
  const gate = document.getElementById("buffPickGateBlock");
  const p = localState.players[loserIdx];
  const owned = ensurePlayerCardLoadout(p);
  if (!btnWrap || !wrap || owned.length === 0) return;
  if (gate) gate.classList.add("hidden");
  if (title) title.textContent = `Replace a card for ${BUFF_DEFS[pickedBuffId]?.name || "new card"}`;
  if (sub) sub.textContent = "Loadout full (8/8). Pick one card to replace.";
  btnWrap.innerHTML = "";
  for (const id of owned) {
    const d = BUFF_DEFS[id];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "buff-card buff-btn";
    b.setAttribute("data-replace-buff", id);
    b.innerHTML = `<span class="buff-card-face">
      <span class="buff-name">${buffIcon(id)} ${d?.name || id}</span>
      <span class="buff-desc">${d?.desc || ""}</span>
    </span>`;
    btnWrap.appendChild(b);
  }
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "buff-card buff-btn";
  cancel.setAttribute("data-replace-cancel", "1");
  cancel.innerHTML = `<span class="buff-card-face">
    <span class="buff-name">↩️ Cancel</span>
    <span class="buff-desc">Go back to the 3 choices</span>
  </span>`;
  btnWrap.appendChild(cancel);
  wrap.classList.remove("hidden");
}

function showBuffPickOverlay(loserIdx, forcedTriplet = null) {
  const wrap = document.getElementById("buffPickOverlay");
  if (!wrap) return;
  const picked = forcedTriplet
    ? { triplet: forcedTriplet, key: [...forcedTriplet].sort().join("|") }
    : pickRandomBuffTriplet(loserIdx);
  const triplet = sanitizeBuffTripletForPlayer(picked.triplet, loserIdx);
  const key = [...triplet].sort().join("|");
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
        <span class="buff-name">${buffIcon(id)} ${d.name}</span>
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
  pendingBuffReplace = null;
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
      if (opts && opts.length) {
        const pick = opts[Math.floor(Math.random() * opts.length)];
        const p = localState.players[loserIdx];
        const loadout = ensurePlayerCardLoadout(p);
        if (!loadout.includes(pick) && loadout.length >= CARD_LOADOUT_MAX) {
          pendingBuffReplace = {
            buffId: pick,
            replaceBuffId: loadout[Math.floor(Math.random() * loadout.length)],
          };
        }
        applyBuffChoice(pick);
      }
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
    const maxAmmo = playerAmmoMax(p);
    const ammo = p.orbAmmo != null ? p.orbAmmo : maxAmmo;
    if (ammo >= maxAmmo) continue;
    const lastShotAt = p.lastShotAt || 0;
    if (now - lastShotAt >= AMMO_RELOAD_IDLE_MS) {
      p.orbAmmo = Math.min(maxAmmo, ammo + AMMO_RELOAD_AMOUNT);
      p.lastShotAt = now;
    }
  }
  const b0 = keyBindings.p0;
  const b1 = keyBindings.p1;
  if (!keys.has(p0FireKey()) && !touchState.orb) visualState[0].charging = false;
  if (!keys.has(p1FireKey())) visualState[1].charging = false;

  const p1 = localState.players[0];
  const p2 = localState.players[1];
  if (p1.fireBreathing && playerInEnemyFire(0)) stopFireBreathLocal(0);
  if (p2.fireBreathing && playerInEnemyFire(1)) stopFireBreathLocal(1);
  if (p1.fireBreathing && now - (p1.fireStartAt || now) >= FIRE_BREATH_MAX_HOLD_MS) stopFireBreathLocal(0);
  if (p2.fireBreathing && now - (p2.fireStartAt || now) >= FIRE_BREATH_MAX_HOLD_MS) stopFireBreathLocal(1);
  const p1Rooted = (p1.freezeRootUntil || 0) > now;
  const p2Rooted = (p2.freezeRootUntil || 0) > now;
  if (p1Rooted) p1.vx = 0;
  if (p2Rooted) p2.vx = 0;
  const p1InputLeft = keys.has(b0.left) || touchState.left;
  const p1InputRight = keys.has(b0.right) || touchState.right;
  const p2InputLeft = mode === "multi" ? keys.has(b1.left) : false;
  const p2InputRight = mode === "multi" ? keys.has(b1.right) : false;
  if (p1InputLeft !== p1InputRight) p1.facing = p1InputRight ? 1 : -1;
  if (p2InputLeft !== p2InputRight) p2.facing = p2InputRight ? 1 : -1;
  const p1Left = !p1Rooted && p1InputLeft;
  const p1Right = !p1Rooted && p1InputRight;
  const p2Left = !p2Rooted && p2InputLeft;
  const p2Right = !p2Rooted && p2InputRight;
  const p1MoveSpeed = MOVE_SPEED * (playerInEnemyFire(0) ? FIRE_BREATH_SLOW_MULT : 1);
  const p2MoveSpeed = MOVE_SPEED * (playerInEnemyFire(1) ? FIRE_BREATH_SLOW_MULT : 1);
  const p1HpMax = playerMaxHp(p1);
  const p2HpMax = playerMaxHp(p2);
  const p1SecondWindActive = !!p1.secondWind && p1HpMax > 0 && (p1.health ?? p1HpMax) / p1HpMax <= SECOND_WIND_HP_THRESHOLD;
  const p2SecondWindActive = !!p2.secondWind && p2HpMax > 0 && (p2.health ?? p2HpMax) / p2HpMax <= SECOND_WIND_HP_THRESHOLD;
  const p1SwSpeed = p1SecondWindActive
    ? 1 + SECOND_WIND_SPEED_BONUS + Math.max(0, (p1.secondWindTier || 1) - 1) * SECOND_WIND_STACK_BONUS
    : 1;
  const p2SwSpeed = p2SecondWindActive
    ? 1 + SECOND_WIND_SPEED_BONUS + Math.max(0, (p2.secondWindTier || 1) - 1) * SECOND_WIND_STACK_BONUS
    : 1;
  const p1MoveSpeedFinal = p1MoveSpeed * p1SwSpeed;
  const p2MoveSpeedFinal = p2MoveSpeed * p2SwSpeed;

  const target1 = p1Left === p1Right ? 0 : p1Left ? -p1MoveSpeedFinal : p1MoveSpeedFinal;
  const ax1 = Math.abs(target1) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL;
  p1.vx += (target1 - p1.vx) * ax1;
  if (Math.abs(target1) < 0.01 && Math.abs(p1.vx) < MOVE_VX_SNAP) p1.vx = 0;
  if (Math.abs(target1) > 0.01) p1.facing = target1 > 0 ? 1 : -1;
  else if (Math.abs(p1.vx) > 0.18) p1.facing = p1.vx > 0 ? 1 : -1;

  if (mode === "multi") {
    const target2 = p2Left === p2Right ? 0 : p2Left ? -p2MoveSpeedFinal : p2MoveSpeedFinal;
    const ax2 = Math.abs(target2) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL;
    p2.vx += (target2 - p2.vx) * ax2;
    if (Math.abs(target2) < 0.01 && Math.abs(p2.vx) < MOVE_VX_SNAP) p2.vx = 0;
    if (Math.abs(target2) > 0.01) p2.facing = target2 > 0 ? 1 : -1;
    else if (Math.abs(p2.vx) > 0.18) p2.facing = p2.vx > 0 ? 1 : -1;
  } else {
    const d = p1.x - p2.x;
    const target2 = Math.abs(d) > 60 ? (d > 0 ? p2MoveSpeedFinal * 0.75 : -p2MoveSpeedFinal * 0.75) : 0;
    const ax2b = Math.abs(target2) < 0.01 ? MOVE_STOP_ACCEL : MOVE_ACCEL * 0.88;
    p2.vx += (target2 - p2.vx) * ax2b;
    if (Math.abs(target2) < 0.01 && Math.abs(p2.vx) < MOVE_VX_SNAP) p2.vx = 0;
    if (Math.abs(target2) > 0.01) p2.facing = target2 > 0 ? 1 : -1;
    else if (Math.abs(p2.vx) > 0.14) p2.facing = p2.vx > 0 ? 1 : -1;
    if (Math.abs(d) < MELEE_RANGE + 12 && Math.random() < 0.02) doMelee(1);
    if (Math.abs(d) > 140 && Math.random() < 0.01) {
      const p2c = localState.players[1];
      const am = p2c.orbAmmo != null ? p2c.orbAmmo : playerAmmoMax(p2c);
      if (am >= 1) {
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
    const wasOnGround = !!p.onGround;
    const previousBottom = p.y + PLAYER_BODY_H;
    const slowFall = visualState[pi].charging && !p.onGround;
    const heavyLandingFallMult =
      p.heavyLanding && !p.onGround
        ? HEAVY_LANDING_GRAVITY_MULT + Math.max(0, (p.heavyLandingTier || 1) - 1) * HEAVY_LANDING_STACK_GRAVITY_BONUS
        : 1;
    p.vy += GRAVITY * (slowFall ? CHARGE_AIR_GRAVITY_MULT : 1) * heavyLandingFallMult;
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
    if (!wasOnGround && p.onGround && p.heavyLanding) {
      const enemyIdx = 1 - pi;
      const enemy = localState.players[enemyIdx];
      const tier = p.heavyLandingTier || 1;
      triggerScreenShake(
        HEAVY_LANDING_SHAKE_MS + Math.max(0, tier - 1) * 35,
        HEAVY_LANDING_SHAKE_AMPLITUDE + Math.max(0, tier - 1) * 1.5
      );
      const dx = Math.abs((enemy.x + PLAYER_BODY_W / 2) - (p.x + PLAYER_BODY_W / 2));
      if (dx <= HEAVY_LANDING_RANGE) {
        const dmg = HEAVY_LANDING_DAMAGE + Math.max(0, tier - 1) * HEAVY_LANDING_STACK_BONUS;
        enemy.health = clamp(enemy.health - dmg, 0, playerMaxHp(enemy));
        enemy.vy = Math.min(enemy.vy || 0, HEAVY_LANDING_UPWARD_VY);
        enemy.onGround = false;
        enemy.jumpsUsed = Math.max(enemy.jumpsUsed || 0, 1);
      }
    }
  }

  processMeleeSwordHits();
  processFireBreathDamage();
  processPoisonDamage();
  processBurnDamage();

  localState.projectiles.forEach((shot) => {
    if ((shot.dormantUntil || 0) > Date.now()) return;
    if (shot.trapSeedSpot) {
      if ((shot.expiresAt || 0) <= Date.now()) {
        shot.dead = true;
        return;
      }
      const target = localState.players[shot.target];
      if (!target) return;
      const hit = rectsOverlap(
        { x: shot.x, y: shot.y, w: shot.w, h: shot.h },
        { x: target.x, y: target.y, w: PLAYER_BODY_W, h: PLAYER_BODY_H }
      );
      if (hit) {
        target.poisonUntil = Math.max(target.poisonUntil || 0, Date.now() + TRAP_SEED_POISON_DURATION_MS);
        target.poisonNextTickAt = Date.now() + TRAP_SEED_POISON_TICK_MS;
        target.poisonTickDamage = TRAP_SEED_POISON_TICK_DAMAGE;
        shot.dead = true;
      }
      return;
    }
    shot.x += shot.vx;
    shot.y += shot.vy ?? 0;
    const shotRect = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
    for (const plat of currentPlatforms()) {
      if (rectsOverlap(shotRect, plat)) {
        if ((shot.ricochetLeft || 0) > 0) {
          shot.ricochetLeft -= 1;
          if (Math.abs(shot.vy || 0) > 0.2) shot.vy = -(shot.vy || 0);
          else shot.vx = -(shot.vx || 0);
          shot.x += shot.vx * 0.8;
          shot.y += (shot.vy || 0) * 0.8;
        } else {
          shot.dead = true;
        }
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
      if (shot.fireBurst) {
        applyBurnToPlayer(target, Date.now());
      }
      if (shot.freezeRootMs) {
        target.freezeRootUntil = Math.max(target.freezeRootUntil || 0, Date.now() + shot.freezeRootMs);
        target.vx = 0;
      }
      shot.dead = true;
    }
    if (shot.x < 0 || shot.x + shot.w > VIEW_W) {
      if ((shot.ricochetLeft || 0) > 0) {
        shot.ricochetLeft -= 1;
        shot.vx = -(shot.vx || 0);
        shot.x = clamp(shot.x, 0, VIEW_W - shot.w);
      } else {
        shot.dead = true;
      }
    }
    if (shot.y < -80 || shot.y > VIEW_H + 40) {
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
    p1.orbAmmo = playerAmmoMax(p1);
    p2.orbAmmo = playerAmmoMax(p2);
    p1.fireBreathing = false;
    p2.fireBreathing = false;
    p1.fireStartAt = 0;
    p2.fireStartAt = 0;
    p1.fireNextDamageAt = 0;
    p2.fireNextDamageAt = 0;
    p1.fireCooldownUntil = 0;
    p2.fireCooldownUntil = 0;
    p1.poisonUntil = 0;
    p2.poisonUntil = 0;
    p1.poisonNextTickAt = 0;
    p2.poisonNextTickAt = 0;
    p1.poisonTickDamage = 0;
    p2.poisonTickDamage = 0;
    p1.burnUntil = 0;
    p2.burnUntil = 0;
    p1.burnNextTickAt = 0;
    p2.burnNextTickAt = 0;
    if (p1.groundPound) p1.groundPoundUsesLeft = 2 + (p1.groundPoundStack || 0);
    if (p2.groundPound) p2.groundPoundUsesLeft = 2 + (p2.groundPoundStack || 0);
    if (p1.teleport) p1.teleportUsesLeft = 1 + (p1.teleportStack || 0);
    if (p2.teleport) p2.teleportUsesLeft = 1 + (p2.teleportStack || 0);
    if (p1.trapSeed) p1.trapSeedUsesLeft = 2 + Math.max(0, (p1.trapSeedTier || 1) - 1);
    if (p2.trapSeed) p2.trapSeedUsesLeft = 2 + Math.max(0, (p2.trapSeedTier || 1) - 1);
    localState.projectiles = [];
    if (!matchOver) {
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
      ensurePlayerCardLoadout(p);
      if (p?.fireBreathing && !p.fireStartAt) p.fireStartAt = Date.now();
      if (mode === "online" && i !== playerIndex && !p?.character) p.character = "knight";
      if (p?.fireBreath && i === playerIndex && !touchState.enabled && !onlineK().fire) {
        startFireBreathKeyBind(playerIndex, true, () => {
          if (socket && roomId) socket.emit("fire:bind:done");
        });
      }
      if (p?.groundPound && i === playerIndex && !touchState.enabled && !onlineK().groundPound) {
        startGroundPoundKeyBind(playerIndex, true, () => {
          if (socket && roomId) socket.emit("ground:bind:done");
        });
      }
      if (p?.teleport && i === playerIndex && !touchState.enabled && !onlineK().teleport) {
        startTeleportKeyBind(playerIndex, true, () => {
          if (socket && roomId) socket.emit("teleport:bind:done");
        });
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
        cardLoadout: [],
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
        cardLoadout: [],
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
    dragonRunStartedAt: 0,
    dragonWasRunning: false,
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
    dragonRunStartedAt: 0,
    dragonWasRunning: false,
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
    if (localState.players[0]?.groundPound && b0.groundPound && e.code === b0.groundPound && !e.repeat) {
      triggerGroundPoundLocal(0);
    }
    if (localState.players[0]?.teleport && b0.teleport && e.code === b0.teleport && !e.repeat) {
      triggerTeleportLocal(0);
    }
    if (mode === "multi" && localState.players[1]?.fireBreath && b1.fire && e.code === b1.fire && !e.repeat) {
      startFireBreathLocal(1);
    }
    if (mode === "multi" && localState.players[1]?.groundPound && b1.groundPound && e.code === b1.groundPound && !e.repeat) {
      triggerGroundPoundLocal(1);
    }
    if (mode === "multi" && localState.players[1]?.teleport && b1.teleport && e.code === b1.teleport && !e.repeat) {
      triggerTeleportLocal(1);
    }
    if (e.code === p0FireKey() && !visualState[0].charging) {
      if (Date.now() >= roundLockUntil && !playerInEnemyFire(0)) {
        const p0 = localState.players[0];
        const a0 = p0.orbAmmo != null ? p0.orbAmmo : playerAmmoMax(p0);
        if (a0 > 0) {
          p0.chargeStartAt = Date.now();
          visualState[0].charging = true;
        }
      }
    }
    if (mode === "multi" && e.code === p1FireKey() && !visualState[1].charging) {
      if (Date.now() >= roundLockUntil && !playerInEnemyFire(1)) {
        const pr = localState.players[1];
        const a1 = pr.orbAmmo != null ? pr.orbAmmo : playerAmmoMax(pr);
        if (a1 > 0) {
          pr.chargeStartAt = Date.now();
          visualState[1].charging = true;
        }
      }
    }
  }
  if (mode === "online" && socket && roomId) {
    const ok = onlineK();
    const controls = onlineControlsFromInput();
    if (e.code === ok.melee && !e.repeat && !onlineIntermissionActive() && !playerInEnemyFire(playerIndex)) {
      if (triggerSwing(playerIndex)) socket.emit("match:input", onlineInputPayload("melee", controls));
    }
    if (e.code === ok.orb && !onlineIntermissionActive() && !playerInEnemyFire(playerIndex)) {
      visualState[playerIndex].charging = true;
      visualState[playerIndex].chargeKeyDownAt = Date.now();
      socket.emit("match:input", onlineInputPayload("chargeStart", controls));
    }
    if (
      localState.players[playerIndex]?.fireBreath &&
      ok.fire &&
      e.code === ok.fire &&
      !e.repeat &&
      !onlineIntermissionActive() &&
      !playerInEnemyFire(playerIndex)
    ) {
      socket.emit("match:input", onlineInputPayload("fireStart", controls));
    }
    if (
      localState.players[playerIndex]?.groundPound &&
      (localState.players[playerIndex]?.groundPoundUsesLeft || 0) > 0 &&
      ok.groundPound &&
      e.code === ok.groundPound &&
      !e.repeat &&
      !onlineIntermissionActive() &&
      !playerInEnemyFire(playerIndex)
    ) {
      triggerScreenShake();
      socket.emit("match:input", onlineInputPayload("groundPound", controls));
    }
    if (
      localState.players[playerIndex]?.teleport &&
      (localState.players[playerIndex]?.teleportUsesLeft || 0) > 0 &&
      ok.teleport &&
      e.code === ok.teleport &&
      !e.repeat &&
      !onlineIntermissionActive() &&
      !playerInEnemyFire(playerIndex)
    ) {
      socket.emit("match:input", onlineInputPayload("teleport", controls));
    }
    socket.emit("match:input", onlineInputPayload(null, controls));
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
    if (e.code === keyBindings.p0.fire) stopFireBreathLocal(0, true);
    if (mode === "multi" && e.code === keyBindings.p1.fire) stopFireBreathLocal(1, true);
  }
  if (mode === "online" && socket && roomId) {
    const ok = onlineK();
    const controls = onlineControlsFromInput();
    if (e.code === ok.orb && !onlineIntermissionActive()) {
      const heldMs = Date.now() - (visualState[playerIndex].chargeKeyDownAt || Date.now());
      visualState[playerIndex].charging = false;
      socket.emit("match:input", onlineInputPayload("chargeRelease", controls));
    }
    if (ok.fire && e.code === ok.fire) {
      socket.emit("match:input", onlineInputPayload("fireEnd", controls));
    }
    socket.emit("match:input", onlineInputPayload(null, controls));
  }
});

window.addEventListener("blur", resetInputState);
window.addEventListener("pagehide", resetInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) resetInputState();
});

function installMobileZoomGuards() {
  if (!isTouchDevice) return;
  let lastTapAt = 0;
  const preventGesture = (e) => {
    e.preventDefault();
  };
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
  document.addEventListener(
    "touchmove",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const inGameSurface = !!target.closest("#gameCanvas, .touch-overlay, .game-wrap");
      if (!inGameSurface) return;
      // Prevent Safari viewport scroll / pull-to-refresh while controlling the game.
      e.preventDefault();
    },
    { passive: false, capture: true }
  );
  document.addEventListener(
    "contextmenu",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target && target.closest("#gameCanvas, .touch-overlay, .game-wrap")) {
        e.preventDefault();
      }
    },
    { capture: true }
  );
  document.addEventListener(
    "dblclick",
    (e) => {
      if (e.target instanceof Element && e.target.closest("button, .game-wrap")) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || !target.closest("button, .touch-overlay, #gameCanvas")) return;
      const now = Date.now();
      if (now - lastTapAt < 420) {
        e.preventDefault();
        e.stopPropagation();
      }
      lastTapAt = now;
    },
    { capture: true, passive: false }
  );
}

function setupUI() {
  installMobileZoomGuards();
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
      const JOY_RADIUS = 52;
      const JOY_DEADZONE = 0.2;
      const JOY_MOVE_THRESHOLD = 0.32;
      const JOY_JUMP_THRESHOLD = 0.46;
      let activeStickPointerId = null;
      const resetStick = () => {
        activeStickPointerId = null;
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
        const nx = clampedX / JOY_RADIUS;
        const ny = clampedY / JOY_RADIUS;
        const mag = Math.hypot(nx, ny);
        if (mag < JOY_DEADZONE) {
          touchState.left = false;
          touchState.right = false;
          touchState.jumpFromStick = false;
          return;
        }
        // Remap after deadzone so movement comes on smoothly.
        const scaled = Math.min(1, (mag - JOY_DEADZONE) / (1 - JOY_DEADZONE));
        const sx = (nx / mag) * scaled;
        const sy = (ny / mag) * scaled;
        touchState.left = sx < -JOY_MOVE_THRESHOLD;
        touchState.right = sx > JOY_MOVE_THRESHOLD;
        touchState.jumpFromStick = sy < -JOY_JUMP_THRESHOLD;
      };
      touchJoystickEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        activeStickPointerId = e.pointerId;
        if (typeof touchJoystickEl.setPointerCapture === "function") {
          touchJoystickEl.setPointerCapture(e.pointerId);
        }
        moveStick(e.clientX, e.clientY);
      });
      touchJoystickEl.addEventListener("pointermove", (e) => {
        if (activeStickPointerId !== e.pointerId) return;
        e.preventDefault();
        moveStick(e.clientX, e.clientY);
      });
      touchJoystickEl.addEventListener("pointerup", (e) => {
        if (activeStickPointerId !== e.pointerId) return;
        if (typeof touchJoystickEl.releasePointerCapture === "function") {
          try {
            touchJoystickEl.releasePointerCapture(e.pointerId);
          } catch {}
        }
        resetStick();
      });
      touchJoystickEl.addEventListener("pointercancel", (e) => {
        if (activeStickPointerId !== e.pointerId) return;
        resetStick();
      });
      touchJoystickEl.addEventListener("pointerleave", (e) => {
        if (activeStickPointerId !== e.pointerId) return;
        resetStick();
      });
    }
  }

  document.getElementById("singleBtn").addEventListener("click", () => {
    mode = "single";
    setMatchStatus("Single player mode.");
    localReset();
    setArcadeStep("character_p1");
    closeSettings();
  });
  document.getElementById("multiBtn").addEventListener("click", () => {
    mode = "multi";
    setMatchStatus("Local multiplayer (same keyboard).");
    localReset();
    setArcadeStep("character_p1");
    closeSettings();
  });
  document.getElementById("onlineBtn").addEventListener("click", () => {
    mode = "online";
    closeSettings();
    setArcadeStep("character_p1");
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
      setArcadeStep("character_p1");
    }
    if (action === "multi") {
      mode = "multi";
      localReset();
      setMatchStatus("Local multiplayer (same keyboard).");
      setArcadeStep("character_p1");
    }
    if (action === "online") {
      mode = "online";
      setArcadeStep("character_p1");
    }
    if (action === "select_character" || action === "select_weapon") {
      const playerIdx = Number(t?.dataset?.playerIdx ?? "0") || 0;
      const optionId = t?.dataset?.optionId || "";
      const loadout = activeLoadoutForPlayer(playerIdx);
      if (action === "select_character") {
        if (!CHARACTER_OPTIONS.some((opt) => opt.enabled && opt.id === optionId)) return;
        loadout.character = optionId;
        setArcadeStep(nextStepAfterCharacter(playerIdx));
      } else {
        if (!WEAPON_OPTIONS.some((opt) => opt.enabled && opt.id === optionId)) return;
        loadout.weapon = optionId;
        if (mode === "online" && touchState.enabled) setupSocket();
        else setArcadeStep(nextStepAfterWeapon(playerIdx));
      }
    }
    if (action === "loadout_back") {
      const playerIdx = Number(t?.dataset?.playerIdx ?? "0") || 0;
      const kind = t?.dataset?.kind || "character";
      if (kind === "weapon") setArcadeStep(`character_p${playerIdx + 1}`);
      else if (mode === "multi" && playerIdx === 1) setArcadeStep("weapon_p1");
      else setArcadeStep("mode");
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
      const replaceBtn = e.target.closest("[data-replace-buff]");
      if (replaceBtn) {
        const replaceBuffId = replaceBtn.getAttribute("data-replace-buff");
        if (!replaceBuffId || !pendingBuffReplace?.buffId) return;
        pendingBuffReplace = { ...pendingBuffReplace, replaceBuffId };
        applyBuffChoice(pendingBuffReplace.buffId);
        return;
      }
      const cancelBtn = e.target.closest("[data-replace-cancel]");
      if (cancelBtn) {
        pendingBuffReplace = null;
        showBuffPickOverlay(localState.buffPickLoser, localState.buffPickOptions);
        return;
      }
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
