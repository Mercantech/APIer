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
    status.textContent = "Henter /go/pokemon?limit=151 …";
    const res = await fetch("/go/pokemon?limit=151");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pool = (await res.json()).filter((p) => p.name && p.spriteUrl);
    if (pool.length < 8) throw new Error("For få Pokémon");
    status.textContent = `${pool.length} Pokémon klar`;
    nextRound();
  }

  function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });

    const correct = pick(pool);
    const options = shuffle([correct, ...pickN(pool, 3, [correct])]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvem er den Pokémon?</p>
      <div class="spil-media">
        <img class="poke silhuet" id="portrait" src="${escapeHtml(correct.spriteUrl)}"
          alt="" width="128" height="128" />
      </div>
      <div class="spil-choices" id="choices"></div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions">
        <button type="button" class="btn primary sm" id="btnNext" hidden>Næste</button>
      </div>`;

    const choices = document.getElementById("choices");
    options.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.textContent = p.name;
      btn.addEventListener("click", () => answer(btn, p, correct, options));
      choices.appendChild(btn);
    });

    document.getElementById("btnNext").addEventListener("click", nextRound);
  }

  function answer(btn, chosen, correct, options) {
    if (locked) return;
    locked = true;
    const ok = chosen.id === correct.id;
    const feedback = document.getElementById("feedback");
    const portrait = document.getElementById("portrait");
    portrait.classList.remove("silhuet");
    portrait.classList.add("revealed");

    [...document.querySelectorAll(".spil-choice")].forEach((b, i) => {
      b.disabled = true;
      if (options[i].id === correct.id) b.classList.add("correct");
    });
    if (!ok) btn.classList.add("wrong");

    if (ok) {
      score += 1;
      streak += 1;
      feedback.textContent = `#${correct.id} ${correct.name}`;
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
