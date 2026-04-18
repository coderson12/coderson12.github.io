// --- state ---
let coins = 0;
let basePerSecond = 0.1;
let bonusPerSecond = 0;
let autoRolling = false;
let lastTickTime = Date.now();
let equippedRarityId = null;

// --- rarities ---
// many unique names, some with auras (change background/theme)
const rarities = [
  { id: "dust", name: "Dust", chance: 0.5, coinsOnRoll: 0.2, boostPerSec: 0, aura: null, desc: "Barely anything. +0.20 coins on hit." },
  { id: "pebble", name: "Pebble", chance: 0.18, coinsOnRoll: 0.4, boostPerSec: 0.02, aura: null, desc: "Small weight. +0.40 coins and +0.02 coins/s when equipped." },
  { id: "spark", name: "Spark", chance: 0.1, coinsOnRoll: 0.8, boostPerSec: 0.05, aura: null, desc: "Tiny flash. +0.80 coins and +0.05 coins/s when equipped." },
  { id: "air", name: "Air", chance: 0.06, coinsOnRoll: 1.5, boostPerSec: 0.1, aura: null, desc: "Light as nothing. +1.50 coins and +0.10 coins/s when equipped." },
  { id: "ember", name: "Ember", chance: 0.04, coinsOnRoll: 3, boostPerSec: 0.25, aura: "solar", desc: "A tiny spark. +3 coins and +0.25 coins/s. Solar aura when equipped." },
  { id: "ripple", name: "Ripple", chance: 0.03, coinsOnRoll: 4, boostPerSec: 0.3, aura: null, desc: "Soft wave. +4 coins and +0.30 coins/s when equipped." },
  { id: "echo", name: "Echo", chance: 0.025, coinsOnRoll: 5, boostPerSec: 0.4, aura: null, desc: "Repeating hit. +5 coins and +0.40 coins/s when equipped." },
  { id: "glow", name: "Glow Shard", chance: 0.02, coinsOnRoll: 7, boostPerSec: 0.6, aura: null, desc: "Soft light. +7 coins and +0.60 coins/s when equipped." },
  { id: "prism", name: "Prism Chip", chance: 0.015, coinsOnRoll: 10, boostPerSec: 0.9, aura: null, desc: "Splits luck. +10 coins and +0.90 coins/s when equipped." },
  { id: "void", name: "Void Shard", chance: 0.01, coinsOnRoll: 15, boostPerSec: 1.5, aura: "void", desc: "Nothingness condensed. +15 coins and +1.5 coins/s. Void aura when equipped." },
  { id: "aurora", name: "Aurora Key", chance: 0.006, coinsOnRoll: 30, boostPerSec: 3, aura: "aurora", desc: "Key of light. +30 coins and +3 coins/s. Aurora aura when equipped." },
  { id: "meteor", name: "Meteor Fragment", chance: 0.004, coinsOnRoll: 45, boostPerSec: 4.5, aura: null, desc: "Falling stone. +45 coins and +4.5 coins/s when equipped." },
  { id: "chrono", name: "Chrono Tick", chance: 0.003, coinsOnRoll: 60, boostPerSec: 6, aura: null, desc: "Time fragment. +60 coins and +6 coins/s when equipped." },
  { id: "pulse", name: "Pulse Core", chance: 0.002, coinsOnRoll: 80, boostPerSec: 8, aura: null, desc: "Beating core. +80 coins and +8 coins/s when equipped." },
  { id: "nebula", name: "Nebula Dust", chance: 0.0015, coinsOnRoll: 120, boostPerSec: 12, aura: "void", desc: "Cloud of stars. +120 coins and +12 coins/s. Deep void aura when equipped." },
  { id: "auric", name: "Auric Loop", chance: 0.001, coinsOnRoll: 180, boostPerSec: 18, aura: "aurora", desc: "Golden loop. +180 coins and +18 coins/s. Bright aurora aura when equipped." },
  { id: "solar", name: "Solar Crown", chance: 0.0007, coinsOnRoll: 260, boostPerSec: 26, aura: "solar", desc: "Crown of fire. +260 coins and +26 coins/s. Solar aura when equipped." },
  { id: "binary", name: "Binary Relic", chance: 0.0005, coinsOnRoll: 350, boostPerSec: 35, aura: null, desc: "0s and 1s fused. +350 coins and +35 coins/s when equipped." },
  { id: "echo2", name: "Infinite Echo", chance: 0.0003, coinsOnRoll: 500, boostPerSec: 50, aura: "void", desc: "Echo that never ends. +500 coins and +50 coins/s. Void aura when equipped." },
  { id: "aurora2", name: "Aurora Crown", chance: 0.0002, coinsOnRoll: 750, boostPerSec: 75, aura: "aurora", desc: "Crowned light. +750 coins and +75 coins/s. Aurora aura when equipped." },
  { id: "mythic", name: "Key of Worlds", chance: 0.0001, coinsOnRoll: 1200, boostPerSec: 120, aura: "solar", desc: "Mythic key. +1200 coins and +120 coins/s. Solar aura when equipped." }
];

