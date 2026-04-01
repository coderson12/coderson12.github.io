// Simple FL-Studio-like step sequencer with sample upload + export

// ---- Audio context ----
let audioCtx;
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// ---- Default samples (simple synthesized drums) ----
async function createDefaultBuffer(type) {
  const ctx = getAudioContext();
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "kick") {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 10);
      const freq = 150 * Math.exp(-t * 20);
      data[i] = env * Math.sin(2 * Math.PI * freq * t);
    }
  } else if (type === "snare") {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 20);
      data[i] = env * (Math.random() * 2 - 1);
    }
  } else if (type === "hat") {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 40);
      data[i] = env * (Math.random() * 2 - 1);
    }
  } else if (type === "clap") {
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 15);
      const noise = (Math.random() * 2 - 1) * 0.7;
      data[i] = env * noise;
    }
  }

  return buffer;
}

// ---- Track setup ----
const trackDefs = [
  { name: "Kick", type: "kick" },
  { name: "Snare", type: "snare" },
  { name: "Hi-Hat", type: "hat" },
  { name: "Clap", type: "clap" }
];

const NUM_STEPS = 16;

const tracks = []; // {name, buffer, volume, steps[], elements}

const tracksContainer = document.getElementById("tracks");
const bpmSlider = document.getElementById("bpm");
const bpmValue = document.getElementById("bpm-value");
const playBtn = document.getElementById("play-btn");
const stopBtn = document.getElementById("stop-btn");
const exportBtn = document.getElementById("export-btn");

bpmValue.textContent = bpmSlider.value;

// Build UI + load default buffers
(async function initTracks() {
  for (const def of trackDefs) {
    const buffer = await createDefaultBuffer(def.type);
    const track = {
      name: def.name,
      buffer,
      volume: 0.8,
      steps: new Array(NUM_STEPS).fill(false),
      elements: {}
    };
    tracks.push(track);
    createTrackRow(track);
  }
})();

// ---- Create track row UI ----
function createTrackRow(track) {
  const row = document.createElement("div");
  row.className = "track-row";

  const info = document.createElement("div");
  info.className = "track-info";

  const nameEl = document.createElement("div");
  nameEl.className = "track-name";
  nameEl.textContent = track.name;

  const controls = document.createElement("div");
  controls.className = "track-controls";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const ctx = getAudioContext();
    ctx.decodeAudioData(arrayBuffer, decoded => {
      track.buffer = decoded;
    });
  });

  const volLabel = document.createElement("span");
  volLabel.textContent = "Vol";

  const volSlider = document.createElement("input");
  volSlider.type = "range";
  volSlider.min = 0;
  volSlider.max = 1;
  volSlider.step = 0.01;
  volSlider.value = track.volume;

  volSlider.addEventListener("input", () => {
    track.volume = parseFloat(volSlider.value);
  });

  controls.appendChild(fileInput);
  controls.appendChild(volLabel);
  controls.appendChild(volSlider);

  info.appendChild(nameEl);
  info.appendChild(controls);

  row.appendChild(info);

  // Steps
  const stepEls = [];
  for (let i = 0; i < NUM_STEPS; i++) {
    const step = document.createElement("div");
    step.className = "step";
    step.dataset.index = i;

    step.addEventListener("click", () => {
      track.steps[i] = !track.steps[i];
      step.classList.toggle("active", track.steps[i]);
    });

    row.appendChild(step);
    stepEls.push(step);
  }

  track.elements.row = row;
  track.elements.steps = stepEls;

  tracksContainer.appendChild(row);
}

// ---- Sequencer ----
let isPlaying = false;
let currentStep = 0;
let timerId = null;

function scheduleNextStep() {
  if (!isPlaying) return;

  const bpm = parseInt(bpmSlider.value, 10);
  const stepDurationMs = (60_000 / bpm) / 4; // 16 steps per bar

  // Visual current step
  tracks.forEach(track => {
    track.elements.steps.forEach((el, idx) => {
      el.classList.toggle("current", idx === currentStep);
    });
  });

  // Play active steps
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  tracks.forEach(track => {
    if (track.steps[currentStep] && track.buffer) {
      const src = ctx.createBufferSource();
      src.buffer = track.buffer;

      const gain = ctx.createGain();
      gain.gain.value = track.volume;

      src.connect(gain);
      gain.connect(ctx.destination);

      src.start(now);
    }
  });

  currentStep = (currentStep + 1) % NUM_STEPS;
  timerId = setTimeout(scheduleNextStep, stepDurationMs);
}

playBtn.addEventListener("click", () => {
  if (isPlaying) return;
  getAudioContext(); // ensure context exists
  isPlaying = true;
  currentStep = 0;
  scheduleNextStep();
});

stopBtn.addEventListener("click", () => {
  isPlaying = false;
  clearTimeout(timerId);
  tracks.forEach(track => {
    track.elements.steps.forEach(el => el.classList.remove("current"));
  });
});

bpmSlider.addEventListener("input", () => {
  bpmValue.textContent = bpmSlider.value;
});

// ---- Export loop ----
exportBtn.addEventListener("click", async () => {
  const bpm = parseInt(bpmSlider.value, 10);
  const ctx = getAudioContext();

  const bars = 1;
  const secondsPerBeat = 60 / bpm;
  const secondsPerBar = secondsPerBeat * 4;
  const totalDuration = secondsPerBar * bars;

  const offlineCtx = new OfflineAudioContext(
    2,
    Math.ceil(ctx.sampleRate * totalDuration),
    ctx.sampleRate
  );

  const stepDuration = secondsPerBar / NUM_STEPS;

  tracks.forEach(track => {
    if (!track.buffer) return;

    for (let stepIndex = 0; stepIndex < NUM_STEPS; stepIndex++) {
      if (!track.steps[stepIndex]) continue;

      const time = stepIndex * stepDuration;
      const src = offlineCtx.createBufferSource();
      src.buffer = track.buffer;

      const gain = offlineCtx.createGain();
      gain.gain.value = track.volume;

      src.connect(gain);
      gain.connect(offlineCtx.destination);

      src.start(time);
    }
  });

  const rendered = await offlineCtx.startRendering();
  const wavBlob = bufferToWavBlob(rendered);
  const url = URL.createObjectURL(wavBlob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "beat.wav";
  a.click();

  URL.revokeObjectURL(url);
});

// ---- Convert AudioBuffer to WAV Blob ----
function bufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);

  let offset = 0;
  let pos = 0;

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF chunk descriptor
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // FMT sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // size
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * numOfChan * 2);
  setUint16(numOfChan * 2);
  setUint16(16);

  // data sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  // Write interleaved data
  const channels = [];
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let sample;
  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArray], { type: "audio/wav" });
}

