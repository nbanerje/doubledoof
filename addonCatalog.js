/**
 * Add-on packs for characters, color variants, and weapons.
 * Shared by the game server (require) and the browser (window.AddonCatalog).
 */
(function attachAddonCatalog(factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.AddonCatalog = api;
})(function buildAddonCatalog() {
  const ADDON_PACKS = [
    {
      id: "orc",
      name: "Orc",
      blurb: "Tusked brawler with a fur cloak and a skull belt.",
      colors: [
        { id: "forest", name: "Forest", swatch: "#7dae3a" },
        { id: "frost", name: "Frost", swatch: "#8eb4e0" },
      ],
      weapons: [
        { id: "club", name: "Spiked Club", damage: 12, knockback: 62, cooldownMs: 280, swingDurationMs: 240, rangeScale: 0.92 },
        { id: "stone-axe", name: "Stone Axe", damage: 14, knockback: 70, cooldownMs: 340, swingDurationMs: 260, rangeScale: 1.08 },
        { id: "flail", name: "Flail", damage: 11, knockback: 58, cooldownMs: 320, swingDurationMs: 280, rangeScale: 1.34 },
      ],
    },
    {
      id: "asura",
      name: "Asura",
      blurb: "Six-armed crowned fighter. Royal gold or inferno red.",
      colors: [
        { id: "royal", name: "Royal", swatch: "#7a3ea8" },
        { id: "inferno", name: "Inferno", swatch: "#e23a2a" },
      ],
      weapons: [
        { id: "scimitar", name: "Scimitar", damage: 9, knockback: 48, cooldownMs: 180, swingDurationMs: 180, rangeScale: 1.08 },
        { id: "bow", name: "Bow", damage: 8, knockback: 28, cooldownMs: 220, swingDurationMs: 200, rangeScale: 1.48 },
        { id: "sun-mace", name: "Sun Mace", damage: 15, knockback: 74, cooldownMs: 380, swingDurationMs: 280, rangeScale: 1.02 },
      ],
    },
    {
      id: "minotaur",
      name: "Minotaur",
      blurb: "Horned charger. Hide, corrupt, and frost colors.",
      colors: [
        { id: "hide", name: "Hide", swatch: "#8a4e2a" },
        { id: "corrupt", name: "Corrupt", swatch: "#3a3a42" },
        { id: "frost", name: "Frost", swatch: "#d5e6f4" },
      ],
      weapons: [
        { id: "double-axe", name: "Double Axe", damage: 16, knockback: 68, cooldownMs: 360, swingDurationMs: 270, rangeScale: 1.12 },
        { id: "bull-mace", name: "Bull Mace", damage: 13, knockback: 72, cooldownMs: 300, swingDurationMs: 250, rangeScale: 0.96 },
        { id: "broadsword", name: "Broadsword", damage: 11, knockback: 52, cooldownMs: 200, swingDurationMs: 200, rangeScale: 1.12 },
        { id: "spear", name: "Spear", damage: 10, knockback: 40, cooldownMs: 190, swingDurationMs: 190, rangeScale: 1.55 },
      ],
    },
  ];

  const CORE_CHARACTERS = [
    { id: "knight", name: "Knight" },
    { id: "dragon", name: "Dragon" },
    { id: "funus", name: "Funus" },
  ];

  function defaultSelection() {
    const packs = {};
    for (const pack of ADDON_PACKS) {
      packs[pack.id] = {
        enabled: true,
        colors: Object.fromEntries(pack.colors.map((color) => [color.id, true])),
        weapons: Object.fromEntries(pack.weapons.map((weapon) => [weapon.id, true])),
      };
    }
    return { version: 1, packs };
  }

  function sanitizeSelection(input) {
    const next = defaultSelection();
    const src = input && typeof input === "object" && input.packs ? input.packs : {};
    for (const pack of ADDON_PACKS) {
      const row = src[pack.id];
      if (!row || typeof row !== "object") continue;
      if (typeof row.enabled === "boolean") next.packs[pack.id].enabled = row.enabled;
      if (row.colors && typeof row.colors === "object") {
        for (const color of pack.colors) {
          if (typeof row.colors[color.id] === "boolean") next.packs[pack.id].colors[color.id] = row.colors[color.id];
        }
      }
      if (row.weapons && typeof row.weapons === "object") {
        for (const weapon of pack.weapons) {
          if (typeof row.weapons[weapon.id] === "boolean") next.packs[pack.id].weapons[weapon.id] = row.weapons[weapon.id];
        }
      }
    }
    return next;
  }

  function weaponRecord(weapon) {
    return {
      id: weapon.id,
      name: weapon.name,
      damage: weapon.damage,
      knockback: weapon.knockback,
      cooldownMs: weapon.cooldownMs,
      swingDurationMs: weapon.swingDurationMs,
      rangeScale: weapon.rangeScale || 1,
    };
  }

  function resolveConfig(selection) {
    const clean = sanitizeSelection(selection);
    const playable = [];
    for (const pack of ADDON_PACKS) {
      const row = clean.packs[pack.id];
      if (!row.enabled) continue;
      const weapons = pack.weapons.filter((weapon) => row.weapons[weapon.id]).map(weaponRecord);
      if (!weapons.length) continue;
      for (const color of pack.colors) {
        if (!row.colors[color.id]) continue;
        playable.push({
          id: `${pack.id}:${color.id}`,
          label: `${pack.name} · ${color.name}`,
          body: pack.id,
          color: color.id,
          packId: pack.id,
          enabled: true,
          weapons,
        });
      }
    }
    return {
      version: 1,
      selection: clean,
      packs: ADDON_PACKS,
      playable,
      core: {
        characters: CORE_CHARACTERS,
        weapons: [
          { id: "sword", name: "Sword" },
          { id: "staff", name: "Staff" },
        ],
      },
    };
  }

  function isCoreCharacter(id) {
    return id === "knight" || id === "dragon" || id === "funus";
  }

  function parseCharacterId(id) {
    const text = String(id || "");
    const splitAt = text.indexOf(":");
    if (splitAt <= 0) return null;
    return { body: text.slice(0, splitAt), color: text.slice(splitAt + 1) };
  }

  function weaponStatsForAddon(id) {
    for (const pack of ADDON_PACKS) {
      const weapon = pack.weapons.find((entry) => entry.id === id);
      if (!weapon) continue;
      return {
        id: weapon.id,
        damage: weapon.damage,
        knockback: weapon.knockback,
        cooldownMs: weapon.cooldownMs,
        swingDurationMs: weapon.swingDurationMs,
        rangeScale: weapon.rangeScale || 1,
        frames: 0,
      };
    }
    return null;
  }

  function characterAllowed(id, selection) {
    if (isCoreCharacter(id)) return true;
    const parsed = parseCharacterId(id);
    if (!parsed) return false;
    return resolveConfig(selection).playable.some((entry) => entry.id === id);
  }

  function weaponAllowed(weaponId, characterId, selection) {
    if (isCoreCharacter(characterId) || !characterId) return weaponId === "sword" || weaponId === "staff";
    const row = resolveConfig(selection).playable.find((entry) => entry.id === characterId);
    if (!row) return false;
    return row.weapons.some((weapon) => weapon.id === weaponId);
  }

  return {
    ADDON_PACKS,
    CORE_CHARACTERS,
    defaultSelection,
    sanitizeSelection,
    resolveConfig,
    isCoreCharacter,
    parseCharacterId,
    weaponStatsForAddon,
    characterAllowed,
    weaponAllowed,
  };
});