// ensure chances sum <= 1; leftover acts as "Dust" fallback if needed

const rarityCounts = {};
rarities.forEach(r => (rarityCounts[r.id] = 0));

// --- elements ---
const coinsValueEl = document.getElementById("coinsValue");
const baseRateEl = document.getElementById("baseRate");
const boostRateEl = document.getElementById("boostRate");
const totalRateEl = document.getElementById("totalRate");
const lastRollNameEl = document.getElementById("lastRollName");
const lastRollDescEl = document.getElementById("lastRollDesc");
const rarityListEl = document.getElementById("rarityList");
const rollBtn = document.getElementById("rollBtn");
const autoBtn = document.getElementById("autoBtn");
const gameFrameEl = document.getElementById("gameFrame");

// --- helpers ---

function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
}

function applyAura(aura) {
  gameFrameEl.classList.remove("aura-void", "aura-aurora", "aura-solar");
  if (!aura) return;
  if (aura === "void") gameFrameEl.classList.add("aura-void");
  if (aura === "aurora") gameFrameEl.classList.add("aura-aurora");
  if (aura === "solar") gameFrameEl.classList.add("aura-solar");
}

function recomputeBonusFromEquipped() {
  const r = rarities.find(x => x.id === equippedRarityId);
  bonusPerSecond = r ? r.boostPerSec : 0;
  updateRatesUI();
}

// --- rarity UI ---

function buildRarityList() {
  rarityListEl.innerHTML = "";
  rarities.forEach(r => {
    const item = document.createElement("div");
    item.className = `rarity-item rarity-${r.id}`;
    item.dataset.id = r.id;

    const header = document.createElement("div");
    header.className = "rarity-header";

    const name = document.createElement("div");
    name.className = "rarity-name";
    name.textContent = r.name;

    const chance = document.createElement("div");
    chance.className = "rarity-chance";
    chance.textContent = `${(r.chance * 100).toFixed(3)}%`;

    header.appendChild(name);
    header.appendChild(chance);

    const desc = document.createElement("div");
    desc.className = "rarity-desc";
    desc.textContent = r.desc;

    const owned = document.createElement("div");
    owned.className = "rarity-owned";
    owned.textContent = `Owned: ${rarityCounts[r.id]}`;

    item.appendChild(header);
    item.appendChild(desc);
    item.appendChild(owned);

    item.addEventListener("click", () => {
      equippedRarityId = r.id;
      recomputeBonusFromEquipped();
      applyAura(r.aura);
      updateRarityEquippedUI();
    });

    rarityListEl.appendChild(item);
  });
}

function updateRarityCountsUI() {
  const items = rarityListEl.querySelectorAll(".rarity-item");
  items.forEach(item => {
    const id = item.dataset.id;
    const ownedEl = item.querySelector(".rarity-owned");
    ownedEl.textContent = `Owned: ${rarityCounts[id]}`;
  });
}

function updateRarityEquippedUI() {
  const items = rarityListEl.querySelectorAll(".rarity-item");
  items.forEach(item => {
    const id = item.dataset.id;
    item.classList.toggle("equipped", id === equippedRarityId);
  });
}

