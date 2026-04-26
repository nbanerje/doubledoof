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
const BUFF_PICK_GATE_MS = 2000;
const MAX_CHARGE_MS = 12000;
const CHARGE_SCALE_MS = 3200;
const MELEE_RANGE = 48;
const MELEE_KNOCKBACK_PX = 50;
const STAFF_DAMAGE = 35;
const STAFF_KNOCKBACK_PX = 70;
const STAFF_COOLDOWN_MS = 1000;
const WINS_TO_END_MATCH = 10;
const ORB_DAMAGE_MIN = 6;
const ORB_DAMAGE_RANGE = 26;
const ORB_AMMO_PER_ROUND = 10;
const AMMO_RELOAD_IDLE_MS = 5000;
const AMMO_RELOAD_AMOUNT = 5;
const FREEZE_HIT_ROOT_MS = 1600;
const FREEZE_TRAIL_ORB_OFFSET = 26;
const CHEAT_BLUE_MELEE_BURST_DAMAGE = 1000;
const CHEAT_BLUE_MELEE_BURST_HITS = 5;
const VIEW_W = 1040;
const FLOOR_Y = 520;
const PLATFORM_RAISE_PX = 40;
const PLAYER_BODY_W = 36;
const PLAYER_BODY_H = 48;
const PLAYER_TOP_Y = FLOOR_Y - PLAYER_BODY_H;
const GRAVITY = 0.7;
const CHARGE_AIR_GRAVITY_MULT = 0.26;
const JUMP_VELOCITY = -12.5;
const POWER_BUFF_DAMAGE_MULT = 1.35;
const TANK_BUFF_HP_PER_PICK = 75;
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
/** Fire Breath is much more likely when the loser is Dragon (matches client bias). */
const BUFF_DRAGON_FIRE_BREATH_PICK_WEIGHT = 8;
function buffPickWeight(id, opts = {}) {
  if (opts.dragonLoser && id === "fireBreath") return BUFF_DRAGON_FIRE_BREATH_PICK_WEIGHT;
  return 1;
}
const FIRE_BREATH_RANGE = PLAYER_BODY_W * 1.5;
const FIRE_BREATH_H = 20;
const FIRE_BREATH_TICK_MS = 100;
const FIRE_BREATH_BASE_DAMAGE = 7;
const FIRE_BREATH_SLOW_MULT = 0.25;
const FIRE_BREATH_GROWTH_PER_TICK = 0.12;
const FIRE_BREATH_MAX_SCALE = 2.5;
const FIRE_BREATH_MAX_HOLD_MS = 5000;
const FIRE_BREATH_COOLDOWN_MS = 5000;
const GROUND_POUND_DAMAGE_FRACTION = 0.25;
const GROUND_POUND_LAUNCH_VY = -14;
const GROUND_POUND_LAYER_EPSILON = 2;
const GROUND_POUND_FREEZE_MS = 3000;
const POISON_DURATION_MS = 5000;
const POISON_TICK_MS = 1000;
const POISON_TICK_DAMAGE = 2;
const TRAP_SEED_POISON_DURATION_MS = 10000;
const TRAP_SEED_POISON_TICK_MS = 1000;
const TRAP_SEED_POISON_TICK_DAMAGE = 2;
const TRAP_SEED_SPOT_W = 22;
const TRAP_SEED_SPOT_H = 8;
const TRAP_SEED_SPOT_DURATION_MS = 10000;
const BURN_DURATION_MS = 5000;
const BURN_TICK_MS = 300;
const BURN_TICK_DAMAGE = 0.5;
const FIRE_BURST_SPEED = 22;
const FIRE_BURST_W = 32;
const FIRE_BURST_H = 12;
const FIRE_BURST_HIT_DAMAGE = 10;
const VAMP_SLASH_HEAL_FRAC = 0.3;
const VAMP_SLASH_STACK_BONUS = 0.1;
const HEAVY_LANDING_RANGE = 96;
const HEAVY_LANDING_DAMAGE = 8;
const HEAVY_LANDING_STACK_BONUS = 4;
const HEAVY_LANDING_UPWARD_VY = -8;
const SECOND_WIND_HP_THRESHOLD = 0.35;
const SECOND_WIND_SPEED_BONUS = 0.25;
const SECOND_WIND_DAMAGE_BONUS = 0.2;
const SECOND_WIND_STACK_BONUS = 0.1;
const TRAP_SEED_ROOT_MS = 1200;
const TRAP_SEED_STACK_BONUS_MS = 500;
const ECHO_SLASH_BONUS_FRAC = 0.5;
const ECHO_SLASH_STACK_BONUS_FRAC = 0.15;
const CARD_LOADOUT_MAX = 5;
const LEVEL_PLATFORMS = [
  [
    { x: 140, y: 490, w: 180, h: 14 },
    { x: 420, y: 430, w: 210, h: 14 },
    { x: 760, y: 500, w: 170, h: 14 },
    { x: 620, y: 340, w: 150, h: 14 },
  ],
  [
    { x: 90, y: 485, w: 170, h: 14 },
    { x: 360, y: 415, w: 220, h: 14 },
    { x: 680, y: 495, w: 200, h: 14 },
    { x: 540, y: 330, w: 160, h: 14 },
  ],
  [
    { x: 120, y: 500, w: 200, h: 14 },
    { x: 400, y: 445, w: 180, h: 14 },
    { x: 720, y: 475, w: 175, h: 14 },
    { x: 580, y: 355, w: 155, h: 14 },
  ],
  [
    { x: 160, y: 478, w: 150, h: 14 },
    { x: 330, y: 380, w: 240, h: 14 },
    { x: 640, y: 510, w: 190, h: 14 },
    { x: 800, y: 420, w: 130, h: 14 },
  ],
  [
    { x: 110, y: 492, w: 190, h: 14 },
    { x: 380, y: 438, w: 200, h: 14 },
    { x: 650, y: 488, w: 210, h: 14 },
    { x: 500, y: 320, w: 170, h: 14 },
  ],
  [
    { x: 130, y: 505, w: 175, h: 14 },
    { x: 410, y: 360, w: 165, h: 14 },
    { x: 610, y: 455, w: 195, h: 14 },
    { x: 780, y: 385, w: 145, h: 14 },
  ],
  [
    { x: 70, y: 470, w: 160, h: 14 },
    { x: 280, y: 400, w: 260, h: 14 },
    { x: 600, y: 500, w: 180, h: 14 },
    { x: 850, y: 450, w: 120, h: 14 },
  ],
  [
    { x: 150, y: 488, w: 165, h: 14 },
    { x: 450, y: 425, w: 195, h: 14 },
    { x: 740, y: 498, w: 165, h: 14 },
    { x: 590, y: 348, w: 145, h: 14 },
  ],
  [
    { x: 100, y: 495, w: 185, h: 14 },
    { x: 350, y: 430, w: 225, h: 14 },
    { x: 670, y: 465, w: 185, h: 14 },
    { x: 520, y: 365, w: 150, h: 14 },
  ],
  [
    { x: 140, y: 500, w: 175, h: 14 },
    { x: 400, y: 395, w: 200, h: 14 },
    { x: 700, y: 505, w: 170, h: 14 },
    { x: 560, y: 335, w: 155, h: 14 },
  ],
];

