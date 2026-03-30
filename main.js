// -----------------------------
// SCREEN SWITCHING
// -----------------------------
function show(screen) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screen).classList.add("active");
}

// -----------------------------
// USER SYSTEM
// -----------------------------
function getUsers() {
  return JSON.parse(localStorage.getItem("users") || "{}");
}

function saveUser(username, password) {
  const users = getUsers();
  users[username] = password;
  localStorage.setItem("users", JSON.stringify(users));
}

function validateUser(username, password) {
  const users = getUsers();
  return users[username] === password;
}

let currentUser = null;

// -----------------------------
// QUIZ STORAGE
// -----------------------------
function getQuizzes() {
  return JSON.parse(localStorage.getItem("quizzes") || "[]");
}

function saveQuiz(quiz) {
  const quizzes = getQuizzes();
  quizzes.push(quiz);
  localStorage.setItem("quizzes", JSON.stringify(quizzes));
}

// -----------------------------
// LOGIN / SIGNUP
// -----------------------------
document.getElementById("login-btn").onclick = () => show("auth-screen");

document.getElementById("auth-login").onclick = () => {
  const user = auth-user.value.trim();
  const pass = auth-pass.value.trim();

  if (validateUser(user, pass)) {
    currentUser = user;
    auth-msg.textContent = "Logged in!";
    setTimeout(() => show("home-screen"), 600);
  } else {
    auth-msg.textContent = "Invalid login";
  }
};

document.getElementById("auth-signup").onclick = () => {
  const user = auth-user.value.trim();
  const pass = auth-pass.value.trim();

  if (!user || !pass) {
    auth-msg.textContent = "Enter username & password";
    return;
  }

  saveUser(user, pass);
  auth-msg.textContent = "Account created!";
};

// -----------------------------
// PLAY SCREEN
// -----------------------------
document.getElementById("play-btn").onclick = () => {
  loadQuizList();
  show("play-screen");
};

function loadQuizList() {
  const list = document.getElementById("quiz-list");
  list.innerHTML = "";

  const quizzes = getQuizzes();

  quizzes.forEach((quiz, index) => {
    const btn = document.createElement("button");
    btn.textContent = quiz.title;
    btn.onclick = () => startGame(index);
    list.appendChild(btn);
  });
}

// -----------------------------
// GAME LOGIC
// -----------------------------
let currentQuiz = null;
let qIndex = 0;
let score = 0;

function startGame(index) {
  currentQuiz = getQuizzes()[index];
  qIndex = 0;
  score = 0;
  show("game-screen");
  loadQuestion();
}

function loadQuestion() {
  const q = currentQuiz.questions[qIndex];
  document.getElementById("game-question").textContent = q.q;

  const optionsDiv = document.getElementById("game-options");
  optionsDiv.innerHTML = "";

  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    div.textContent = opt;

    div.onclick = () => {
      document.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
      div.classList.add("selected");
      document.getElementById("game-next").classList.remove("hidden");
      div.dataset.index = i;
    };

    optionsDiv.appendChild(div);
  });

  document.getElementById("game-next").onclick = () => {
    const selected = document.querySelector(".option.selected");
    if (!selected) return;

    if (parseInt(selected.dataset.index) === q.answer) score++;

    qIndex++;

    if (qIndex >= currentQuiz.questions.length) {
      showResults();
    } else {
      loadQuestion();
    }
  };
}

function showResults() {
  document.getElementById("result-score").textContent =
    `You scored ${score} / ${currentQuiz.questions.length}`;
  show("result-screen");
}

document.getElementById("result-home").onclick = () => show("home-screen");

// -----------------------------
// CREATE QUIZ
// -----------------------------
document.getElementById("create-btn").onclick = () => show("create-screen");

document.getElementById("add-question").onclick = () => {
  const container = document.getElementById("questions-container");

  const block = document.createElement("div");
  block.className = "card";
  block.innerHTML = `
    <input class="q-text" type="text" placeholder="Question">
    <input class="q-opt" type="text" placeholder="Option 1">
    <input class="q-opt" type="text" placeholder="Option 2">
    <input class="q-opt" type="text" placeholder="Option 3">
    <input class="q-opt" type="text" placeholder="Option 4">
    <input class="q-answer" type="number" min="1" max="4" placeholder="Correct Option #">
  `;

  container.appendChild(block);
};

document.getElementById("save-quiz").onclick = () => {
  const title = document.getElementById("quiz-title").value.trim();
  const blocks = document.querySelectorAll("#questions-container .card");

  const questions = [];

  blocks.forEach(block => {
    const q = block.querySelector(".q-text").value;
    const opts = [...block.querySelectorAll(".q-opt")].map(i => i.value);
    const ans = parseInt(block.querySelector(".q-answer").value) - 1;

    if (q && opts.every(o => o) && ans >= 0) {
      questions.push({ q, options: opts, answer: ans });
    }
  });

  if (!title || questions.length === 0) return alert("Fill everything!");

  saveQuiz({ title, questions });

  alert("Quiz saved!");
  show("home-screen");
};

// -----------------------------
// SETTINGS
// -----------------------------
document.getElementById("settings-btn").onclick = () => show("settings-screen");

document.getElementById("theme-select").onchange = (e) => {
  if (e.target.value === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
};

// -----------------------------
// BACK BUTTONS
// -----------------------------
document.querySelectorAll(".back-btn").forEach(btn => {
  btn.onclick = () => show("home-screen");
});
