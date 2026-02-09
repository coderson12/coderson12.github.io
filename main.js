const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const statsEl = document.getElementById("stats");
const dialogEl = document.getElementById("dialog");
const shopCoinsEl = document.getElementById("shop-coins");

const keys = {};
let mouse = { x: 0, y: 0, tileX: 0, tileY: 0, down: false, shift: false };

const TILE_SIZE = 16;
const WORLD_SEED = 12345;

const player = {
  x: 0,
  y: 0,
  speed: 80,
  w: 12,
  h: 14,
  facing: "down",
  animTime: 0
};

let camera = { x: 0, y: 0 };

let coins = 500;
let people = 5;
let buildings = [];
let citizens = [];
let armyUnits = []; // {x,y,type,hp,maxHp,animTime}
let armyRally = null;

let selectedBuild = "house"; // for 1–3 keys
let warMode = false;
let globalTime = 0;

// BUILDINGS + SHOP DEFINITIONS

const buildingDefs = {
  house: { name: "House", cost: 50, color: "#ffdd77", income: 1, pop: 2 },
  farm: { name: "Farm", cost: 80, color: "#88c96b", income: 3, pop: 0 },
  market: { name: "Market", cost: 150, color: "#ff8f8f", income: 6, pop: 0 },
  temple: { name: "Temple", cost: 200, color: "#c9a6ff", income: 2, pop: 0 },
  barracks: { name: "Barracks", cost: 250, color: "#9f7f5f", income: 1, pop: 0 },
  forge: { name: "Forge", cost: 220, color: "#c96b3b", income: 2, pop: 0 },
  tower: { name: "Tower", cost: 180, color: "#a0b0ff", income: 1, pop: 0 }
};

const armyDefs = {
  knight: { name: "Knight", cost: 120, hp: 80, atk: 10 },
  archer: { name: "Archer", cost: 100, hp: 55, atk: 8 },
  mage: { name: "Mage", cost: 160, hp: 45, atk: 14 },
  spearman: { name: "Spearman", cost: 90, hp: 60, atk: 9 },
  siege: { name: "Siege Engine", cost: 500, hp: 200, atk: 25 }
};

let upgrades = {
  armorLevel: 0,
  weaponLevel: 0,
  training: false,
  banner: false,
  healer: false
};

const dialogLines = [
  "This land feels endless, doesn't it?",
  "We work, we build, we grow.",
  "Coins aren't everything... but they help.",
  "One day, our people will be countless.",
  "I heard rumors of war if we grow too big..."
];

function randSeeded(x, y) {
  let n = x * 374761393 + y * 668265263 + WORLD_SEED * 1446647;
  n = (n ^ (n >> 13)) * 1274126177;
  n = (n ^ (n >> 16));
  return (n >>> 0) / 4294967295;
}

function getGroundColor(tx, ty) {
  const r = randSeeded(tx, ty);
  if (r < 0.05) return "#3b5b2a";
  if (r < 0.1) return "#2f4b22";
  return "#26401c";
}

function worldToScreen(x, y) {
  return {
    x: Math.floor((x - camera.x) + width / 2),
    y: Math.floor((y - camera.y) + height / 2)
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - width / 2) + camera.x,
    y: (y - height / 2) + camera.y
  };
}

function updateMouseTile() {
  const w = screenToWorld(mouse.x, mouse.y);
  mouse.tileX = Math.floor(w.x / TILE_SIZE);
  mouse.tileY = Math.floor(w.y / TILE_SIZE);
}

// INPUT

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === "1") selectedBuild = "house";
  if (k === "2") selectedBuild = "farm";
  if (k === "3") selectedBuild = "market";
  if (k === "4") {
    // hire near house via keyboard mode
    tryHireFromKeyboard();
  }
  if (k === "r") {
    camera.x = player.x;
    camera.y = player.y;
  }
  if (k === "e") {
    tryTalk();
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  updateMouseTile();
});

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) {
    mouse.down = true;
    if (mouse.shift) {
      setArmyRally();
    } else {
      handleClick();
    }
  }
});

canvas.addEventListener("mouseup", e => {
  if (e.button === 0) mouse.down = false;
});

