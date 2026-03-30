// -----------------------------
// USER SYSTEM (LocalStorage)
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

// -----------------------------
// ELEMENTS
// -----------------------------
const authSection = document.getElementById("auth-section");
const gameSection = document.getElementById("game-section");

const signupUser = document.getElementById("signup-user");
const signupPass = document.getElementById("signup-pass");
const signupBtn = document.getElementById("signup-btn");
const signupMsg = document.getElementById("signup-msg");

const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginBtn = document.getElementById("login-btn");
const loginMsg = document.getElementById("login-msg");

const playerName = document.getElementById("player-name");
const startBtn = document.getElementById("start-btn");

const quizBox = document.getElementById("quiz-box");
const questionText = document.getElementById("question");
const optionsDiv = document.getElementById("options");
const nextBtn = document.getElementById("next-btn");

const resultBox = document.getElementById("result-box");
const scoreText = document.getElementById("score");
const restartBtn = document.getElementById("restart-btn");

// -----------------------------
// QUIZ DATA
// -----------------------------
const quiz = [
  {
    q: "What does HTML stand for?",
    options: [
      "Hyper Trainer Marking Language",
      "Hyper Text Markup Language",
      "Hyper Text Marketing Language",
      "Hyper Tool Multi Language"
    ],
    answer: 1
  },
  {
    q: "Which language runs in the browser?",
    options: ["Python", "C++", "JavaScript", "Java"],
    answer: 2
  },
  {
    q: "What does CSS control?",
    options: ["Structure", "Style", "Database", "Server"],
    answer: 1
  }
];

let currentIndex = 0;
let selected = null;
let score = 0;

// -----------------------------
// SIGNUP
// -----------------------------
signupBtn.addEventListener("click", () => {
  const user = signupUser.value.trim();
  const pass = signupPass.value.trim();

  if (!user || !pass) {
    signupMsg.textContent = "Enter username & password";
    signupMsg.style.color = "red";
    return;
  }

  const users = getUsers();
  if (users[user]) {
    signupMsg.textContent = "Username already exists";
    signupMsg.style.color = "red";
    return;
  }

  saveUser(user, pass);
  signupMsg.textContent = "Account created!";
  signupMsg.style.color = "lightgreen";
});

// -----------------------------
// LOGIN
// -----------------------------
loginBtn.addEventListener("click", () => {
  const user = loginUser.value.trim();
  const pass = loginPass.value.trim();

  if (validateUser(user, pass)) {
    authSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    playerName.textContent = user;
  } else {
    loginMsg.textContent = "Invalid login";
    loginMsg.style.color = "red";
  }
});

// -----------------------------
// START QUIZ
// -----------------------------
startBtn.addEventListener("click", () => {
  currentIndex = 0;
  score = 0;
  quizBox.classList.remove("hidden");
  resultBox.classList.add("hidden");
  loadQuestion();
});

// -----------------------------
// LOAD QUESTION
// -----------------------------
function loadQuestion() {
  const q = quiz[currentIndex];
  questionText.textContent = q.q;

  optionsDiv.innerHTML = "";
  selected = null;
  nextBtn.classList.add("hidden");

  q.options.forEach((opt, i) => {
    const btn = document.createElement("div");
    btn.className = "option";
    btn.textContent = opt;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
      btn.classList.add("selected");
      selected = i;
      nextBtn.classList.remove("hidden");
    });

    optionsDiv.appendChild(btn);
  });

  nextBtn.textContent = currentIndex === quiz.length - 1 ? "Submit" : "Next";
}

// -----------------------------
// NEXT / SUBMIT
// -----------------------------
nextBtn.addEventListener("click", () => {
  if (selected === quiz[currentIndex].answer) {
    score++;
  }

  currentIndex++;

  if (currentIndex < quiz.length) {
    loadQuestion();
  } else {
    showResults();
  }
});

// -----------------------------
// RESULTS
// -----------------------------
function showResults() {
  quizBox.classList.add("hidden");
  resultBox.classList.remove("hidden");
  scoreText.textContent = `You scored ${score} / ${quiz.length}`;
}

// -----------------------------
// RESTART
// -----------------------------
restartBtn.addEventListener("click", () => {
  resultBox.classList.add("hidden");
  quizBox.classList.add("hidden");
});
