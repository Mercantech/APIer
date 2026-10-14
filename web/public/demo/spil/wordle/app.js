(() => {
  const { escapeHtml, pick, normalizeName } = window.SpilCommon;
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  const MAX = 6;
  let answers = [];
  let valid = new Set();
  let secret = "";
  let row = 0;
  let col = 0;
  let grid = [];
  let done = false;
  let wins = 0;
  let games = 0;

  function updateScore() {
    scoreEl.innerHTML = `<span>Spil <strong>${games}</strong></span><span>Vundet <strong>${wins}</strong></span>`;
  }

  function paint() {
    const cells = [];
    for (let r = 0; r < MAX; r++) {
      for (let c = 0; c < 5; c++) {
        const ch = grid[r][c] || "";
        const state = grid[r].state?.[c] || "";
        cells.push(`<div class="wdl-cell ${state}">${escapeHtml(ch)}</div>`);
      }
    }
    stage.innerHTML = `
      <p class="spil-prompt">Gæt det engelske 5-bogstavs ord</p>
      <div class="wdl-grid">${cells.join("")}</div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions">
        <button type="button" class="btn ghost sm" id="btnEnter">Enter</button>
        <button type="button" class="btn ghost sm" id="btnDel">Slet</button>
        <button type="button" class="btn primary sm" id="btnNew" ${done ? "" : "hidden"}>Nyt ord</button>
      </div>
      <p class="demo-meta-line">Skriv på tastaturet · data fra /Opgaver/Wordle</p>`;
    document.getElementById("btnEnter").addEventListener("click", submit);
    document.getElementById("btnDel").addEventListener("click", del);
    document.getElementById("btnNew")?.addEventListener("click", newGame);
  }

  function scoreGuess(guess, target) {
    const res = Array(5).fill("absent");
    const t = target.split("");
    const g = guess.split("");
    const used = Array(5).fill(false);
    for (let i = 0; i < 5; i++) {
      if (g[i] === t[i]) {
        res[i] = "correct";
        used[i] = true;
        t[i] = null;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (res[i] === "correct") continue;
      const idx = t.indexOf(g[i]);
      if (idx >= 0) {
        res[i] = "present";
        t[idx] = null;
      }
    }
    return res;
  }

  function submit() {
    if (done) return;
    const guess = (grid[row] || []).join("");
    const feedback = () => document.getElementById("feedback");
    if (guess.length < 5) {
      feedback().textContent = "5 bogstaver tak";
      feedback().className = "spil-feedback bad";
      return;
    }
    if (!valid.has(guess)) {
      feedback().textContent = "Ordet er ikke i listen";
      feedback().className = "spil-feedback bad";
      return;
    }
    grid[row].state = scoreGuess(guess, secret);
    if (guess === secret) {
      done = true;
      wins += 1;
      feedback().textContent = `Godt! ${secret.toUpperCase()}`;
      feedback().className = "spil-feedback ok";
      updateScore();
      paint();
      return;
    }
    row += 1;
    col = 0;
    if (row >= MAX) {
      done = true;
      feedback().textContent = `Ordet var ${secret.toUpperCase()}`;
      feedback().className = "spil-feedback bad";
    }
    updateScore();
    paint();
  }

  function del() {
    if (done || col === 0) return;
    col -= 1;
    grid[row][col] = "";
    paint();
  }

  function typeChar(ch) {
    if (done || col >= 5) return;
    grid[row][col] = ch;
    col += 1;
    paint();
  }

  function newGame() {
    secret = pick(answers);
    row = 0;
    col = 0;
    done = false;
    games += 1;
    grid = Array.from({ length: MAX }, () => Object.assign(["", "", "", "", ""], { state: null }));
    updateScore();
    paint();
    status.textContent = "Nyt spil — 6 forsøg";
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      del();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      typeChar(e.key.toLowerCase());
    }
  });

  (async () => {
    status.textContent = "Henter /Opgaver/Wordle …";
    const res = await fetch("/Opgaver/Wordle");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = (data.wordlist || []).map((w) => String(w).toLowerCase()).filter((w) => w.length === 5);
    valid = new Set(list);
    // Prefer "ordinary" words (no rare letters combo) — use full list as answers
    answers = list.filter((w) => /^[a-z]{5}$/.test(w));
    if (answers.length < 100) throw new Error("For få ord");
    status.textContent = `${answers.length} ord klar`;
    newGame();
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
