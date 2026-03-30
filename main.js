/* GLOBAL */
body {
  margin: 0;
  font-family: Poppins, sans-serif;
  background: #0f172a;
  color: white;
  overflow-x: hidden;
}

.screen {
  display: none;
  text-align: center;
  padding: 40px;
  animation: fadeIn 0.5s ease;
}

.screen.active {
  display: block;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* HOME SCREEN */
.title {
  font-size: 3rem;
  margin-bottom: 10px;
  color: #38bdf8;
  animation: float 3s infinite ease-in-out;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.8;
  margin-bottom: 40px;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 250px;
  margin: auto;
}

.menu-btn {
  padding: 15px;
  border-radius: 10px;
  border: none;
  background: #1e293b;
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  transition: 0.2s;
}

.menu-btn:hover {
  background: #38bdf8;
  transform: scale(1.05);
}

/* CARDS */
.card {
  background: #1e293b;
  padding: 20px;
  border-radius: 10px;
  margin: 20px auto;
  width: 90%;
  max-width: 500px;
}

input, select {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border-radius: 8px;
  border: none;
  background: #0f172a;
  color: white;
}

button {
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  background: #38bdf8;
  color: #0f172a;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  transform: scale(1.05);
}

/* QUIZ OPTIONS */
.option {
  background: #1e293b;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.option:hover {
  background: #334155;
}

.option.selected {
  background: #0ea5e9;
  color: black;
}

/* BACK BUTTON */
.back-btn {
  margin-top: 20px;
  background: #64748b;
}

.hidden {
  display: none;
}

/* LIGHT THEME */
.light {
  background: #f1f5f9;
  color: black;
}

.light .card {
  background: white;
}

.light .menu-btn {
  background: #e2e8f0;
  color: black;
}

.light .option {
  background: #e2e8f0;
  color: black;
}