// --- roll logic ---

function rollOnce() {
  const roll = Math.random();
  let acc = 0;
  let chosen = rarities[0];

  for (const r of rarities) {
    acc += r.chance;
    if (roll <= acc) {
      chosen = r;
      break;
    }
  }

  rarityCounts[chosen.id] += 1;
  coins += chosen.coinsOnRoll;

  lastRollNameEl.textContent = chosen.name;
  lastRollDescEl.textContent =
    chosen.desc + ` (+${chosen.coinsOnRoll.toFixed(2)} coins)`;

  updateRarityCountsUI();
  updateCoinsUI();
  saveState();
}

// --- rates + coins UI ---

function updateRatesUI() {
  const total = basePerSecond + bonusPerSecond;
  baseRateEl.textContent = `${basePerSecond.toFixed(2)}/s`;
  boostRateEl.textContent = `${bonusPerSecond.toFixed(2)}/s`;
  totalRateEl.textContent = `${total.toFixed(2)}/s`;
}

function updateCoinsUI() {
  coinsValueEl.textContent = formatNumber(coins);
}

// --- idle loop with time delta (works even after tab inactive) ---

function idleTick() {
  const now = Date.now();
  const dt = (now - lastTickTime) / 1000; // seconds
  lastTickTime = now;

  const perSecond = basePerSecond + bonusPerSecond;
  const gain = perSecond * dt;
  coins += gain;
  updateCoinsUI();
  saveState();
}

setInterval(idleTick, 250); // 4 times per second, but dt handles catch-up

// --- auto roll loop (slower) ---

setInterval(() => {
  if (autoRolling) {
    rollOnce();
  }
}, 1500); // 1.5s per auto roll

// --- controls ---

rollBtn.addEventListener("click", () => {
  rollOnce();
});

autoBtn.addEventListener("click", () => {
  autoRolling = !autoRolling;
  autoBtn.textContent = autoRolling ? "AUTO: ON" : "AUTO: OFF";
  autoBtn.classList.toggle("active", autoRolling);
  saveState();
});

window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    rollOnce();
  }
  if (e.key.toLowerCase() === "a") {
    autoRolling = !autoRolling;
    autoBtn.textContent = autoRolling ? "AUTO: ON" : "AUTO: OFF";
    autoBtn.classList.toggle("active", autoRolling);
    saveState();
  }
});

// --- persistence (localStorage) ---

const STORAGE_KEY = "keylet_rng_save_v1";

function saveState() {
  const data = {
    coins,
    basePerSecond,
    bonusPerSecond, // will be recomputed from equipped, but keep anyway
    autoRolling,
    rarityCounts,
    equippedRarityId,
    lastTickTime: Date.now()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.coins === "number") coins = data.coins;
    if (typeof data.basePerSecond === "number")
      basePerSecond = data.basePerSecond;
    if (typeof data.autoRolling === "boolean") autoRolling = data.autoRolling;
    if (data.rarityCounts) {
      Object.keys(data.rarityCounts).forEach(id => {
        if (id in rarityCounts) rarityCounts[id] = data.rarityCounts[id];
      });
    }
    if (data.equippedRarityId) equippedRarityId = data.equippedRarityId;

    // catch up idle gain since lastTickTime
    if (data.lastTickTime) {
      const now = Date.now();
      const dt = (now - data.lastTickTime) / 1000;
      const perSecond = basePerSecond + (rarities.find(r => r.id === equippedRarityId)?.boostPerSec || 0);
      coins += perSecond * dt;
    }

    recomputeBonusFromEquipped();
    applyAura(rarities.find(r => r.id === equippedRarityId)?.aura || null);
    autoBtn.textContent = autoRolling ? "AUTO: ON" : "AUTO: OFF";
    autoBtn.classList.toggle("active", autoRolling);
  } catch (e) {
    // ignore
  }
}

// --- init ---

buildRarityList();
loadState();
updateRarityCountsUI();
updateRarityEquippedUI();
updateRatesUI();
updateCoinsUI();
lastTickTime = Date.now();


