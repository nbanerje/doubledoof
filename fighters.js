/**
 * Chibi fighters and add-on weapons drawn to match the character sheets.
 * Loaded in the browser before game.js. Exposes window.Fighters.
 */
(function attachFighters() {
  const PALETTES = {
    "orc:forest": {
      skin: "#7dae3a",
      skinDark: "#4e7a24",
      hair: "#24160f",
      fur: "#6d4330",
      furDark: "#3e2618",
      bone: "#f0ddb0",
      metal: "#e1b23a",
      eye: "#1a120c",
      wrap: "#5a3824",
      extra: "#c8e07a",
    },
    "orc:frost": {
      skin: "#8eb4e0",
      skinDark: "#5d7eab",
      hair: "#f4f7fb",
      fur: "#d7e6f4",
      furDark: "#8eabca",
      bone: "#f7fbff",
      metal: "#e2b84a",
      eye: "#163e86",
      wrap: "#3d5168",
      extra: "#7fd4ff",
    },
    "asura:royal": {
      skin: "#d4924a",
      skinDark: "#8d5a28",
      hair: "#1a120e",
      cloth: "#6a32a4",
      clothDark: "#3c1868",
      gold: "#f0c14a",
      gem: "#e4333a",
      eye: "#f2c94c",
      trim: "#ffe08a",
      flame: null,
    },
    "asura:inferno": {
      skin: "#6e3838",
      skinDark: "#3a1c1c",
      hair: "#14080c",
      cloth: "#1a1014",
      clothDark: "#0c080a",
      gold: "#c42828",
      gem: "#ff3a22",
      eye: "#ff3a22",
      trim: "#ff5a32",
      flame: "#ff3a18",
    },
    "minotaur:hide": {
      fur: "#8d552c",
      furDark: "#5c3418",
      hair: "#4a2c16",
      horn: "#f4e7c8",
      nose: "#e6a828",
      cloth: "#6b3a28",
      belt: "#c4a05a",
      buckle: "#e6b423",
      eye: "#1a120c",
      accent: "#c45a3a",
    },
    "minotaur:corrupt": {
      fur: "#3a3a42",
      furDark: "#1c1c22",
      hair: "#141418",
      horn: "#f4efe6",
      nose: "#e0a020",
      cloth: "#8a1830",
      belt: "#2a2a30",
      buckle: "#eceff4",
      eye: "#ff2a2a",
      accent: "#ff3a3a",
    },
    "minotaur:frost": {
      fur: "#d5e6f4",
      furDark: "#7f9db8",
      hair: "#4d6d90",
      horn: "#f7f4ee",
      nose: "#e0a020",
      cloth: "#c5d8ea",
      belt: "#3a4558",
      buckle: "#e7f2fb",
      eye: "#1a6ad4",
      accent: "#7fd4ff",
    },
  };

  const WEAPON_INK = {
    forest: { wood: "#6b4226", woodDark: "#3e2616", metal: "#cfd3da", spike: "#f4efe4", accent: "#e1b23a", gem: "#e1b23a" },
    frost: { wood: "#6a543c", woodDark: "#3d3428", metal: "#e7f3fb", spike: "#ffffff", accent: "#7fd4ff", gem: "#7fd4ff" },
    royal: { wood: "#4a2868", woodDark: "#2a143c", metal: "#f0c14a", spike: "#fff1c2", accent: "#7a3cff", gem: "#e4333a" },
    inferno: { wood: "#2a1214", woodDark: "#14080a", metal: "#3a3a42", spike: "#ff5a32", accent: "#ff2a18", gem: "#ff3a22" },
    hide: { wood: "#6b4226", woodDark: "#3e2616", metal: "#d5dbe3", spike: "#f6f7f8", accent: "#c45a3a", gem: "#e23b3b" },
    corrupt: { wood: "#3a2428", woodDark: "#1a1014", metal: "#4a4a52", spike: "#ff4a4a", accent: "#ff2a2a", gem: "#ff1e1e" },
  };

  const spriteCache = new Map();

  function paletteFor(body, color) {
    return PALETTES[`${body}:${color}`] || PALETTES["orc:forest"];
  }

  function inkFor(color) {
    return WEAPON_INK[color] || WEAPON_INK.forest;
  }

  function px(g, x, y, w, h, color) {
    if (!color) return;
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawOrc(g, pal) {
    px(g, 18, 108, 28, 6, "rgba(0,0,0,0.35)");
    px(g, 22, 78, 12, 28, pal.skinDark);
    px(g, 40, 78, 12, 28, pal.skin);
    px(g, 20, 96, 14, 10, pal.wrap);
    px(g, 40, 96, 14, 10, pal.wrap);
    px(g, 16, 70, 36, 16, pal.fur);
    px(g, 20, 78, 28, 10, pal.furDark);
    px(g, 18, 40, 32, 36, pal.skin);
    px(g, 14, 48, 10, 22, pal.skinDark);
    px(g, 46, 48, 10, 22, pal.skin);
    px(g, 14, 66, 12, 8, pal.wrap);
    px(g, 44, 66, 12, 8, pal.wrap);
    px(g, 28, 62, 12, 10, pal.bone);
    px(g, 31, 65, 6, 4, pal.furDark);
    px(g, 16, 36, 36, 10, pal.furDark);
    px(g, 22, 32, 8, 8, pal.bone);
    px(g, 34, 32, 8, 8, pal.bone);
    px(g, 14, 8, 38, 32, pal.skin);
    px(g, 18, 0, 8, 14, pal.hair);
    px(g, 28, -2, 10, 16, pal.hair);
    px(g, 40, 2, 8, 12, pal.hair);
    if (pal.extra && pal.hair === "#f4f7fb") {
      px(g, 28, 8, 10, 6, pal.extra);
      px(g, 20, 52, 6, 8, pal.extra);
      px(g, 44, 58, 6, 8, pal.extra);
    }
    px(g, 22, 18, 8, 6, "#f4f7ea");
    px(g, 38, 18, 8, 6, "#f4f7ea");
    px(g, 24, 20, 4, 4, pal.eye);
    px(g, 40, 20, 4, 4, pal.eye);
    px(g, 20, 16, 12, 3, pal.hair);
    px(g, 36, 16, 12, 3, pal.hair);
    px(g, 26, 30, 16, 6, pal.skinDark);
    px(g, 22, 34, 6, 8, pal.bone);
    px(g, 40, 34, 6, 8, pal.bone);
    px(g, 10, 20, 6, 6, pal.metal);
    px(g, 8, 24, 4, 8, pal.metal);
  }

  function drawAsura(g, pal) {
    if (pal.flame) {
      px(g, 8, 78, 10, 18, pal.flame);
      px(g, 52, 74, 12, 22, pal.flame);
      px(g, 18, 92, 8, 12, "#ffb020");
      px(g, 46, 90, 8, 14, "#ffb020");
    }
    px(g, 6, 48, 22, 48, pal.cloth);
    px(g, 44, 46, 22, 52, pal.clothDark);
    px(g, 8, 46, 54, 6, pal.gold);
    px(g, 22, 86, 10, 22, pal.skinDark);
    px(g, 36, 86, 10, 22, pal.skin);
    px(g, 20, 104, 12, 6, pal.gold);
    px(g, 36, 104, 12, 6, pal.gold);
    px(g, 20, 40, 28, 40, pal.skin);
    px(g, 24, 48, 20, 16, pal.skinDark);
    px(g, 22, 70, 24, 8, pal.gold);
    px(g, 30, 68, 8, 10, pal.gem);
    px(g, 4, 46, 14, 8, pal.skin);
    px(g, 0, 36, 12, 8, pal.skinDark);
    px(g, 2, 28, 12, 8, pal.skin);
    px(g, 50, 48, 14, 8, pal.skin);
    px(g, 54, 38, 12, 8, pal.skinDark);
    px(g, 52, 28, 12, 8, pal.skin);
    px(g, 0, 42, 8, 4, pal.gold);
    px(g, 0, 32, 8, 4, pal.gold);
    px(g, 2, 24, 8, 4, pal.gold);
    px(g, 56, 44, 8, 4, pal.gold);
    px(g, 58, 34, 8, 4, pal.gold);
    px(g, 56, 24, 8, 4, pal.gold);
    px(g, 18, 16, 30, 26, pal.skin);
    px(g, 16, 28, 34, 8, pal.hair);
    px(g, 22, 36, 22, 6, pal.hair);
    px(g, 30, 40, 6, 8, pal.hair);
    px(g, 22, 22, 6, 5, "#fff6d8");
    px(g, 36, 22, 6, 5, "#fff6d8");
    px(g, 23, 23, 4, 3, pal.eye);
    px(g, 37, 23, 4, 3, pal.eye);
    px(g, 16, 4, 34, 10, pal.gold);
    px(g, 22, 0, 22, 8, pal.gold);
    px(g, 28, 2, 10, 8, pal.gem);
    px(g, 24, 14, 6, 4, pal.gold);
    px(g, 36, 14, 6, 4, pal.gold);
    px(g, 18, 46, 6, 4, pal.gold);
    px(g, 42, 46, 6, 4, pal.gold);
  }

  function drawMinotaur(g, pal) {
    px(g, 16, 112, 32, 6, "rgba(0,0,0,0.35)");
    px(g, 8, 78, 8, 16, pal.furDark);
    px(g, 18, 84, 12, 26, pal.furDark);
    px(g, 36, 84, 12, 26, pal.fur);
    px(g, 16, 104, 16, 8, pal.furDark);
    px(g, 36, 104, 16, 8, pal.furDark);
    px(g, 14, 70, 38, 18, pal.cloth);
    px(g, 18, 64, 30, 8, pal.belt);
    px(g, 28, 62, 10, 12, pal.buckle);
    if (pal.eye === "#ff2a2a") px(g, 30, 66, 6, 6, pal.bone || "#f4efe6");
    else if (pal.accent === "#7fd4ff") px(g, 30, 65, 6, 6, pal.accent);
    px(g, 16, 40, 34, 32, pal.fur);
    px(g, 8, 48, 12, 18, pal.furDark);
    px(g, 46, 48, 12, 18, pal.fur);
    px(g, 8, 62, 12, 8, pal.belt);
    px(g, 46, 62, 12, 8, pal.belt);
    px(g, 14, 12, 36, 32, pal.fur);
    px(g, 18, 6, 10, 16, pal.hair);
    px(g, 30, 4, 16, 14, pal.hair);
    px(g, 8, 8, 8, 22, pal.horn);
    px(g, 48, 8, 8, 22, pal.horn);
    px(g, 6, 6, 8, 8, pal.accent === "#ff3a3a" ? pal.accent : pal.horn);
    px(g, 50, 6, 8, 8, pal.accent === "#ff3a3a" ? pal.accent : pal.horn);
    px(g, 22, 22, 7, 6, "#f7f3ea");
    px(g, 36, 22, 7, 6, "#f7f3ea");
    px(g, 24, 23, 4, 4, pal.eye);
    px(g, 38, 23, 4, 4, pal.eye);
    px(g, 26, 32, 14, 8, pal.furDark);
    px(g, 24, 38, 18, 6, pal.nose);
    px(g, 30, 36, 6, 6, pal.buckle);
    if (pal.accent === "#ff3a3a") {
      px(g, 20, 48, 8, 4, pal.accent);
      px(g, 40, 56, 8, 4, pal.accent);
    }
    if (pal.accent === "#7fd4ff") {
      px(g, 18, 50, 6, 6, pal.accent);
      px(g, 44, 58, 6, 6, pal.accent);
    }
  }

  const DRAWERS = { orc: drawOrc, asura: drawAsura, minotaur: drawMinotaur };

  function fighterSprite(body, color) {
    const key = `${body}:${color}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = 72;
    canvas.height = 120;
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.translate(4, 4);
    const draw = DRAWERS[body] || drawOrc;
    draw(g, paletteFor(body, color));
    spriteCache.set(key, canvas);
    return canvas;
  }

  function isAddonCharacter(id) {
    const parsed = window.AddonCatalog && AddonCatalog.parseCharacterId(id);
    return !!(parsed && DRAWERS[parsed.body] && PALETTES[id]);
  }

  function drawWorldFighter(ctx, p, characterId, pose) {
    const parsed = AddonCatalog.parseCharacterId(characterId);
    if (!parsed) return;
    const sprite = fighterSprite(parsed.body, parsed.color);
    const fac = pose.facing || p.facing || 1;
    const bob = pose.moving ? Math.round(Math.sin((pose.now || 0) * 0.014) * 2) : 0;
    const lean = pose.attackPose ? 4 : 0;
    const dw = 58;
    const dh = 92;
    const footX = p.x + 18 + pose.freezeVibeX - (pose.recoil ? 4 * fac : 0) + fac * lean;
    const footY = pose.baseY + 48 + pose.freezeVibeY + bob;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(footX, footY);
    ctx.scale(fac, 1);
    ctx.drawImage(sprite, -dw / 2, -dh, dw, dh);
    ctx.restore();
  }

  function drawWeaponLocal(g, weaponId, color, swingT) {
    const ink = inkFor(color);
    const t = swingT == null ? 0.4 : swingT;
    if (weaponId === "club") {
      px(g, 0, -3, 16, 6, ink.wood);
      px(g, 14, -8, 16, 16, ink.woodDark);
      px(g, 16, -12, 4, 6, ink.spike);
      px(g, 24, -12, 4, 6, ink.spike);
      px(g, 20, 6, 4, 6, ink.spike);
      px(g, 28, -2, 5, 5, ink.spike);
    } else if (weaponId === "stone-axe") {
      px(g, 0, -3, 22, 6, ink.wood);
      px(g, 18, -16, 18, 28, ink.metal);
      px(g, 20, -14, 8, 8, ink.woodDark);
      px(g, 30, -8, 6, 14, ink.spike);
    } else if (weaponId === "flail") {
      const lag = Math.sin(t * Math.PI) * 10;
      px(g, 0, -3, 14, 6, ink.wood);
      px(g, 12, -2, 4, 4, ink.metal);
      px(g, 16, 0, 4, 4, ink.metal);
      px(g, 20, 4 + lag * 0.2, 4, 4, ink.metal);
      px(g, 22, 10 + lag * 0.35, 14, 14, ink.woodDark);
      px(g, 20, 8 + lag * 0.35, 4, 4, ink.spike);
      px(g, 34, 12 + lag * 0.35, 4, 4, ink.spike);
      px(g, 26, 22 + lag * 0.35, 4, 4, ink.spike);
    } else if (weaponId === "scimitar") {
      px(g, 0, -3, 8, 8, ink.accent);
      px(g, 6, -4, 8, 6, ink.gem);
      px(g, 10, -2, 28, 5, ink.metal);
      px(g, 28, -10, 12, 8, ink.metal);
      px(g, 36, -14, 6, 6, ink.spike);
    } else if (weaponId === "bow") {
      px(g, 4, -18, 6, 36, ink.wood);
      px(g, 8, -16, 4, 6, ink.metal);
      px(g, 8, 10, 4, 6, ink.metal);
      px(g, 10, -2, 26, 3, ink.accent);
      px(g, 30, -6, 10, 4, ink.gem);
      px(g, 36, -4, 8, 3, ink.spike);
    } else if (weaponId === "sun-mace") {
      px(g, 0, -3, 18, 6, ink.wood);
      px(g, 16, -10, 18, 20, ink.metal);
      px(g, 22, -4, 8, 8, ink.gem);
      px(g, 20, -14, 5, 6, ink.spike);
      px(g, 30, -14, 5, 6, ink.spike);
      px(g, 18, 8, 5, 6, ink.spike);
      px(g, 30, 8, 5, 6, ink.spike);
    } else if (weaponId === "double-axe") {
      px(g, 8, -3, 28, 6, ink.wood);
      px(g, 4, -16, 16, 14, ink.metal);
      px(g, 4, 2, 16, 14, ink.metal);
      px(g, 0, -12, 6, 8, ink.accent);
      px(g, 0, 4, 6, 8, ink.accent);
    } else if (weaponId === "bull-mace") {
      px(g, 0, -3, 16, 6, ink.wood);
      px(g, 14, -9, 16, 18, ink.metal);
      px(g, 12, -12, 5, 5, ink.spike);
      px(g, 22, -13, 5, 5, ink.spike);
      px(g, 28, -4, 5, 5, ink.spike);
      px(g, 18, 8, 5, 5, ink.spike);
    } else if (weaponId === "broadsword") {
      px(g, 0, -4, 8, 10, ink.metal);
      px(g, 6, -3, 30, 6, ink.spike);
      px(g, 10, -1, 22, 2, ink.accent);
      px(g, 34, -5, 6, 10, ink.metal);
    } else if (weaponId === "spear") {
      px(g, 0, -2, 36, 4, ink.wood);
      px(g, 32, -7, 14, 14, ink.metal);
      px(g, 42, -3, 8, 6, ink.spike);
      px(g, 30, -2, 6, 4, ink.accent);
    }
  }

  function paintFighterPreview(canvas, body, color) {
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    const sprite = fighterSprite(body, color);
    const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height);
    const dw = sprite.width * scale;
    const dh = sprite.height * scale;
    g.drawImage(sprite, (canvas.width - dw) / 2, canvas.height - dh - 2, dw, dh);
  }

  function paintWeaponPreview(canvas, weaponId, color) {
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save();
    g.translate(canvas.width * 0.18, canvas.height * 0.48);
    g.scale(1.35, 1.35);
    drawWeaponLocal(g, weaponId, color, 0.35);
    g.restore();
  }

  function drawWorldWeapon(ctx, weaponId, color, swingT) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(1.15, 1.15);
    drawWeaponLocal(ctx, weaponId, color, swingT);
    ctx.restore();
  }

  window.Fighters = {
    isAddonCharacter,
    drawWorldFighter,
    drawWorldWeapon,
    paintFighterPreview,
    paintWeaponPreview,
    paletteFor,
  };
})();
