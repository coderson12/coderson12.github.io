// Simple multiplayer-on-one-keyboard piano game

// ---- Audio setup ----
let audioCtx;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration = 0.25) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

// ---- Note mapping ----
// We'll map keys to a chromatic scale starting around C3
// White keys: base notes; Shift+key: black notes (sharp above)
const baseFreq = 130.81; // C3
const semitone = Math.pow(2, 1 / 12);

function noteFreq(stepsFromBase) {
  return baseFreq * Math.pow(semitone, stepsFromBase);
}

// Define a sequence of white-key steps (relative semitones)
const whiteSteps = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B pattern repeated

// Build a long list of white-note semitone offsets
const whiteOffsets = [];
for (let octave = 0; octave < 5; octave++) {
  for (let i = 0; i < whiteSteps.length; i++) {
    whiteOffsets.push(whiteSteps[i] + octave * 12);
  }
}

// Keyboard layout for white keys (long row)
const whiteKeysOrder = [
  "1","2","3","4","5","6","7","8","9","0","-","=",
  "q","w","e","r","t","y","u","i","o","p","[","]",
  "a","s","d","f","g","h","j","k","l",";","'",
  "z","x","c","v","b","n","m"
];

// Map key -> semitone offset index
const keyToOffset = {};
whiteKeysOrder.forEach((key, idx) => {
  if (idx < whiteOffsets.length) {
    keyToOffset[key] = whiteOffsets[idx];
  }
});

// For black notes: Shift + key = +1 semitone above that white note
// (if it exists and isn't E/B which don't have sharps in this simple layout)

// ---- DOM elements ----
const playerNameInput = document.getElementById("player-name-input");
const joinBtn = document.getElementById("join-btn");
const playersList = document.getElementById("players-list");
const activityLog = document.getElementById("activity-log");
const pianoVisual = document.getElementById("piano-visual");

let currentPlayerName = "Guest";

// ---- Players (local only) ----
const players = new Set();

joinBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Guest";
  currentPlayerName = name;
  players.add(name);
  renderPlayers();
});

function renderPlayers() {
  playersList.innerHTML = "";
  players.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    playersList.appendChild(li);
  });
}

// ---- Piano visual build ----
function buildPianoVisual() {
  pianoVisual.innerHTML = "";

  whiteKeysOrder.forEach((key, idx) => {
    const offset = keyToOffset[key];
    if (offset === undefined) return;

    const whiteKey = document.createElement("div");
    whiteKey.className = "white-key";
    whiteKey.dataset.key = key;
    whiteKey.dataset.offset = offset;

    const label = document.createElement("div");
    label.className = "key-label";
    label.textContent = key;
    whiteKey.appendChild(label);

    pianoVisual.appendChild(whiteKey);

    // Decide if this white note has a black note above it (no sharps for E/B)
    const semitoneInOctave = offset % 12;
    if (![4, 11].includes(semitoneInOctave)) {
      const blackKey = document.createElement("div");
      blackKey.className = "black-key";
      blackKey.dataset.key = key + "_sharp";
      blackKey.dataset.offset = offset + 1;

      const blabel = document.createElement("div");
      blabel.className = "key-label";
      blabel.textContent = "Shift+" + key;
      blackKey.appendChild(blabel);

      pianoVisual.appendChild(blackKey);
    }
  });
}

buildPianoVisual();

// ---- Activity log ----
function logActivity(player, noteName, isSharp) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="player">${player}</span> played <span class="note">${noteName}${isSharp ? "♯" : ""}</span>`;
  activityLog.prepend(li);

  // Limit log size
  if (activityLog.children.length > 40) {
    activityLog.removeChild(activityLog.lastChild);
  }
}

// ---- Key handling ----
function offsetToNoteName(offset) {
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const octave = 3 + Math.floor(offset / 12);
  const name = names[offset % 12];
  return { name, octave };
}

function flashKey(keyId, isSharp) {
  const selector = isSharp
    ? `.black-key[data-key="${keyId}"]`
    : `.white-key[data-key="${keyId}"]`;

  const el = pianoVisual.querySelector(selector);
  if (!el) return;
  el.classList.add("key-active");
  setTimeout(() => el.classList.remove("key-active"), 120);
}

document.addEventListener("keydown", (e) => {
  // Avoid repeating when holding key
  if (e.repeat) return;

  const key = e.key.toLowerCase();
  const isShift = e.shiftKey;

  if (!keyToOffset[key]) return;

  let offset = keyToOffset[key];
  let isSharp = false;

  // If Shift, try to play black note above
  if (isShift) {
    const semitoneInOctave = offset % 12;
    if (![4, 11].includes(semitoneInOctave)) {
      offset = offset + 1;
      isSharp = true;
    }
  }

  const freq = noteFreq(offset);
  playTone(freq);

  const { name, octave } = offsetToNoteName(offset);
  logActivity(currentPlayerName, name + octave, isSharp);

  const keyId = isSharp ? key + "_sharp" : key;
  flashKey(keyId, isSharp);
});

