// basic state
let coins = 0;
let basePerSecond = 0.1;
let bonusPerSecond = 0;
let autoRolling = false;

// rarities config
const rarities = [
  {
    id: "common",
    name: "Dust",
    chance: 0.7,
    coinsOnRoll: 0.2,
    desc: "Barely anything. +0.20 coins on hit.",
    apply: () => {}
  },
  {
    id: "air",
    name: "Air",
    chance: 0.18,
    coinsOnRoll: 0.5,
    desc: "Light as nothing. +0.50 coins and +0.10 coins/s.",
    apply: () => {
      bonusPerSecond += 0.1;
    }
  },
  {
    id: "ember",
    name: "Ember",
    chance: 0.08,
    coinsOnRoll: 2,
    desc: "A tiny spark. +2 coins and +0.25 coins/s.",
    apply: () => {
      bonusPerSecond += 0.25;
    }
  },
  {
    id: "void",
    name: "Void Shard",
    chance: 0.03,
    coinsOnRoll: 10,
    desc: "Nothingness condensed. +10 coins and +1.0 coins/s.",
    apply: () => {
      bonusPerSecond += 1;
    }
  },
  {
    id: "aurora",
    name: "Aurora Key",
    chance: 0.009,
    coinsOnRoll: 50,
    desc: "A key made of light. +50 coins and +4.0 coins/s.",
    apply: () => {
      bonusPerSecond += 4;
    }
  },
  {
    id: "mythic",
    name: "Sol’s Echo",
    chance: 0.001,
    coinsOnRoll: 250,
    desc: "A mythic echo of luck. +250 coins and +20 coins/s.",
    apply: () => {
      bonusPerSecond += 20;
    }
  }
];

// track how many of each rarity we’ve hit
const rarityCounts = {};
rarities.forEach(r => (rarityCounts[r.id] = 0));

// elements
const coinsValueEl = document.getElementById("coinsValue");
const baseRateEl = document.getElementById("baseRate");
const boostRateEl = document.getElementById("boostRate");
const totalRateEl = document.getElementById("totalRate");
const lastRollNameEl = document.getElementById("lastRollName");
const lastRollDescEl = document.getElementById("lastRollDesc");
const rarityListEl = document.getElementById("rarityList");
const rollBtn = document.getElementById("rollBtn");
const autoBtn = document.getElementById("autoBtn");
const startBtn = document.getElementById("startBtn"); // from previous version, may be null

// build rarity list UI
function buildRarityList() {
  rarityListEl.innerHTML = "";
  rarities.forEach(r => {
    const item = document.createElement("div");
    item.className = `rarity-item rarity-${r.id}`;
    const header = document.createElement("div");
    header.className = "rarity-header";

    const name = document.createElement("div");
    name.className = "rarity-name";
    name.textContent = r.name;

    const chance = document.createElement("div");
    chance.className = "rarity-chance";
    chance.textContent = `${(r.chance * 100).toFixed(2)}%`;

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

    rarityListEl.appendChild(item);
  });
}

function updateRarityCountsUI() {
  const items = rarityListEl.querySelectorAll(".rarity-item");
  items.forEach((item, index) => {
    const r = rarities[index];
    const owned = item.querySelector(".rarity-owned");
    owned.textContent = `Owned: ${rarityCounts[r.id]}`;
  });
}

// roll logic
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
  chosen.apply();

  lastRollNameEl.textContent = chosen.name;
  lastRollDescEl.textContent = chosen.desc + ` (+${chosen.coinsOnRoll.toFixed(2)} coins)`;

  updateRarityCountsUI();
  updateRatesUI();
}

// rates + coins UI
function updateRatesUI() {
  const total = basePerSecond + bonusPerSecond;
  baseRateEl.textContent = `${basePerSecond.toFixed(2)}/s`;
  boostRateEl.textContent = `${bonusPerSecond.toFixed(2)}/s`;
  totalRateEl.textContent = `${total.toFixed(2)}/s`;
}

function updateCoinsUI() {
  coinsValueEl.textContent = coins.toFixed(2);
}

// idle loop
const tickMs = 100;
setInterval(() => {
  const perSecond = basePerSecond + bonusPerSecond;
  const perTick = perSecond * (tickMs / 1000);
  coins += perTick;
  updateCoinsUI();
}, tickMs);

// auto roll loop
setInterval(() => {
  if (autoRolling) {
    rollOnce();
    updateCoinsUI();
  }
}, 300); // every 0.3s like you mentioned

// controls
rollBtn.addEventListener("click", () => {
  rollOnce();
  updateCoinsUI();
});

autoBtn.addEventListener("click", () => {
  autoRolling = !autoRolling;
  autoBtn.textContent = autoRolling ? "AUTO: ON" : "AUTO: OFF";
  autoBtn.classList.toggle("active", autoRolling);
});

// keyboard shortcuts
window.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    rollOnce();
    updateCoinsUI();
  }
  if (e.key.toLowerCase() === "a") {
    autoRolling = !autoRolling;
    autoBtn.textContent = autoRolling ? "AUTO: ON" : "AUTO: OFF";
    autoBtn.classList.toggle("active", autoRolling);
  }
});

// init
buildRarityList();
updateRatesUI();
updateCoinsUI();

