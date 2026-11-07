const packListEl = document.getElementById("packList");
const statusEl = document.getElementById("statusLine");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

let live = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function selectionFromForm() {
  const packs = {};
  for (const pack of live.packs) {
    const card = packListEl.querySelector(`[data-pack="${pack.id}"]`);
    const colors = {};
    const weapons = {};
    card.querySelectorAll("[data-color]").forEach((input) => {
      colors[input.dataset.color] = input.checked;
    });
    card.querySelectorAll("[data-weapon]").forEach((input) => {
      weapons[input.dataset.weapon] = input.checked;
    });
    packs[pack.id] = {
      enabled: card.querySelector("[data-pack-enabled]").checked,
      colors,
      weapons,
    };
  }
  return AddonCatalog.sanitizeSelection({ version: 1, packs });
}

function render() {
  packListEl.innerHTML = "";
  const resolved = AddonCatalog.resolveConfig(live.selection);
  for (const pack of live.packs) {
    const row = live.selection.packs[pack.id];
    const card = document.createElement("section");
    card.className = `pack-card${row.enabled ? "" : " off"}`;
    card.dataset.pack = pack.id;

    const enabledColors = pack.colors.filter((color) => row.colors[color.id]);
    const enabledWeapons = pack.weapons.filter((weapon) => row.weapons[weapon.id]);
    const note =
      row.enabled && (!enabledColors.length || !enabledWeapons.length)
        ? "This pack stays out of the game until it has at least one color and one weapon."
        : "";

    card.innerHTML = `
      <div class="pack-head">
        <div>
          <h2>${pack.name}</h2>
          <p>${pack.blurb}</p>
        </div>
        <label class="pack-toggle">
          <input data-pack-enabled type="checkbox" ${row.enabled ? "checked" : ""} />
          In the game
        </label>
      </div>
      <div class="option-row">
        <p class="option-label">Color add-ons</p>
        ${pack.colors
          .map(
            (color) => `
          <label class="chip">
            <input data-color="${color.id}" type="checkbox" ${row.colors[color.id] ? "checked" : ""} />
            <i class="swatch" style="background:${color.swatch}"></i>
            ${color.name}
          </label>`
          )
          .join("")}
      </div>
      <div class="option-row">
        <p class="option-label">Weapon add-ons</p>
        ${pack.weapons
          .map(
            (weapon) => `
          <label class="chip">
            <input data-weapon="${weapon.id}" type="checkbox" ${row.weapons[weapon.id] ? "checked" : ""} />
            <canvas data-weapon-preview="${weapon.id}" width="96" height="48"></canvas>
            <span>${weapon.name}<br />${weapon.damage} dmg</span>
          </label>`
          )
          .join("")}
      </div>
      <div class="preview-row" data-previews></div>
      ${note ? `<p class="pack-note">${note}</p>` : ""}
    `;
    packListEl.appendChild(card);

    const previewColor = (enabledColors[0] || pack.colors[0]).id;
    card.querySelectorAll("[data-weapon-preview]").forEach((canvas) => {
      Fighters.paintWeaponPreview(canvas, canvas.dataset.weaponPreview, previewColor);
    });

    const previewRow = card.querySelector("[data-previews]");
    const shown = resolved.playable.filter((entry) => entry.packId === pack.id);
    for (const entry of shown) {
      const figure = document.createElement("figure");
      figure.className = "preview-card";
      const canvas = document.createElement("canvas");
      canvas.width = 72;
      canvas.height = 120;
      Fighters.paintFighterPreview(canvas, entry.body, entry.color);
      const caption = document.createElement("span");
      caption.textContent = entry.label;
      figure.append(canvas, caption);
      previewRow.appendChild(figure);
    }
  }
}

function readFormIntoLive() {
  live.selection = selectionFromForm();
}

async function loadConfig() {
  const response = await fetch("/api/addon-config", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load add-on config");
  live = await response.json();
  render();
  const when = live.updatedAt ? ` Last saved ${new Date(live.updatedAt).toLocaleString()}.` : "";
  setStatus(`These packs are what the game on this server offers.${when}`);
}

packListEl.addEventListener("change", () => {
  readFormIntoLive();
  render();
  setStatus("Unsaved changes. Save loadout to update the game.");
});

saveBtn.addEventListener("click", async () => {
  readFormIntoLive();
  saveBtn.disabled = true;
  try {
    const response = await fetch("/api/addon-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(live.selection),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Save failed");
    live = payload;
    render();
    setStatus(`Saved. New matches on this server use this loadout. ${new Date(payload.updatedAt).toLocaleString()}.`);
  } catch (err) {
    setStatus(err.message || "Save failed");
  } finally {
    saveBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  live.selection = AddonCatalog.defaultSelection();
  render();
  setStatus("All add-ons checked. Save loadout to publish that.");
});

loadConfig().catch((err) => {
  setStatus(err.message || "Could not load add-on config");
});