canvas.addEventListener("contextmenu", e => e.preventDefault());

window.addEventListener("keydown", e => {
  if (e.key === "Shift") mouse.shift = true;
});
window.addEventListener("keyup", e => {
  if (e.key === "Shift") mouse.shift = false;
});

// SHOP BUTTONS

document.querySelectorAll(".shop-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;
    handleShopPurchase(type);
  });
});

document.querySelectorAll(".raid-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const diff = btn.dataset.diff;
    startRaid(diff);
  });
});

// GAME LOGIC

function handleClick() {
  // left click: build at tile
  tryBuildAtTile(mouse.tileX, mouse.tileY);
}

function tryBuildAtTile(tx, ty) {
  if (buildings.some(b => b.x === tx && b.y === ty)) {
    dialogEl.textContent = "There's already something here.";
    return;
  }

  const def = buildingDefs[selectedBuild];
  if (!def) {
    dialogEl.textContent = "Select a building mode (1–3) or use shop.";
    return;
  }

  if (coins < def.cost) {
    dialogEl.textContent = "Not enough coins.";
    return;
  }

  coins -= def.cost;
  buildings.push({ x: tx, y: ty, type: selectedBuild });

  if (def.pop > 0) {
    for (let i = 0; i < def.pop; i++) {
      spawnCitizenNear(tx, ty, buildings.length - 1);
    }
  }

  dialogEl.textContent = `Built a ${def.name}.`;
}

function tryHireFromKeyboard() {
  // hire near player: find nearest house tile
  let nearestHouse = -1;
  let bestDist = 9999;
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.type !== "house") continue;
    const hx = (b.x + 0.5) * TILE_SIZE;
    const hy = (b.y + 0.5) * TILE_SIZE;
    const d = Math.hypot(hx - player.x, hy - player.y);
    if (d < bestDist) {
      bestDist = d;
      nearestHouse = i;
    }
  }
  if (nearestHouse === -1 || bestDist > 64) {
    dialogEl.textContent = "Get closer to a house to hire.";
    return;
  }
  tryHireAtHouse(nearestHouse);
}

function tryHireAtHouse(houseIndex) {
  const cost = 30;
  if (coins < cost) {
    dialogEl.textContent = "Not enough coins to hire.";
    return;
  }
  coins -= cost;
  const h = buildings[houseIndex];
  spawnCitizenNear(h.x, h.y, houseIndex);
  dialogEl.textContent = "You hired a new person.";
}

function spawnCitizenNear(tx, ty, homeId) {
  const px = (tx + 0.5 + (Math.random() * 0.4 - 0.2)) * TILE_SIZE;
  const py = (ty + 0.5 + (Math.random() * 0.4 - 0.2)) * TILE_SIZE;
  citizens.push({
    x: px,
    y: py,
    homeId,
    dialogCooldown: 0,
    wanderDir: Math.random() * Math.PI * 2,
    animTime: Math.random() * 10
  });
  people++;
}

function tryTalk() {
  let closest = null;
  let closestDist = 24;

  for (const c of citizens) {
    const dx = c.x - player.x;
    const dy = c.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d < closestDist) {
      closestDist = d;
      closest = c;
    }
  }

  if (!closest) {
    dialogEl.textContent = "No one is close enough to talk.";
    return;
  }

  if (closest.dialogCooldown > 0) return;

  closest.dialogCooldown = 2;
  const line = dialogLines[Math.floor(Math.random() * dialogLines.length)];
  dialogEl.textContent = line;
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;
  if (keys["w"]) my -= 1;
  if (keys["s"]) my += 1;
  if (keys["a"]) mx -= 1;
  if (keys["d"]) mx += 1;

  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
    player.x += mx * player.speed * dt;
    player.y += my * player.speed * dt;

    if (Math.abs(mx) > Math.abs(my)) {
      player.facing = mx > 0 ? "right" : "left";
    } else {
      player.facing = my > 0 ? "down" : "up";
    }
  }

  player.animTime += dt * (mx !== 0 || my !== 0 ? 8 : 2);

  camera.x += (player.x - camera.x) * 0.15;
  camera.y += (player.y - camera.y) * 0.15;
}

