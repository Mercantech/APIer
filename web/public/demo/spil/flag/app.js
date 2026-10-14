(() => {
  const { escapeHtml, shuffle, pick, pickN, scoreBar } = window.SpilCommon;

  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let pool = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let locked = false;

  async function boot() {
    status.textContent = "Henter /api/Countries/simplified …";
    const res = await fetch("/api/Countries/simplified");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    pool = raw
      .map((c) => ({
        name: c?.name?.common || c?.Name?.Common || "",
        flag: c?.flags?.png || c?.Flags?.Png || "",
        cca3: c?.cca3 || c?.Cca3 || "",
      }))
      .filter((c) => c.name && c.flag);

    if (pool.length < 8) throw new Error("For få lande med flag");
    status.textContent = `${pool.length} lande med flag`;
    nextRound();
  }

  function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });

    const correct = pick(pool);
    const options = shuffle([correct, ...pickN(pool, 3, [correct])]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvilket land er dette?</p>
      <div class="spil-media">
        <img class="flag" src="${escapeHtml(correct.flag)}" alt="Flag" width="280" height="180" loading="lazy" />
      </div>
      <div class="spil-choices" id="choices"></div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions">
        <button type="button" class="btn primary sm" id="btnNext" hidden>Næste</button>
      </div>`;

    const choices = document.getElementById("choices");
    options.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.textContent = c.name;
      btn.addEventListener("click", () => answer(btn, c, correct, options));
      choices.appendChild(btn);
    });

    document.getElementById("btnNext").addEventListener("click", nextRound);
  }

  function answer(btn, chosen, correct, options) {
    if (locked) return;
    locked = true;
    const ok = chosen.name === correct.name;
    const feedback = document.getElementById("feedback");

    [...document.querySelectorAll(".spil-choice")].forEach((b, i) => {
      b.disabled = true;
      if (options[i].name === correct.name) b.classList.add("correct");
    });
    if (!ok) btn.classList.add("wrong");

    if (ok) {
      score += 1;
      streak += 1;
      feedback.textContent = "Rigtigt!";
      feedback.className = "spil-feedback ok";
    } else {
      streak = 0;
      feedback.textContent = `Det var ${correct.name}`;
      feedback.className = "spil-feedback bad";
    }
    scoreBar(scoreEl, { round, score, streak });
    document.getElementById("btnNext").hidden = false;
  }

  boot().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
