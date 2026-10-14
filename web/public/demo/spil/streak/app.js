(() => {
  document.getElementById("gameTitle").textContent = "Flag-streak";
  const { escapeHtml, shuffle, pick, pickN, scoreBar } = window.SpilCommon;
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let pool = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let best = 0;
  let locked = false;

  function next() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });
    const correct = pick(pool);
    const options = shuffle([correct, ...pickN(pool, 3, [correct])]);
    stage.innerHTML = `
      <p class="spil-prompt">Gæt flaget — best streak: <strong>${best}</strong></p>
      <div class="spil-media"><img class="flag" src="${escapeHtml(correct.flag)}" width="260" height="160" alt=""/></div>
      <div class="spil-choices" id="choices"></div>
      <p class="spil-feedback" id="feedback"></p>`;
    const choices = document.getElementById("choices");
    options.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.textContent = c.name;
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        const ok = c.name === correct.name;
        [...choices.querySelectorAll(".spil-choice")].forEach((b, i) => {
          b.disabled = true;
          if (options[i].name === correct.name) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        const fb = document.getElementById("feedback");
        if (ok) {
          score += 1;
          streak += 1;
          best = Math.max(best, streak);
          fb.textContent = "Videre!";
          fb.className = "spil-feedback ok";
          scoreBar(scoreEl, { round, score, streak });
          setTimeout(next, 550);
        } else {
          streak = 0;
          fb.textContent = `Det var ${correct.name} — streak nulstillet`;
          fb.className = "spil-feedback bad";
          scoreBar(scoreEl, { round, score, streak });
          setTimeout(next, 1100);
        }
      });
      choices.appendChild(btn);
    });
  }

  (async () => {
    status.textContent = "Henter lande…";
    const raw = await fetch("/api/Countries/simplified").then((r) => r.json());
    pool = raw
      .map((c) => ({
        name: c?.name?.common || "",
        flag: c?.flags?.png || "",
      }))
      .filter((c) => c.name && c.flag);
    status.textContent = `${pool.length} flag · hold streaken!`;
    next();
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