function updateCitizens(dt) {
  for (const c of citizens) {
    c.dialogCooldown = Math.max(0, c.dialogCooldown - dt);
    c.animTime += dt * 6;

    if (Math.random() < 0.01) {
      c.wanderDir += (Math.random() - 0.5) * 0.8;
    }

    const speed = 20;
    c.x += Math.cos(c.wanderDir) * speed * dt;
    c.y += Math.sin(c.wanderDir) * speed * dt;

    const home = buildings[c.homeId];
    if (home) {
      const hx = (home.x + 0.5) * TILE_SIZE;
      const hy = (home.y + 0.5) * TILE_SIZE;
      const dx = c.x - hx;
      const dy = c.y - hy;
      const d = Math.hypot(dx, dy);
      if (d > 40) {
        c.x -= dx * 0.1;
        c.y -= dy * 0.1;
      }
    }
  }
}

let incomeTimer = 0;
function updateEconomy(dt) {
  incomeTimer += dt;
  if (incomeTimer >= 1) {
    incomeTimer = 0;
    let income = 0;
    for (const b of buildings) {
      const def = buildingDefs[b.type];
      if (def) income += def.income;
    }
    income += Math.floor(people / 10);
    coins += income;
  }

  if (!warMode && people >= 10000) {
    warMode = true;
    dialogEl.textContent = "Your civilization is huge. Whispers of war begin...";
  }
}

function handleShopPurchase(type) {
  // buildings via shop
  if (buildingDefs[type]) {
    selectedBuild = type;
    dialogEl.textContent = `Build mode: ${buildingDefs[type].name}. Click on ground to place.`;
    return;
  }

  // army units
  if (armyDefs[type]) {
    const def = armyDefs[type];
    if (coins < def.cost) {
      dialogEl.textContent = "Not enough coins for that unit.";
      return;
    }
    coins -= def.cost;
    spawnArmyUnitNearPlayer(type);
    dialogEl.textContent = `Recruited a ${def.name}.`;
    return;
  }

  // upgrades
  if (type === "armor1" && upgrades.armorLevel < 1 && coins >= 300) {
    coins -= 300;
    upgrades.armorLevel = 1;
    dialogEl.textContent = "Armor I purchased. Your army is tougher.";
    return;
  }
  if (type === "armor2" && upgrades.armorLevel < 2 && coins >= 600) {
    coins -= 600;
    upgrades.armorLevel = 2;
    dialogEl.textContent = "Armor II purchased. Your army is very tough.";
    return;
  }
  if (type === "weapon1" && upgrades.weaponLevel < 1 && coins >= 280) {
    coins -= 280;
    upgrades.weaponLevel = 1;
    dialogEl.textContent = "Weapons I purchased. Your army hits harder.";
    return;
  }
  if (type === "weapon2" && upgrades.weaponLevel < 2 && coins >= 550) {
    coins -= 550;
    upgrades.weaponLevel = 2;
    dialogEl.textContent = "Weapons II purchased. Your army is deadly.";
    return;
  }
  if (type === "training" && !upgrades.training && coins >= 400) {
    coins -= 400;
    upgrades.training = true;
    dialogEl.textContent = "Training Grounds built. Army moves faster.";
    return;
  }
  if (type === "banner" && !upgrades.banner && coins >= 350) {
    coins -= 350;
    upgrades.banner = true;
    dialogEl.textContent = "War Banner raised. Army morale improved.";
    return;
  }
  if (type === "healer" && !upgrades.healer && coins >= 200) {
    coins -= 200;
    upgrades.healer = true;
    dialogEl.textContent = "Healer joined. Army slowly regenerates.";
    return;
  }
  if (type === "siege") {
    const def = armyDefs.siege;
    if (coins < def.cost) {
      dialogEl.textContent = "Not enough coins for siege engine.";
      return;
    }
    coins -= def.cost;
    spawnArmyUnitNearPlayer("siege");
    dialogEl.textContent = "Built a siege engine.";
    return;
  }

  dialogEl.textContent = "You can't buy that right now.";
}

