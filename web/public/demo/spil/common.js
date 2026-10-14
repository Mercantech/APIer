(() => {
  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickN(arr, n, exclude) {
    const ex = new Set(exclude || []);
    const pool = shuffle(arr.filter((x) => !ex.has(x)));
    return pool.slice(0, n);
  }

  function normalizeName(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9æøå]/g, "");
  }

  function titleCase(name) {
    return String(name || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function scoreBar(el, { round, score, streak }) {
    el.innerHTML = `
      <span>Runde <strong>${round}</strong></span>
      <span>Point <strong>${score}</strong></span>
      <span>Streak <strong>${streak}</strong></span>`;
  }

  /**
   * Simpel multiple-choice quiz-loop.
   * getRound() → { prompt, mediaHtml?, options:[{id,label}], correctId, revealText? }
   */
  function runChoiceQuiz({ statusEl, stageEl, scoreEl, boot, getRound }) {
    let round = 0;
    let score = 0;
    let streak = 0;
    let locked = false;
    let ctx = null;

    async function start() {
      statusEl.textContent = "Henter data…";
      statusEl.classList.remove("error");
      ctx = await boot();
      statusEl.textContent = ctx.status || "Klar";
      next();
    }

    function next() {
      locked = false;
      round += 1;
      scoreBar(scoreEl, { round, score, streak });
      const q = getRound(ctx);
      stageEl.innerHTML = `
        <p class="spil-prompt">${q.prompt}</p>
        <div class="spil-media">${q.mediaHtml || ""}</div>
        <div class="spil-choices" id="choices"></div>
        <p class="spil-feedback" id="feedback"></p>
        <div class="spil-actions">
          <button type="button" class="btn primary sm" id="btnNext" hidden>Næste</button>
        </div>`;

      const choices = document.getElementById("choices");
      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "spil-choice";
        btn.innerHTML = opt.label;
        btn.addEventListener("click", () => {
          if (locked) return;
          locked = true;
          const ok = opt.id === q.correctId;
          const feedback = document.getElementById("feedback");
          [...choices.querySelectorAll(".spil-choice")].forEach((b, i) => {
            b.disabled = true;
            if (q.options[i].id === q.correctId) b.classList.add("correct");
          });
          if (!ok) btn.classList.add("wrong");
          if (q.onReveal) q.onReveal(ok);
          if (ok) {
            score += 1;
            streak += 1;
            feedback.textContent = q.revealOk || "Rigtigt!";
            feedback.className = "spil-feedback ok";
          } else {
            streak = 0;
            feedback.textContent = q.revealBad || "Forkert";
            feedback.className = "spil-feedback bad";
          }
          scoreBar(scoreEl, { round, score, streak });
          document.getElementById("btnNext").hidden = false;
        });
        choices.appendChild(btn);
      });

      document.getElementById("btnNext").addEventListener("click", next);
    }

    start().catch((e) => {
      statusEl.textContent = e.message || "Fejl";
      statusEl.classList.add("error");
    });
  }

  function gameShellHtml({ backHref, backLabel, title, eyebrow, lede, extraNav }) {
    return null; // HTML laves som filer
  }

  window.SpilCommon = {
    escapeHtml,
    shuffle,
    pick,
    pickN,
    normalizeName,
    titleCase,
    scoreBar,
    runChoiceQuiz,
  };
})();
