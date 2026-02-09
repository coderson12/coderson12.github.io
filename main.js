// main.js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const statsEl = document.getElementById("stats");
const dialogEl = document.getElementById("dialog");

const keys = {};
let mouse = { x: 0, y: 0, tileX: 0, tileY: 0, down: false };

const TILE_SIZE = 16; // 8-bit style
const WORLD_SEED = 12345;

const player = {
  x: 0,
  y: 0,
  speed: 80,
  w: 12,
  h: 14,
  facing: "down"
};

let camera = { x: 0, y: 0 };

let coins = 200;
let people = 3;
let buildings = []; // {x,y,type}
let citizens = [];  // {x,y,homeId,dialogCooldown}
let selectedBuild = "house"; // house, farm, market, hire
let warMode = false;

const buildingDefs = {
  house: { name: "House", cost: 50, color: "#ffdd77", income: 1, pop: 2 },
  farm: { name: "Farm", cost: 80, color: "#88c96b", income: 3, pop: 0 },
  market: { name: "Market", cost: 150, color: "#ff8f8f", income: 6, pop: 0 }
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

function tileKey(tx, ty) {
  return `${tx},${ty}`;
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
  if (k === "4") selectedBuild = "hire";
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
    handleClick();
  }
});

canvas.addEventListener("mouseup", e => {
  if (e.button === 0) mouse.down = false;
});

canvas.addEventListener("contextmenu", e => e.preventDefault());

function handleClick() {
  if (selectedBuild === "hire") {
    tryHire();
  } else {
    tryBuild();
  }
}

function tryBuild() {
  const tx = mouse.tileX;
  const ty = mouse.tileY;

  if (buildings.some(b => b.x === tx && b.y === ty)) {
    dialogEl.textContent = "There's already something here.";
    return;
  }

  const def = buildingDefs[selectedBuild];
  if (!def) return;

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

function spawnCitizenNear(tx, ty, homeId) {
  const px = (tx + 0.5 + (Math.random() * 0.4 - 0.2)) * TILE_SIZE;
  const py = (ty + 0.5 + (Math.random() * 0.4 - 0.2)) * TILE_SIZE;
  citizens.push({
    x: px,
    y: py,
    homeId,
    dialogCooldown: 0,
    wanderDir: Math.random() * Math.PI * 2
  });
  people++;
}

function tryHire() {
  const tx = mouse.tileX;
  const ty = mouse.tileY;

  const nearHouse = buildings.findIndex(
    b => b.type === "house" && Math.abs(b.x - tx) <= 1 && Math.abs(b.y - ty) <= 1
  );

  if (nearHouse === -1) {
    dialogEl.textContent = "You must be near a house to hire.";
    return;
  }

  const cost = 30;
  if (coins < cost) {
    dialogEl.textContent = "Not enough coins to hire.";
    return;
  }

  coins -= cost;
  spawnCitizenNear(buildings[nearHouse].x, buildings[nearHouse].y, nearHouse);
  dialogEl.textContent = "You hired a new person.";
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

  camera.x += (player.x - camera.x) * 0.15;
  camera.y += (player.y - camera.y) * 0.15;
}

function updateCitizens(dt) {
  for (const c of citizens) {
    c.dialogCooldown = Math.max(0, c.dialogCooldown - dt);

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

    ctx.fillStyle = "#00000080";
    ctx.fillRect(s.x - 4, s.y + 4, 8, 3);

    ctx.fillStyle = "#ffe0a8";
    ctx.fillRect(s.x - 3, s.y - 6, 6, 6);

    ctx.fillStyle = "#4fa8ff";
    ctx.fillRect(s.x - 3, s.y, 6, 6);
  }
}

function drawPlayer() {
  const s = worldToScreen(player.x, player.y);

  ctx.fillStyle = "#00000080";
  ctx.fillRect(s.x - 6, s.y + 6, 12, 4);

  ctx.fillStyle = "#ffe0a8";
  ctx.fillRect(s.x - 5, s.y - 10, 10, 8);

  ctx.fillStyle = "#ffddff";
  ctx.fillRect(s.x - 5, s.y - 2, 10, 10);

  ctx.fillStyle = "#000000";
  if (player.facing === "up") {
    ctx.fillRect(s.x - 3, s.y - 8, 2, 2);
    ctx.fillRect(s.x + 1, s.y - 8, 2, 2);
  } else if (player.facing === "down") {
    ctx.fillRect(s.x - 3, s.y - 6, 2, 2);
    ctx.fillRect(s.x + 1, s.y - 6, 2, 2);
  } else if (player.facing === "left") {
    ctx.fillRect(s.x - 4, s.y - 7, 2, 2);
  } else if (player.facing === "right") {
    ctx.fillRect(s.x + 2, s.y - 7, 2, 2);
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
    `Coins: ${Math.floor(coins)} · People: ${people} · Buildings: ${buildings.length} · Mode: ${selectedBuild.toUpperCase()}${warMode ? " · WAR RISK" : ""}`;
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  updatePlayer(dt);
  updateCitizens(dt);
  updateEconomy(dt);
  updateStats();

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  drawGround();
  drawBuildings();
  drawCitizens();
  drawPlayer();
  drawCursor();

  requestAnimationFrame(loop);
}

let lastTime = performance.now();
requestAnimationFrame(loop);