function weaponStatsForId(id) {
  if (id === "staff") {
    return { id: "staff", damage: STAFF_DAMAGE, knockback: STAFF_KNOCKBACK_PX, cooldownMs: STAFF_COOLDOWN_MS };
  }
  return { id: "sword", damage: 10, knockback: MELEE_KNOCKBACK_PX, cooldownMs: 0 };
}

function normalizeLevelIndex(idx) {
  return Math.max(0, Number.isInteger(idx) ? idx : 0) % LEVEL_PLATFORMS.length;
}

function nextLevelIndex(currentIdx) {
  if (LEVEL_PLATFORMS.length <= 1) return 0;
  const cur = normalizeLevelIndex(currentIdx);
  return (cur + 1 + Math.floor(Math.random() * (LEVEL_PLATFORMS.length - 1))) % LEVEL_PLATFORMS.length;
}

function currentPlatformsForLevelIndex(levelIndex) {
  const idx = normalizeLevelIndex(levelIndex);
  return LEVEL_PLATFORMS[idx].map((plat) => ({ ...plat, y: plat.y - PLATFORM_RAISE_PX }));
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

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function fireBreathRectForPlayer(p) {
  const fac = p.facing || 1;
  const heldMs = Math.max(0, Date.now() - (p.fireStartAt || Date.now()));
  const rawScale = 1 + Math.floor(heldMs / FIRE_BREATH_TICK_MS) * FIRE_BREATH_GROWTH_PER_TICK;
  const scale = Math.min(rawScale, FIRE_BREATH_MAX_SCALE);
  const range = FIRE_BREATH_RANGE * scale;
  const height = FIRE_BREATH_H * scale;
  const x = fac > 0 ? p.x + PLAYER_BODY_W : p.x - range;
  return {
    x,
    y: p.y + Math.floor(PLAYER_BODY_H * 0.42) - height / 2,
    w: range,
    h: height,
  };
}

function playerInEnemyFire(room, idx) {
  const p = room.players[idx];
  const enemy = room.players[idx === 0 ? 1 : 0];
  if (!p || !enemy?.fireBreathing) return false;
  return rectsOverlap(fireBreathRectForPlayer(enemy), {
    x: p.x,
    y: p.y,
    w: PLAYER_BODY_W,
    h: PLAYER_BODY_H,
  });
}

function spawnFireBreathBurstForPlayer(room, idx) {
  const player = room.players[idx];
  if (!player?.fireBreath || !playerIsDragon(player)) return;
  const fac = player.facing >= 0 ? 1 : -1;
  const y = player.y + Math.floor(PLAYER_BODY_H * 0.42) - FIRE_BURST_H / 2;
  const x = fac > 0 ? player.x + PLAYER_BODY_W : player.x - FIRE_BURST_W;
  room.projectiles.push({
    spawnedAt: Date.now(),
    x,
    y,
    w: FIRE_BURST_W,
    h: FIRE_BURST_H,
    vx: fac * FIRE_BURST_SPEED,
    vy: 0,
    targetIdx: idx === 0 ? 1 : 0,
    damage: FIRE_BURST_HIT_DAMAGE,
    fireBurst: true,
  });
}

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

function playerMaxHp(p) {
  return p.maxHealth != null && p.maxHealth > 0 ? p.maxHealth : 100;
}

function secondWindDamageMultiplier(p) {
  if (!p?.secondWind) return 1;
  const hp = playerMaxHp(p);
  const ratio = hp > 0 ? (p.health ?? hp) / hp : 1;
  if (ratio > SECOND_WIND_HP_THRESHOLD) return 1;
  return 1 + SECOND_WIND_DAMAGE_BONUS + Math.max(0, (p.secondWindTier || 1) - 1) * SECOND_WIND_STACK_BONUS;
}

function ensurePlayerCardLoadout(player) {
  if (!Array.isArray(player.cardLoadout)) player.cardLoadout = [];
  return player.cardLoadout;
}

function removeBuffEffectsFromPlayer(player, buffId) {
  if (buffId === "triple") {
    delete player.tripleShot;
    delete player.tripleDamageBonus;
  } else if (buffId === "tank") {
    delete player.maxHealth;
    player.health = Math.min(player.health, playerMaxHp(player));
  } else if (buffId === "power") {
    delete player.damageMult;
  } else if (buffId === "infiniteJumps") {
    delete player.infiniteJumps;
    delete player.skyJumpStacks;
  } else if (buffId === "infiniteAmmo") {
    delete player.infiniteAmmo;
  } else if (buffId === "instantMaxCharge") {
    delete player.instantMaxCharge;
    delete player.instantChargeBonusDmg;
  } else if (buffId === "meleeLong") {
    delete player.meleeRangeScale;
    delete player.meleeSwingScale;
  } else if (buffId === "fireBreath") {
    delete player.fireBreath;
    delete player.fireBreathTier;
    delete player.fireBreathing;
    delete player.fireStartAt;
    delete player.fireNextDamageAt;
    delete player.fireCooldownUntil;
  } else if (buffId === "freeze") {
    delete player.freezeShot;
    delete player.freezeRootBonusMs;
  } else if (buffId === "groundPound") {
    delete player.groundPound;
    delete player.groundPoundUsesLeft;
    delete player.groundPoundStack;
  } else if (buffId === "poisonSword") {
    delete player.poisonSword;
    delete player.poisonSwordTier;
  } else if (buffId === "teleport") {
    delete player.teleport;
    delete player.teleportUsesLeft;
    delete player.teleportStack;
  } else if (buffId === "vampSlash") {
    delete player.vampSlash;
    delete player.vampSlashTier;
  } else if (buffId === "heavyLanding") {
    delete player.heavyLanding;
    delete player.heavyLandingTier;
  } else if (buffId === "secondWind") {
    delete player.secondWind;
    delete player.secondWindTier;
  } else if (buffId === "ricochetOrb") {
    delete player.ricochetOrb;
    delete player.ricochetOrbTier;
  } else if (buffId === "trapSeed") {
    delete player.trapSeed;
    delete player.trapSeedTier;
    delete player.trapSeedUsesLeft;
  } else if (buffId === "echoSlash") {
    delete player.echoSlash;
    delete player.echoSlashTier;
  }
}

function pickRandomBuffTripletServer(lastKey, loserPlayer) {
  const weightOpts = { dragonLoser: playerIsDragon(loserPlayer) };
  const pickWeightedWithoutReplacement = (count) => {
    const pool = [...BUFF_POOL];
    const out = [];
    while (out.length < count && pool.length) {
      let wSum = 0;
      for (const id of pool) wSum += buffPickWeight(id, weightOpts);
      let r = Math.random() * wSum;
      let chosenIdx = pool.length - 1;
      for (let i = 0; i < pool.length; i += 1) {
        r -= buffPickWeight(pool[i], weightOpts);
        if (r <= 0) {
          chosenIdx = i;
          break;
        }
      }
      out.push(pool[chosenIdx]);
      pool.splice(chosenIdx, 1);
    }
    return out;
  };
  for (let i = 0; i < 40; i += 1) {
    const triplet = pickWeightedWithoutReplacement(3);
    const key = [...triplet].sort().join("|");
    if (!lastKey || key !== lastKey) return { triplet, key };
  }
  const triplet = pickWeightedWithoutReplacement(3);
  return { triplet, key: [...triplet].sort().join("|") };
}

function playerIsDragon(player) {
  return (player?.character || "knight") === "dragon";
}

function sanitizeBuffTripletForPlayerServer(triplet, player) {
  if (!Array.isArray(triplet) || playerIsDragon(player)) return triplet;
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

function applyBuffToPlayerOnline(player, buffId, replaceBuffId = null) {
  const loadout = ensurePlayerCardLoadout(player);
  const hadBuff = loadout.includes(buffId);
  if (!hadBuff && loadout.length >= CARD_LOADOUT_MAX) {
    if (!replaceBuffId || !loadout.includes(replaceBuffId) || replaceBuffId === buffId) {
      return { ok: false, reason: "replace_required" };
    }
    removeBuffEffectsFromPlayer(player, replaceBuffId);
    player.cardLoadout = loadout.filter((id) => id !== replaceBuffId);
  }
  if (buffId === "fireBreath") {
    if (!playerIsDragon(player)) return { ok: false, reason: "dragon_only" };
    if (player.fireBreath) {
      player.fireBreathTier = (player.fireBreathTier || 1) + 1;
    } else {
      player.fireBreath = true;
      player.fireBreathTier = 1;
    }
  } else if (buffId === "triple") {
    if (player.tripleShot) {
      player.tripleDamageBonus = (player.tripleDamageBonus || 0) + 4;
    } else {
      player.tripleShot = true;
    }
  } else if (buffId === "tank") {
    const base = player.maxHealth != null && player.maxHealth > 0 ? player.maxHealth : 100;
    player.maxHealth = base + TANK_BUFF_HP_PER_PICK;
  } else if (buffId === "power") {
    const cur = player.damageMult != null && player.damageMult > 0 ? player.damageMult : 1;
    player.damageMult = cur * POWER_BUFF_DAMAGE_MULT;
  } else if (buffId === "infiniteJumps") {
    if (player.infiniteJumps) {
      player.skyJumpStacks = (player.skyJumpStacks || 0) + 1;
    } else {
      player.infiniteJumps = true;
    }
  } else if (buffId === "infiniteAmmo") {
    if (player.infiniteAmmo) {
      const cap = ORB_AMMO_PER_ROUND + 15;
      const cur = player.orbAmmo != null ? player.orbAmmo : ORB_AMMO_PER_ROUND;
      player.orbAmmo = Math.min(cap, cur + 5);
    } else {
      player.infiniteAmmo = true;
      player.orbAmmo = ORB_AMMO_PER_ROUND;
    }
  } else if (buffId === "instantMaxCharge") {
    if (player.instantMaxCharge) {
      player.instantChargeBonusDmg = (player.instantChargeBonusDmg || 0) + 4;
    } else {
      player.instantMaxCharge = true;
    }
  } else if (buffId === "meleeLong") {
    player.meleeRangeScale = (player.meleeRangeScale != null ? player.meleeRangeScale : 1) * 2;
  } else if (buffId === "freeze") {
    if (player.freezeShot) {
      player.freezeRootBonusMs = (player.freezeRootBonusMs || 0) + 600;
    } else {
      player.freezeShot = true;
    }
  } else if (buffId === "groundPound") {
    if (player.groundPound) {
      player.groundPoundStack = (player.groundPoundStack || 0) + 1;
      player.groundPoundUsesLeft = 2 + (player.groundPoundStack || 0);
    } else {
      player.groundPound = true;
      player.groundPoundStack = 0;
      player.groundPoundUsesLeft = 2;
    }
  } else if (buffId === "poisonSword") {
    if (player.poisonSword) {
      player.poisonSwordTier = (player.poisonSwordTier || 1) + 1;
    } else {
      player.poisonSword = true;
      player.poisonSwordTier = 1;
    }
  } else if (buffId === "teleport") {
    if (player.teleport) {
      player.teleportStack = (player.teleportStack || 0) + 1;
      player.teleportUsesLeft = 1 + (player.teleportStack || 0);
    } else {
      player.teleport = true;
      player.teleportStack = 0;
      player.teleportUsesLeft = 1;
    }
  } else if (buffId === "vampSlash") {
    if (player.vampSlash) {
      player.vampSlashTier = (player.vampSlashTier || 1) + 1;
    } else {
      player.vampSlash = true;
      player.vampSlashTier = 1;
    }
  } else if (buffId === "heavyLanding") {
    if (player.heavyLanding) {
      player.heavyLandingTier = (player.heavyLandingTier || 1) + 1;
    } else {
      player.heavyLanding = true;
      player.heavyLandingTier = 1;
    }
  } else if (buffId === "secondWind") {
    if (player.secondWind) {
      player.secondWindTier = (player.secondWindTier || 1) + 1;
    } else {
      player.secondWind = true;
      player.secondWindTier = 1;
    }
  } else if (buffId === "ricochetOrb") {
    if (player.ricochetOrb) {
      player.ricochetOrbTier = (player.ricochetOrbTier || 1) + 1;
    } else {
      player.ricochetOrb = true;
      player.ricochetOrbTier = 1;
    }
  } else if (buffId === "trapSeed") {
    if (player.trapSeed) {
      player.trapSeedTier = (player.trapSeedTier || 1) + 1;
      player.trapSeedUsesLeft = 2 + Math.max(0, (player.trapSeedTier || 1) - 1);
    } else {
      player.trapSeed = true;
      player.trapSeedTier = 1;
      player.trapSeedUsesLeft = 2;
    }
  } else if (buffId === "echoSlash") {
    if (player.echoSlash) {
      player.echoSlashTier = (player.echoSlashTier || 1) + 1;
    } else {
      player.echoSlash = true;
      player.echoSlashTier = 1;
    }
  } else {
    return { ok: false, reason: "invalid" };
  }
  if (!hadBuff) ensurePlayerCardLoadout(player).push(buffId);
  player.health = playerMaxHp(player);
  return { ok: true };
}

function groundedLayerY(p) {
  if (!p?.onGround) return null;
  return Math.round(p.y + PLAYER_BODY_H);
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
      jumpsUsed: 0,
      jumpHeld: false,
      health: 100,
      facing: 1,
      score: 0,
      controls: {},
      weapon: "sword",
      character: "knight",
      lastMeleeAt: 0,
      charging: false,
      chargeStart: 0,
      fireCooldownUntil: 0,
      orbAmmo: ORB_AMMO_PER_ROUND,
      lastShotAt: Date.now(),
      color: "#2f7dff",
      cardLoadout: [],
    },
    {
      id: null,
      socketId: null,
      x: 760,
      y: PLAYER_TOP_Y,
      vx: 0,
      vy: 0,
      onGround: true,
      jumpsUsed: 0,
      jumpHeld: false,
      health: 100,
      facing: -1,
      score: 0,
      controls: {},
      weapon: "sword",
      character: "knight",
      lastMeleeAt: 0,
      charging: false,
      chargeStart: 0,
      fireCooldownUntil: 0,
      orbAmmo: ORB_AMMO_PER_ROUND,
      lastShotAt: Date.now(),
      color: "#e44b4b",
      cardLoadout: [],
    },
  ];
  rooms.set(roomId, {
    id: roomId,
    round: 1,
    levelIndex: 0,
    players,
    projectiles: [],
    lockUntil: 0,
    intermissionStartedAt: 0,
    buffPickActive: false,
    buffPickLoser: 0,
    buffPickOptions: null,
    buffPickInputUnlocked: false,
    buffUnlockAt: 0,
    buffLastOfferedKey: null,
    blueMeleeBurstHits: 0,
    roundResult: null,
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
  const platforms = platformsForRound(currentPlatformsForLevelIndex(room.levelIndex), room.round);
  if (room.buffPickActive) {
    if (!room.buffPickInputUnlocked && now >= room.buffUnlockAt) {
      room.buffPickInputUnlocked = true;
    }
    return;
  }
  if (room.lockUntil > now) return;

  for (let pi = 0; pi < room.players.length; pi += 1) {
    const p = room.players[pi];
    if (!p.infiniteAmmo) {
      const ammo = p.orbAmmo != null ? p.orbAmmo : ORB_AMMO_PER_ROUND;
      if (ammo < ORB_AMMO_PER_ROUND) {
        const lastShotAt = p.lastShotAt || 0;
        if (now - lastShotAt >= AMMO_RELOAD_IDLE_MS) {
          p.orbAmmo = Math.min(ORB_AMMO_PER_ROUND, ammo + AMMO_RELOAD_AMOUNT);
          p.lastShotAt = now;
        }
      }
    }
    const left = !!p.controls.left;
    const right = !!p.controls.right;
    const jump = !!p.controls.jump;
    const rooted = (p.freezeRootUntil || 0) > now;
    const engulfedByEnemyFire = playerInEnemyFire(room, pi);
    if (p.fireBreathing && engulfedByEnemyFire) {
      p.fireBreathing = false;
      p.fireCooldownUntil = Math.max(p.fireCooldownUntil || 0, now + FIRE_BREATH_COOLDOWN_MS);
    }
    if (p.fireBreathing && now - (p.fireStartAt || now) >= FIRE_BREATH_MAX_HOLD_MS) {
      p.fireBreathing = false;
      p.fireCooldownUntil = Math.max(p.fireCooldownUntil || 0, now + FIRE_BREATH_COOLDOWN_MS);
    }
    const moveSpeedBase = 4 * (engulfedByEnemyFire ? FIRE_BREATH_SLOW_MULT : 1);
    const secondWindSpeedMult = (() => {
      if (!p.secondWind) return 1;
      const hp = playerMaxHp(p);
      const ratio = hp > 0 ? (p.health ?? hp) / hp : 1;
      if (ratio > SECOND_WIND_HP_THRESHOLD) return 1;
      return 1 + SECOND_WIND_SPEED_BONUS + Math.max(0, (p.secondWindTier || 1) - 1) * SECOND_WIND_STACK_BONUS;
    })();
    const moveSpeed = moveSpeedBase * secondWindSpeedMult;
    p.vx = 0;
    if (!rooted && left && !right) {
      p.vx = -moveSpeed;
      p.facing = -1;
    }
    if (!rooted && right && !left) {
      p.vx = moveSpeed;
      p.facing = 1;
    }
    if (!rooted && jump && !p.jumpHeld) {
      if (p.infiniteJumps) {
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
        p.jumpsUsed = Math.min((p.jumpsUsed || 0) + 1, 9);
      } else if (p.onGround || (p.jumpsUsed || 0) < 2) {
        p.vy = JUMP_VELOCITY;
        p.onGround = false;
        p.jumpsUsed = (p.jumpsUsed || 0) + 1;
      }
    }
    p.jumpHeld = jump;
    const wasOnGround = !!p.onGround;
    const previousBottom = p.y + PLAYER_BODY_H;
    const slowFall = p.charging && !p.onGround;
    p.vy += GRAVITY * (slowFall ? CHARGE_AIR_GRAVITY_MULT : 1);
    p.x = Math.max(0, Math.min(VIEW_W - PLAYER_BODY_W, p.x + p.vx));
    p.y += p.vy;
    const bottom = p.y + PLAYER_BODY_H;
    let landed = false;
    if (p.vy >= 0) {
      for (const plat of platforms) {
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
    if (!landed && p.y >= PLAYER_TOP_Y) {
      p.y = PLAYER_TOP_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumpsUsed = 0;
    } else if (!landed) {
      p.onGround = false;
    }
    if (!wasOnGround && p.onGround && p.heavyLanding) {
      const enemy = room.players[pi === 0 ? 1 : 0];
      const dx = Math.abs((enemy.x + PLAYER_BODY_W / 2) - (p.x + PLAYER_BODY_W / 2));
      if (dx <= HEAVY_LANDING_RANGE) {
        const tier = p.heavyLandingTier || 1;
        const dmg = HEAVY_LANDING_DAMAGE + Math.max(0, tier - 1) * HEAVY_LANDING_STACK_BONUS;
        enemy.health = Math.max(0, enemy.health - dmg);
        enemy.vy = Math.min(enemy.vy || 0, HEAVY_LANDING_UPWARD_VY);
        enemy.onGround = false;
        enemy.jumpsUsed = Math.max(enemy.jumpsUsed || 0, 1);
      }
    }
  }

  const p0 = room.players[0];
  const p1 = room.players[1];

  for (let ai = 0; ai < 2; ai += 1) {
    const at = room.players[ai];
    const def = room.players[ai === 0 ? 1 : 0];
    if (!at.fireBreathing || !def) continue;
    if (!at.fireNextDamageAt || at.fireNextDamageAt < now - FIRE_BREATH_TICK_MS * 4) {
      at.fireNextDamageAt = now;
    }
    const flame = fireBreathRectForPlayer(at);
    const defRect = { x: def.x, y: def.y, w: PLAYER_BODY_W, h: PLAYER_BODY_H };
    while (at.fireNextDamageAt <= now) {
      if (rectsOverlap(flame, defRect)) {
        const heldMs = Math.max(0, at.fireNextDamageAt - (at.fireStartAt || at.fireNextDamageAt));
        const tierBonus = ((at.fireBreathTier || 1) - 1) * 2;
        const dmg = FIRE_BREATH_BASE_DAMAGE + Math.floor(heldMs / 1000) + tierBonus;
        def.health = Math.max(0, def.health - dmg);
      }
      at.fireNextDamageAt += FIRE_BREATH_TICK_MS;
    }
  }

  for (const p of room.players) {
    if (!p || (p.poisonUntil || 0) <= now) continue;
    if (!p.poisonNextTickAt || p.poisonNextTickAt < now - POISON_TICK_MS * 3) {
      p.poisonNextTickAt = now;
    }
    while (p.poisonNextTickAt <= now && p.poisonNextTickAt <= (p.poisonUntil || 0)) {
      const tickDmg = p.poisonTickDamage != null ? p.poisonTickDamage : POISON_TICK_DAMAGE;
      p.health = Math.max(0, p.health - tickDmg);
      p.poisonNextTickAt += POISON_TICK_MS;
    }
  }

  for (const p of room.players) {
    if (!p || (p.burnUntil || 0) <= now) continue;
    if (!p.burnNextTickAt || p.burnNextTickAt < now - BURN_TICK_MS * 3) {
      p.burnNextTickAt = now;
    }
    while (p.burnNextTickAt <= now && p.burnNextTickAt <= (p.burnUntil || 0)) {
      p.health = Math.max(0, p.health - BURN_TICK_DAMAGE);
      p.burnNextTickAt += BURN_TICK_MS;
    }
  }

  room.projectiles.forEach((shot) => {
    if (shot.trapSeedSpot) {
      if ((shot.expiresAt || 0) <= now) {
        shot.dead = true;
        return;
      }
      const target = room.players[shot.targetIdx];
      const hit =
        shot.x < target.x + PLAYER_BODY_W &&
        shot.x + shot.w > target.x &&
        shot.y < target.y + PLAYER_BODY_H &&
        shot.y + shot.h > target.y;
      if (hit) {
        target.poisonUntil = Math.max(target.poisonUntil || 0, now + TRAP_SEED_POISON_DURATION_MS);
        target.poisonNextTickAt = now + TRAP_SEED_POISON_TICK_MS;
        target.poisonTickDamage = TRAP_SEED_POISON_TICK_DAMAGE;
        shot.dead = true;
      }
      return;
    }
    shot.x += shot.vx;
    shot.y += shot.vy || 0;
    const shotRect = { x: shot.x, y: shot.y, w: shot.w, h: shot.h };
    for (const plat of platforms) {
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
    const target = room.players[shot.targetIdx];
    const hit =
      shot.x < target.x + PLAYER_BODY_W &&
      shot.x + shot.w > target.x &&
      shot.y < target.y + PLAYER_BODY_H &&
      shot.y + shot.h > target.y;
    if (hit) {
      target.health = Math.max(0, target.health - shot.damage);
      if (shot.fireBurst) {
        target.burnUntil = Math.max(target.burnUntil || 0, now + BURN_DURATION_MS);
        target.burnNextTickAt = now + BURN_TICK_MS;
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
        shot.x = Math.max(0, Math.min(VIEW_W - shot.w, shot.x));
      } else {
        shot.dead = true;
      }
    }
    if (shot.x < -100 || shot.x > 1200) shot.dead = true;
  });
  room.projectiles = room.projectiles.filter((s) => !s.dead);

  if (p0.health <= 0 || p1.health <= 0) {
    const winnerIdx = p0.health <= 0 ? 1 : 0;
    const loserIdx = winnerIdx === 0 ? 1 : 0;
    const winnerHealth = room.players[winnerIdx].health;
    const loserHealth = room.players[loserIdx].health;
    room.players[winnerIdx].score += 1;
    const s0 = room.players[0].score;
    const s1 = room.players[1].score;
    room.roundResult = {
      winnerIdx,
      loserIdx,
      winnerHealth,
      loserHealth,
      winnerScore: room.players[winnerIdx].score,
      loserScore: room.players[loserIdx].score,
    };
    if (s0 >= WINS_TO_END_MATCH || s1 >= WINS_TO_END_MATCH) {
      room.round = 1;
      room.players[0].score = 0;
      room.players[1].score = 0;
    } else {
      room.round += 1;
    }
    room.levelIndex = nextLevelIndex(room.levelIndex);
    room.intermissionStartedAt = Date.now();
    p0.health = playerMaxHp(p0);
    p1.health = playerMaxHp(p1);
      if (p0.groundPound) p0.groundPoundUsesLeft = 2 + (p0.groundPoundStack || 0);
      if (p1.groundPound) p1.groundPoundUsesLeft = 2 + (p1.groundPoundStack || 0);
      if (p0.teleport) p0.teleportUsesLeft = 1 + (p0.teleportStack || 0);
      if (p1.teleport) p1.teleportUsesLeft = 1 + (p1.teleportStack || 0);
      if (p0.trapSeed) p0.trapSeedUsesLeft = 2 + Math.max(0, (p0.trapSeedTier || 1) - 1);
      if (p1.trapSeed) p1.trapSeedUsesLeft = 2 + Math.max(0, (p1.trapSeedTier || 1) - 1);
      p0.orbAmmo = ORB_AMMO_PER_ROUND;
      p1.orbAmmo = ORB_AMMO_PER_ROUND;
      p0.lastShotAt = Date.now();
      p1.lastShotAt = Date.now();
    p0.x = 220;
    p1.x = 760;
    p0.y = PLAYER_TOP_Y;
    p1.y = PLAYER_TOP_Y;
    p0.vy = 0;
    p1.vy = 0;
    p0.onGround = true;
    p1.onGround = true;
    p0.jumpsUsed = 0;
    p1.jumpsUsed = 0;
    room.projectiles = [];
    room.players.forEach((p) => {
      p.charging = false;
      p.chargeStart = 0;
      p.fireBreathing = false;
      p.fireStartAt = 0;
      p.fireNextDamageAt = 0;
      p.fireCooldownUntil = 0;
      p.freezeRootUntil = 0;
      p.poisonUntil = 0;
      p.poisonNextTickAt = 0;
      p.poisonTickDamage = 0;
      p.burnUntil = 0;
      p.burnNextTickAt = 0;
    });
    if (s0 < WINS_TO_END_MATCH && s1 < WINS_TO_END_MATCH) {
      const loserPlayer = room.players[loserIdx];
      const pick = pickRandomBuffTripletServer(room.buffLastOfferedKey, loserPlayer);
      const triplet = sanitizeBuffTripletForPlayerServer(pick.triplet, loserPlayer);
      room.buffPickActive = true;
      room.buffPickLoser = loserIdx;
      room.buffPickOptions = triplet;
      room.buffLastOfferedKey = [...triplet].sort().join("|");
      room.buffPickInputUnlocked = false;
      room.buffUnlockAt = Date.now() + BUFF_PICK_GATE_MS;
      room.lockUntil = Date.now() + 10 * 60 * 1000;
    } else {
      room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
    }
  }
}

setInterval(() => {
  for (const room of rooms.values()) {
    updateRoom(room);
    io.to(room.id).emit("match:state", {
      round: room.round,
      levelIndex: normalizeLevelIndex(room.levelIndex),
      players: room.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        health: p.health,
        maxHealth: playerMaxHp(p),
        facing: p.facing,
        score: p.score,
        color: p.color,
        weapon: p.weapon || "sword",
        character: p.character || "knight",
        charging: p.charging,
        fireBreath: !!p.fireBreath,
        groundPound: !!p.groundPound,
        groundPoundUsesLeft: p.groundPoundUsesLeft != null ? p.groundPoundUsesLeft : 0,
        teleport: !!p.teleport,
        teleportUsesLeft: p.teleportUsesLeft != null ? p.teleportUsesLeft : 0,
        poisonUntil: p.poisonUntil || 0,
        burnUntil: p.burnUntil || 0,
        burnNextTickAt: p.burnNextTickAt || 0,
        freezeRootUntil: p.freezeRootUntil || 0,
        fireBreathing: !!p.fireBreathing,
        fireStartAt: p.fireStartAt || 0,
        orbAmmo: p.orbAmmo != null ? p.orbAmmo : ORB_AMMO_PER_ROUND,
        cardLoadout: Array.isArray(p.cardLoadout) ? p.cardLoadout : [],
      })),
      projectiles: room.projectiles,
      lockUntil: room.lockUntil,
      intermissionStartedAt: room.intermissionStartedAt,
      buffPickActive: room.buffPickActive,
      buffPickLoser: room.buffPickLoser,
      buffPickInputUnlocked: room.buffPickInputUnlocked,
      buffPickOptions: room.buffPickOptions,
      roundResult: room.roundResult,
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
      const self = onlineLobby.get(socket.userId);
      if (self) {
        socket.emit("lobby:self", { shareName: self.shareName, userId: socket.userId });
      }
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

    socket.on("cheat:blue_melee_burst", ({ hits }) => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const parsed = Number(hits);
      const grant = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : CHEAT_BLUE_MELEE_BURST_HITS;
      room.blueMeleeBurstHits = (room.blueMeleeBurstHits || 0) + grant;
    });

    socket.on("match:input", (payload) => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      const player = room.players[idx];
      const enemy = room.players[idx === 0 ? 1 : 0];
      if (!player) return;
      const attackerInFire = playerInEnemyFire(room, idx);

      player.controls = payload.controls || {};
      if (payload.weapon === "staff" || payload.weapon === "sword") {
        player.weapon = payload.weapon;
      }
      if (
        payload.character === "knight" ||
        payload.character === "dragon" ||
        payload.character === "funus"
      ) {
        player.character = payload.character;
      }
      if (payload.action === "melee") {
        if (attackerInFire) return;
        const weaponStats = weaponStatsForId(player.weapon);
        const now = Date.now();
        if (weaponStats.cooldownMs > 0 && now - (player.lastMeleeAt || 0) < weaponStats.cooldownMs) return;
        player.lastMeleeAt = now;
        const meleeRange = MELEE_RANGE * (player.meleeRangeScale != null ? player.meleeRangeScale : 1);
        const inRange = Math.abs(player.x - enemy.x) <= meleeRange;
        const facingToward = (enemy.x - player.x) * player.facing > 0;
        if (inRange && facingToward) {
          let meleeDamage = Math.round(weaponStats.damage * (player.damageMult || 1));
          meleeDamage = Math.round(meleeDamage * secondWindDamageMultiplier(player));
          if (idx === 0 && (room.blueMeleeBurstHits || 0) > 0) {
            meleeDamage = CHEAT_BLUE_MELEE_BURST_DAMAGE;
            room.blueMeleeBurstHits -= 1;
          }
          if (player.echoSlash) {
            const echoTier = player.echoSlashTier || 1;
            const echoFrac = ECHO_SLASH_BONUS_FRAC + Math.max(0, echoTier - 1) * ECHO_SLASH_STACK_BONUS_FRAC;
            meleeDamage += Math.max(1, Math.round(weaponStats.damage * (player.damageMult || 1) * echoFrac));
          }
          enemy.health = Math.max(0, enemy.health - meleeDamage);
          if (player.vampSlash) {
            const vampTier = player.vampSlashTier || 1;
            const healFrac = VAMP_SLASH_HEAL_FRAC + Math.max(0, vampTier - 1) * VAMP_SLASH_STACK_BONUS;
            player.health = Math.min(playerMaxHp(player), player.health + Math.max(1, Math.round(meleeDamage * healFrac)));
          }
          if (player.poisonSword) {
            enemy.poisonUntil = Math.max(enemy.poisonUntil || 0, now + POISON_DURATION_MS);
            enemy.poisonNextTickAt = now + POISON_TICK_MS;
            const tier = player.poisonSwordTier != null ? player.poisonSwordTier : 1;
            enemy.poisonTickDamage = POISON_TICK_DAMAGE + Math.max(0, tier - 1);
          }
          if (player.trapSeed) {
            const usesLeft = Number.isFinite(player.trapSeedUsesLeft) ? player.trapSeedUsesLeft : 0;
            if (usesLeft <= 0) return;
            player.trapSeedUsesLeft = usesLeft - 1;
            const trapTier = player.trapSeedTier || 1;
            const durMs = TRAP_SEED_SPOT_DURATION_MS + Math.max(0, trapTier - 1) * 1500;
            room.projectiles.push({
              trapSeedSpot: true,
              spawnedAt: now,
              expiresAt: now + durMs,
              x: Math.floor(enemy.x + (PLAYER_BODY_W - TRAP_SEED_SPOT_W) / 2),
              y: Math.floor(enemy.y + PLAYER_BODY_H - TRAP_SEED_SPOT_H),
              w: TRAP_SEED_SPOT_W,
              h: TRAP_SEED_SPOT_H,
              vx: 0,
              vy: 0,
              targetIdx: idx === 0 ? 1 : 0,
              damage: 0,
            });
          }
          const dir = enemy.x >= player.x ? 1 : -1;
          enemy.x = Math.max(0, Math.min(VIEW_W - PLAYER_BODY_W, enemy.x + dir * weaponStats.knockback));
        }
      }
      if (payload.action === "chargeStart") {
        if (attackerInFire) return;
        if (player.fireBreathing) return;
        player.charging = true;
        player.chargeStart = Date.now();
      }
      if (payload.action === "chargeRelease" && player.charging) {
        if (attackerInFire) {
          player.charging = false;
          return;
        }
        const heldMs = Date.now() - player.chargeStart;
        if (heldMs >= MELEE_QUICK_TAP_MS) {
          const orbCost = player.tripleShot ? 3 : 1;
          const ammo = player.orbAmmo != null ? player.orbAmmo : ORB_AMMO_PER_ROUND;
          if (!player.infiniteAmmo && ammo < orbCost) {
            player.charging = false;
            return;
          }
          const cappedMs = player.instantMaxCharge
            ? CHARGE_SCALE_MS
            : Math.min(heldMs, MAX_CHARGE_MS);
          const shot = chargedShotFromHeldMs(cappedMs);
          const centerY = 544;
          const freezeBonus = player.freezeRootBonusMs || 0;
          const instBonus = player.instantMaxCharge ? player.instantChargeBonusDmg || 0 : 0;
          const tripleBonus = player.tripleShot ? player.tripleDamageBonus || 0 : 0;
          const baseDamage =
            Math.round(shot.damage * (player.damageMult || 1) * secondWindDamageMultiplier(player)) +
            instBonus +
            tripleBonus;
          const freezeTriangleUntil = player.freezeShot ? Date.now() + FREEZE_HIT_ROOT_MS + freezeBonus : 0;
          const freezeRootMs = player.freezeShot ? FREEZE_HIT_ROOT_MS + freezeBonus : 0;
          const spawn = (vx, vy = 0, xOffset = 0) =>
            room.projectiles.push({
              x: player.x + 20 + xOffset,
              y: centerY - shot.h / 2,
              w: shot.w,
              h: shot.h,
              vx,
              vy,
              damage: baseDamage,
              freezeTriangleUntil,
              freezeRootMs,
              ricochetLeft: player.ricochetOrb ? 1 + Math.max(0, (player.ricochetOrbTier || 1) - 1) : 0,
              targetIdx: idx === 0 ? 1 : 0,
            });
          if (player.tripleShot) {
            spawn(player.facing * shot.speed, 0);
            spawn(player.facing * shot.speed * 0.92, -0.45);
            spawn(player.facing * shot.speed * 0.92, 0.45);
          } else {
            spawn(player.facing * shot.speed, 0);
          }
          if (player.freezeShot) {
            const dir = player.facing >= 0 ? 1 : -1;
            spawn(player.facing * shot.speed, 0, -dir * FREEZE_TRAIL_ORB_OFFSET);
          }
          if (!player.infiniteAmmo) {
            player.orbAmmo = ammo - orbCost;
          } else {
            player.orbAmmo = ORB_AMMO_PER_ROUND;
          }
          player.lastShotAt = Date.now();
        }
        player.charging = false;
      }
      if (payload.action === "fireStart" && player.fireBreath && playerIsDragon(player)) {
        if (attackerInFire) return;
        if ((player.fireCooldownUntil || 0) > Date.now()) return;
        player.fireBreathing = true;
        player.fireStartAt = Date.now();
        player.fireNextDamageAt = Date.now();
        player.charging = false;
      }
      if (payload.action === "fireEnd") {
        if (player.fireBreathing) {
          player.fireCooldownUntil = Math.max(player.fireCooldownUntil || 0, Date.now() + FIRE_BREATH_COOLDOWN_MS);
          spawnFireBreathBurstForPlayer(room, idx);
        }
        player.fireBreathing = false;
      }
      if (payload.action === "groundPound" && player.groundPound) {
        if (attackerInFire) return;
        const usesLeft = Number.isFinite(player.groundPoundUsesLeft) ? player.groundPoundUsesLeft : 0;
        if (usesLeft <= 0) return;
        player.groundPoundUsesLeft = usesLeft - 1;
        const atkLayer = groundedLayerY(player);
        const defLayer = groundedLayerY(enemy);
        if (atkLayer == null || defLayer == null || Math.abs(atkLayer - defLayer) > GROUND_POUND_LAYER_EPSILON) {
          return;
        }
        const dmg = Math.max(1, Math.round(playerMaxHp(enemy) * GROUND_POUND_DAMAGE_FRACTION));
        enemy.health = Math.max(0, enemy.health - dmg);
        enemy.vy = Math.min(enemy.vy || 0, GROUND_POUND_LAUNCH_VY);
        enemy.freezeRootUntil = Math.max(enemy.freezeRootUntil || 0, Date.now() + GROUND_POUND_FREEZE_MS);
        enemy.onGround = false;
        enemy.jumpsUsed = Math.max(enemy.jumpsUsed || 0, 1);
      }
      if (payload.action === "teleport" && player.teleport) {
        if (attackerInFire) return;
        const usesLeft = Number.isFinite(player.teleportUsesLeft) ? player.teleportUsesLeft : 0;
        if (usesLeft <= 0) return;
        const dir = enemy.facing || (enemy.x >= player.x ? 1 : -1);
        const targetX = Math.max(0, Math.min(VIEW_W - PLAYER_BODY_W, enemy.x - dir * (PLAYER_BODY_W + 10)));
        player.teleportUsesLeft = usesLeft - 1;
        player.x = targetX;
        player.y = enemy.y;
        player.vx = 0;
      }
    });

    socket.on("buff:pick", ({ buffId, replaceBuffId }) => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room || !room.buffPickActive || !room.buffPickInputUnlocked) return;
      const loser = room.buffPickLoser;
      if (room.players[loser].socketId !== socket.id) return;
      if (!Array.isArray(room.buffPickOptions) || !room.buffPickOptions.includes(buffId)) return;
      const pl = room.players[loser];
      const needKeyBindPause =
        (buffId === "fireBreath" && !pl.fireBreath) ||
        (buffId === "groundPound" && !pl.groundPound) ||
        (buffId === "teleport" && !pl.teleport);
      const applied = applyBuffToPlayerOnline(pl, buffId, replaceBuffId || null);
      if (!applied.ok) return;
      room.buffPickActive = false;
      room.buffPickInputUnlocked = false;
      room.buffUnlockAt = 0;
      if (
        needKeyBindPause &&
        (buffId === "fireBreath" || buffId === "groundPound" || buffId === "teleport")
      ) {
        room.intermissionStartedAt = 0;
        room.lockUntil = Date.now() + 10 * 60 * 1000;
      } else {
        room.intermissionStartedAt = Date.now();
        room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
      }
    });

    socket.on("fire:bind:done", () => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (!room.players[idx]?.fireBreath) return;
      room.intermissionStartedAt = Date.now();
      room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
    });
    socket.on("ground:bind:done", () => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (!room.players[idx]?.groundPound) return;
      room.intermissionStartedAt = Date.now();
      room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
    });
    socket.on("teleport:bind:done", () => {
      const room = [...rooms.values()].find((r) => r.players.some((p) => p.socketId === socket.id));
      if (!room) return;
      const idx = room.players.findIndex((p) => p.socketId === socket.id);
      if (!room.players[idx]?.teleport) return;
      room.intermissionStartedAt = Date.now();
      room.lockUntil = room.intermissionStartedAt + ROUND_INTERMISSION_MS;
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