function spawnArmyUnitNearPlayer(type) {
  const def = armyDefs[type];
  const hpBonus = upgrades.armorLevel * 15;
  const unit = {
    x: player.x + (Math.random() * 20 - 10),
    y: player.y + (Math.random() * 20 - 10),
    type,
    hp: def.hp + hpBonus,
    maxHp: def.hp + hpBonus,
    animTime: Math.random() * 10
  };
  armyUnits.push(unit);
}

function setArmyRally() {
  const w = screenToWorld(mouse.x, mouse.y);
  armyRally = { x: w.x, y: w.y };
  dialogEl.textContent = "Army rally point set.";
}

function updateArmy(dt) {
  for (const u of armyUnits) {
    u.animTime += dt * 6;

    if (armyRally) {
      const dx = armyRally.x - u.x;
      const dy = armyRally.y - u.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        let speed = 40;
        if (upgrades.training) speed += 20;
        const nx = dx / d;
        const ny = dy / d;
        u.x += nx * speed * dt;
        u.y += ny * speed * dt;
      }
    }

    if (upgrades.healer && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + 2 * dt);
    }
  }
}

// RAID SYSTEM

function startRaid(diff) {
  if (armyUnits.length === 0) {
    dialogEl.textContent = "You have no army to send.";
    return;
  }

  let enemyPower, reward, lossFactor;
  if (diff === "easy") {
    enemyPower = 80;
    reward = 200;
    lossFactor = 0.3;
  } else if (diff === "medium") {
    enemyPower = 200;
    reward = 500;
    lossFactor = 0.5;
  } else {
    enemyPower = 450;
    reward = 1200;
    lossFactor = 0.7;
  }

  let armyPower = 0;
  for (const u of armyUnits) {
    const base = armyDefs[u.type].atk;
    const weaponBonus = upgrades.weaponLevel * 4;
    const bannerBonus = upgrades.banner ? 5 : 0;
    armyPower += base + weaponBonus + bannerBonus;
  }

  const roll = Math.random() * (armyPower + enemyPower);
  const win = roll < armyPower;

  if (win) {
    coins += reward;
    dialogEl.textContent = `Raid success! You gained ${reward} coins.`;
    // small casualties
    applyRaidLosses(lossFactor * 0.5);
  } else {
    dialogEl.textContent = "Raid failed... Your people and wealth suffer.";
    applyRaidLosses(lossFactor);
    coins = Math.floor(coins * (1 - lossFactor));
    people = Math.max(0, Math.floor(people * (1 - lossFactor * 0.5)));
  }
}

function applyRaidLosses(factor) {
  const survivors = [];
  for (const u of armyUnits) {
    if (Math.random() > factor) survivors.push(u);
  }
  armyUnits = survivors;
}

// DRAWING

