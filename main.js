const playBtn = document.getElementById("playBtn");
const startBtn = document.getElementById("startBtn");

function flashStart() {
  if (startBtn.dataset.locked === "1") return;
  startBtn.dataset.locked = "1";
  startBtn.textContent = "Loading grid…";
  setTimeout(() => {
    startBtn.textContent = "Prototype not wired yet";
  }, 900);
}

playBtn.addEventListener("click", flashStart);
startBtn.addEventListener("click", flashStart);

window.addEventListener("keydown", () => {
  if (startBtn.textContent.includes("Press any key")) {
    flashStart();
  }
});


