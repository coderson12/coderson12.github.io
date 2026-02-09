// main.js
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const planet = {
  radius: 160,
  atmosphereRadius: 190,
  rotation: 0,
  rotationSpeed: 0,
  friction: 0.96
};

let zoom = 1;
let targetZoom = 1;
let dragging = false;
let lastMouse = { x: 0, y: 0 };
let selectedTool = "house";

const buildings = [];

const buildingTypes = {
  house: {
    name: "House",
    pop: 4,
    happiness: 2,
    color: "#ffd27f"
  },
  tree: {
    name: "Tree",
    pop: 0,
    happiness: 4,
    color: "#7fe27f"
  },
  farm: {
    name: "Farm",
    pop: 6,
    happiness: 1,
    color: "#ffb347"
  },
  tower: {
    name: "Tower",
    pop: 2,
    happiness: -1,
    color: "#9fa8ff"
  }
};

const popStat = document.getElementById("popStat");
const happinessStat = document.getElementById("happinessStat");

function updateStats() {
  let pop = 0;
  let happiness = 100;
  for (const b of buildings) {
    const t = buildingTypes[b.type];
    pop += t.pop;
    happiness += t.happiness;
  }
  happiness = Math.max(0, Math.min(200, happiness));
  popStat.textContent = `Population: ${pop}`;
  happinessStat.textContent = `Happiness: ${happiness}`;
}

function worldToScreen(x, y) {
  const cx = width / 2;
  const cy = height / 2;
  return {
    x: cx + x * zoom,
    y: cy + y * zoom
  };
}

function screenToWorld(x, y) {
  const cx = width / 2;
  const cy = height / 2;
  return {
    x: (x - cx) / zoom,
    y: (y - cy) / zoom
  };
}

function angleFromScreen(x, y) {
  const w = screenToWorld(x, y);
  const angle = Math.atan2(w.y, w.x) - planet.rotation;
  return angle;
}

function placeBuildingAtScreen(x, y, type) {
  const angle = angleFromScreen(x, y);
  const snappedAngle = Math.round(angle / (Math.PI / 32)) * (Math.PI / 32);

  for (const b of buildings) {
    if (Math.abs(b.angle - snappedAngle) < 0.02) {
      return;
    }
  }

  buildings.push({
    angle: snappedAngle,
    type
  });

  updateStats();
}

function removeBuildingAtScreen(x, y) {
  const angle = angleFromScreen(x, y);
  let closestIndex = -1;
  let closestDist = 0.05;

  for (let i = 0; i < buildings.length; i++) {
    const d = Math.abs(buildings[i].angle - angle);
    if (d < closestDist) {
      closestDist = d;
      closestIndex = i;
    }
  }

  if (closestIndex !== -1) {
    buildings.splice(closestIndex, 1);
    updateStats();
  }
}

function drawPlanet() {
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(zoom, zoom);

  const grad = ctx.createRadialGradient(
    0, 0, planet.radius * 0.2,
    0, 0, planet.radius
  );
  grad.addColorStop(0, "#3b9cff");
  grad.addColorStop(0.5, "#2f7fd1");
  grad.addColorStop(1, "#1b3f7a");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
  ctx.fill();

  const atmGrad = ctx.createRadialGradient(
    0, 0, planet.radius,
    0, 0, planet.atmosphereRadius
  );
  atmGrad.addColorStop(0, "rgba(169,220,255,0.35)");
  atmGrad.addColorStop(1, "rgba(169,220,255,0)");

  ctx.fillStyle = atmGrad;
  ctx.beginPath();
  ctx.arc(0, 0, planet.atmosphereRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate(planet.rotation);

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

  for (const b of buildings) {
    drawBuilding(b);
  }

  ctx.restore();
  ctx.restore();
}

function drawBuilding(b) {
  const baseR = planet.radius;
  const x = Math.cos(b.angle) * baseR;
  const y = Math.sin(b.angle) * baseR;

  const t = buildingTypes[b.type];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(b.angle + Math.PI / 2);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, baseR * 0.02, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -8);

  ctx.fillStyle = t.color;
  if (b.type === "house") {
    ctx.fillRect(-8, -14, 16, 14);
    ctx.beginPath();
    ctx.moveTo(-9, -14);
    ctx.lineTo(0, -22);
    ctx.lineTo(9, -14);
    ctx.closePath();
    ctx.fillStyle = "#f4f4f4";
    ctx.fill();
    ctx.fillStyle = t.color;
  } else if (b.type === "tree") {
    ctx.fillStyle = "#5c3b1a";
    ctx.fillRect(-2, -10, 4, 10);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.type === "farm") {
    ctx.fillRect(-10, -10, 20, 10);
    ctx.fillStyle = "#8fdc6f";
    ctx.fillRect(-9, -9, 18, 4);
    ctx.fillStyle = t.color;
  } else if (b.type === "tower") {
    ctx.fillRect(-4, -18, 8, 18);
    ctx.fillStyle = "#dfe3ff";
    ctx.fillRect(-3, -16, 6, 4);
    ctx.fillRect(-3, -10, 6, 4);
    ctx.fillStyle = t.color;
  }

  ctx.restore();
}

function drawBackground() {
  ctx.clearRect(0, 0, width, height);

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

function update(dt) {
  planet.rotation += planet.rotationSpeed * dt;
  planet.rotationSpeed *= planet.friction;

  zoom += (targetZoom - zoom) * 0.1;
}

function render() {
  drawBackground();
  drawPlanet();
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) {
    if (e.ctrlKey || e.metaKey) {
      removeBuildingAtScreen(e.clientX, e.clientY);
    } else {
      placeBuildingAtScreen(e.clientX, e.clientY, selectedTool);
    }
  } else if (e.button === 2) {
    removeBuildingAtScreen(e.clientX, e.clientY);
  }

  dragging = true;
  lastMouse.x = e.clientX;
  lastMouse.y = e.clientY;
});

canvas.addEventListener("mousemove", e => {
  if (dragging) {
    const dx = e.clientX - lastMouse.x;
    planet.rotation += dx * 0.005;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  }
});

canvas.addEventListener("mouseup", () => {
  dragging = false;
});

canvas.addEventListener("mouseleave", () => {
  dragging = false;
});

canvas.addEventListener("contextmenu", e => {
  e.preventDefault();
});

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const delta = -Math.sign(e.deltaY) * 0.1;
  targetZoom = Math.max(0.5, Math.min(2.2, targetZoom + delta));
}, { passive: false });

document.querySelectorAll(".tool").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedTool = btn.dataset.type;
  });
});

document.getElementById("clearBtn").addEventListener("click", () => {
  buildings.length = 0;
  updateStats();
});
