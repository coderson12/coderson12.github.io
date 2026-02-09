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
let mouse = { x: 0, y: 0, down: false };

const planet = {
  radius: 220,
  colorInner: "#2b4f9f",
  colorOuter: "#1a2b5f"
};

const player = {
  x: 0,
  y: -planet.radius + 20,
  r: 10,
  speed: 140,
  hp: 100,
  maxHp: 100,
  attackCooldown: 0,
  attackRate: 0.4,
  facing: 0
};

const villagers = [];
const monsters = [];
const projectiles = [];

const dialogLines = [
  "Welcome to our tiny world.",
  "The monsters keep crawling up from the dark side...",
  "If you protect us, we'll remember you.",
  "Sometimes I just stare into the sky and think.",
  "This planet is small, but it's home."
];

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function spawnVillagers() {
  villagers.length = 0;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + randRange(-0.2, 0.2);
    const x = Math.cos(angle) * (planet.radius - 18);
    const y = Math.sin(angle) * (planet.radius - 18);
    villagers.push({
      x,
      y,
      r: 8,
      angle,
      talkCooldown: 0
    });
  }
}

function spawnMonsters() {
  monsters.length = 0;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * (planet.radius + 40);
    const y = Math.sin(angle) * (planet.radius + 40);
    monsters.push({
      x,
      y,
      r: 9,
      hp: 30,
      maxHp: 30,
      angle,
      speed: 40 + Math.random() * 30
    });
  }
}

function resetGame() {
  player.x = 0;
  player.y = -planet.radius + 20;
  player.hp = player.maxHp;
  projectiles.length = 0;
  spawnVillagers();
  spawnMonsters();
  dialogEl.textContent = "You wake up on a tiny planet surrounded by people who need you.";
}
resetGame();

function updateStats() {
  const aliveMonsters = monsters.filter(m => m.hp > 0).length;
  statsEl.textContent = `HP: ${Math.round(player.hp)} / ${player.maxHp} · Monsters: ${aliveMonsters}`;
}
updateStats();

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === "r") {
    resetGame();
  }
  if (e.key.toLowerCase() === "e") {
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
});

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) {
    mouse.down = true;
    tryAttack();
  }
});

canvas.addEventListener("mouseup", e => {
  if (e.button === 0) mouse.down = false;
});

canvas.addEventListener("contextmenu", e => e.preventDefault());

function length(x, y) {
  return Math.sqrt(x * x + y * y);
}

function normalize(x, y) {
  const l = length(x, y) || 1;
  return { x: x / l, y: y / l };
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;
  if (keys["w"]) my -= 1;
  if (keys["s"]) my += 1;
  if (keys["a"]) mx -= 1;
  if (keys["d"]) mx += 1;

  if (mx !== 0 || my !== 0) {
    const n = normalize(mx, my);
    player.x += n.x * player.speed * dt;
    player.y += n.y * player.speed * dt;
  }

  const dist = length(player.x, player.y);
  const maxDist = planet.radius - 10;
  if (dist > maxDist) {
    const n = normalize(player.x, player.y);
    player.x = n.x * maxDist;
    player.y = n.y * maxDist;
  }

  const cx = width / 2;
  const cy = height / 2;
  const wx = player.x + cx;
  const wy = player.y + cy;
  const dx = mouse.x - wx;
  const dy = mouse.y - wy;
  player.facing = Math.atan2(dy, dx);

  player.attackCooldown = Math.max(0, player.attackCooldown - dt);

  if (mouse.down) {
    tryAttack();
  }

  if (player.hp <= 0) {
    dialogEl.textContent = "You fell... Press R to wake up again.";
  }
}

function tryAttack() {
  if (player.attackCooldown > 0 || player.hp <= 0) return;
  player.attackCooldown = player.attackRate;

  const speed = 260;
  const dir = { x: Math.cos(player.facing), y: Math.sin(player.facing) };
  projectiles.push({
    x: player.x,
    y: player.y,
    vx: dir.x * speed,
    vy: dir.y * speed,
    life: 0.8,
    r: 4
  });
}

function tryTalk() {
  let closest = null;
  let closestDist = 40;
  for (const v of villagers) {
    const d = length(v.x - player.x, v.y - player.y);
    if (d < closestDist) {
      closestDist = d;
      closest = v;
    }
  }
  if (!closest) {
    dialogEl.textContent = "No one is close enough to hear you.";
    return;
  }

  if (closest.talkCooldown > 0) return;

  closest.talkCooldown = 2;
  const line = dialogLines[Math.floor(Math.random() * dialogLines.length)];
  dialogEl.textContent = line;
}