function drawGround() {
  const startX = Math.floor((camera.x - width / 2) / TILE_SIZE) - 1;
  const endX = Math.floor((camera.x + width / 2) / TILE_SIZE) + 1;
  const startY = Math.floor((camera.y - height / 2) / TILE_SIZE) - 1;
  const endY = Math.floor((camera.y + height / 2) / TILE_SIZE) + 1;

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const color = getGroundColor(tx, ty);
      const sx = Math.floor((tx * TILE_SIZE - camera.x) + width / 2);
      const sy = Math.floor((ty * TILE_SIZE - camera.y) + height / 2);
      ctx.fillStyle = color;
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawBuildings() {
  for (const b of buildings) {
    const sx = (b.x * TILE_SIZE - camera.x) + width / 2;
    const sy = (b.y * TILE_SIZE - camera.y) + height / 2;

    const def = buildingDefs[b.type];
    if (!def) continue;

    ctx.fillStyle = "#00000080";
    ctx.fillRect(sx, sy + TILE_SIZE - 4, TILE_SIZE, 4);

    ctx.fillStyle = def.color;
    ctx.fillRect(sx + 2, sy + 4, TILE_SIZE - 4, TILE_SIZE - 6);

    ctx.fillStyle = "#00000080";
    ctx.fillRect(sx + 4, sy + 6, 4, 4);
  }
}

function drawCitizens() {
  for (const c of citizens) {
    const s = worldToScreen(c.x, c.y);
    const bob = Math.sin(c.animTime) * 1;

    ctx.fillStyle = "#00000080";
    ctx.fillRect(s.x - 4, s.y + 4, 8, 3);

    ctx.fillStyle = "#ffe0a8";
    ctx.fillRect(s.x - 3, s.y - 6 + bob, 6, 6);

    ctx.fillStyle = "#4fa8ff";
    ctx.fillRect(s.x - 3, s.y + bob, 6, 6);
  }
}

function drawArmy() {
  for (const u of armyUnits) {
    const s = worldToScreen(u.x, u.y);
    const bob = Math.sin(u.animTime) * 1;

    ctx.fillStyle = "#00000080";
    ctx.fillRect(s.x - 5, s.y + 5, 10, 3);

    let color = "#c0c0c0";
    if (u.type === "knight") color = "#d0d0ff";
    if (u.type === "archer") color = "#a0ffb0";
    if (u.type === "mage") color = "#e0a0ff";
    if (u.type === "spearman") color = "#ffd0a0";
    if (u.type === "siege") color = "#b08050";

    ctx.fillStyle = color;
    ctx.fillRect(s.x - 4, s.y - 8 + bob, 8, 8);

    const ratio = u.hp / u.maxHp;
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(s.x - 5, s.y - 11 + bob, 10, 2);
    ctx.fillStyle = "#7fff7f";
    ctx.fillRect(s.x - 5, s.y - 11 + bob, 10 * ratio, 2);
  }

  if (armyRally) {
    const s = worldToScreen(armyRally.x, armyRally.y);
    ctx.strokeStyle = "#ffff88";
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x - 6, s.y - 6, 12, 12);
  }
}

function drawPlayer() {
  const s = worldToScreen(player.x, player.y);
  const bob = Math.sin(player.animTime) * 1.5;

  ctx.fillStyle = "#00000080";
  ctx.fillRect(s.x - 6, s.y + 6, 12, 4);

  ctx.fillStyle = "#ffe0a8";
  ctx.fillRect(s.x - 5, s.y - 10 + bob, 10, 8);

  ctx.fillStyle = "#ffddff";
  ctx.fillRect(s.x - 5, s.y - 2 + bob, 10, 10);

  ctx.fillStyle = "#000000";
  if (player.facing === "up") {
    ctx.fillRect(s.x - 3, s.y - 8 + bob, 2, 2);
    ctx.fillRect(s.x + 1, s.y - 8 + bob, 2, 2);
  } else if (player.facing === "down") {
    ctx.fillRect(s.x - 3, s.y - 6 + bob, 2, 2);
    ctx.fillRect(s.x + 1, s.y - 6 + bob, 2, 2);
  } else if (player.facing === "left") {
    ctx.fillRect(s.x - 4, s.y - 7 + bob, 2, 2);
  } else if (player.facing === "right") {
    ctx.fillRect(s.x + 2, s.y - 7 + bob, 2, 2);
  }
}

function drawCursor() {
  const tx = mouse.tileX;
  const ty = mouse.tileY;
  const sx = (tx * TILE_SIZE - camera.x) + width / 2;
  const sy = (ty * TILE_SIZE - camera.y) + height / 2;

  ctx.strokeStyle = "#ffff88";
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function updateStats() {
  statsEl.textContent =
    `Coins: ${Math.floor(coins)} · People: ${people} · Buildings: ${buildings.length} · Army: ${armyUnits.length} · Mode: ${selectedBuild.toUpperCase()}${warMode ? " · WAR RISK" : ""}`;
  shopCoinsEl.textContent = `Coins: ${Math.floor(coins)}`;
}

// MAIN LOOP

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  globalTime += dt;

  updatePlayer(dt);
  updateCitizens(dt);
  updateArmy(dt);
  updateEconomy(dt);
  updateStats();

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  drawGround();
  drawBuildings();
  drawCitizens();
  drawArmy();
  drawPlayer();
  drawCursor();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