function updateVillagers(dt) {
  for (const v of villagers) {
    v.talkCooldown = Math.max(0, v.talkCooldown - dt);
  }
}

function updateMonsters(dt) {
  for (const m of monsters) {
    if (m.hp <= 0) continue;

    const dx = player.x - m.x;
    const dy = player.y - m.y;
    const n = normalize(dx, dy);
    m.x += n.x * m.speed * dt;
    m.y += n.y * m.speed * dt;

    const dist = length(m.x, m.y);
    const minDist = planet.radius - 5;
    if (dist < minDist) {
      const nn = normalize(m.x, m.y);
      m.x = nn.x * minDist;
      m.y = nn.y * minDist;
    }

    const dToPlayer = length(m.x - player.x, m.y - player.y);
    if (dToPlayer < m.r + player.r + 2 && player.hp > 0) {
      player.hp -= 20 * dt;
      player.hp = clamp(player.hp, 0, player.maxHp);
      if (player.hp <= 0) {
        player.hp = 0;
      }
    }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const d = length(p.x - m.x, p.y - m.y);
      if (d < m.r + p.r) {
        m.hp -= 20;
        projectiles.splice(i, 1);
        break;
      }
    }
  }
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#050816");
  grad.addColorStop(1, "#0b1630");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 80; i++) {
    const x = (i * 73) % width;
    const y = ((i * 139) % height) * 0.6;
    const r = (i % 3 === 0) ? 1.5 : 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlanet() {
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.translate(cx, cy);

  const grad = ctx.createRadialGradient(
    0, 0, planet.radius * 0.2,
    0, 0, planet.radius
  );
  grad.addColorStop(0, planet.colorInner);
  grad.addColorStop(1, planet.colorOuter);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const x = Math.cos(a) * planet.radius;
    const y = Math.sin(a) * planet.radius;
    ctx.moveTo(x, y);
    ctx.lineTo(x * 1.02, y * 1.02);
  }
  ctx.stroke();

  ctx.restore();
}

function drawVillagers() {
  const cx = width / 2;
  const cy = height / 2;

  for (const v of villagers) {
    ctx.save();
    ctx.translate(cx + v.x, cy + v.y);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffe0a8";
    ctx.beginPath();
    ctx.arc(0, -4, v.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4f9cff";
    ctx.fillRect(-v.r + 1, -2, v.r * 2 - 2, 8);

    ctx.restore();
  }
}

function drawMonsters() {
  const cx = width / 2;
  const cy = height / 2;

  for (const m of monsters) {
    if (m.hp <= 0) continue;

    ctx.save();
    ctx.translate(cx + m.x, cy + m.y);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff4f6a";
    ctx.beginPath();
    ctx.arc(0, -2, m.r, 0, Math.PI * 2);
    ctx.fill();

    const hpRatio = m.hp / m.maxHp;
    ctx.fillStyle = "#000000aa";
    ctx.fillRect(-10, -18, 20, 3);
    ctx.fillStyle = "#ff6f7f";
    ctx.fillRect(-10, -18, 20 * hpRatio, 3);

    ctx.restore();
  }
}

function drawProjectiles() {
  const cx = width / 2;
  const cy = height / 2;

  ctx.fillStyle = "#ffd27f";
  for (const p of projectiles) {
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.translate(cx + player.x, cy + player.y);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(player.facing);

  ctx.fillStyle = "#ffd27f";
  ctx.beginPath();
  ctx.arc(0, -6, player.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7fe2ff";
  ctx.fillRect(-player.r + 2, -2, player.r * 2 - 4, 10);

  ctx.fillStyle = "#ffd27f";
  ctx.fillRect(4, -2, 8, 3);

  ctx.restore();

  const hpRatio = player.hp / player.maxHp;
  ctx.fillStyle = "#000000aa";
  ctx.fillRect(cx - 40, cy + planet.radius + 20, 80, 6);
  ctx.fillStyle = "#7fff7f";
  ctx.fillRect(cx - 40, cy + planet.radius + 20, 80 * hpRatio, 6);
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  updatePlayer(dt);
  updateVillagers(dt);
  updateMonsters(dt);
  updateProjectiles(dt);
  updateStats();

  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawPlanet();
  drawVillagers();
  drawMonsters();
  drawProjectiles();
  drawPlayer();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

