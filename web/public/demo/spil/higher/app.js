(() => {
  const { escapeHtml, pick, scoreBar } = window.SpilCommon;
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let pool = [];
  let current = null;
  let round = 0;
  let score = 0;
  let streak = 0;
  let locked = false;

  function next(prev) {
    locked = false;
    round += 1;
    let nextRow = pick(pool);
    let guard = 0;
    while (prev && nextRow.Date === prev.Date && guard++ < 20) nextRow = pick(pool);
    current = nextRow;
    scoreBar(scoreEl, { round, score, streak });

    const prevHtml = prev
      ? `<p class="demo-meta-line">Forrige: ${escapeHtml(prev.kind)} ${escapeHtml(prev.Date)} = <strong>${Number(prev.Price).toFixed(2)} kr</strong></p>`
      : `<p class="demo-meta-line">Første kort — gæt om næste er højere eller lavere</p>`;

    stage.innerHTML = `
      ${prevHtml}
      <p class="spil-prompt">${escapeHtml(current.kind)} · <strong>${escapeHtml(current.Date)}</strong></p>
      <p style="font-size:2rem;font-weight:700;margin:0;color:var(--accent)">${
        prev ? "???" : Number(current.Price).toFixed(2) + " kr"
      }</p>
      <div class="spil-choices" id="choices" style="${prev ? "" : "display:none"}"></div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions">
        <button type="button" class="btn primary sm" id="btnStart" ${prev ? "hidden" : ""}>Start</button>
      </div>`;

    if (!prev) {
      document.getElementById("btnStart").addEventListener("click", () => next(current));
      return;
    }

    const choices = document.getElementById("choices");
    [
      { id: "up", label: "Højere ▲" },
      { id: "down", label: "Lavere ▼" },
    ].forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        const higher = Number(current.Price) > Number(prev.Price);
        const ok =
          (opt.id === "up" && higher) ||
          (opt.id === "down" && !higher) ||
          Number(current.Price) === Number(prev.Price);
        const feedback = document.getElementById("feedback");
        [...choices.querySelectorAll(".spil-choice")].forEach((b) => (b.disabled = true));
        if (ok) {
          score += 1;
          streak += 1;
          feedback.textContent = `${Number(current.Price).toFixed(2)} kr — rigtigt!`;
          feedback.className = "spil-feedback ok";
        } else {
          streak = 0;
          feedback.textContent = `${Number(current.Price).toFixed(2)} kr — forkert`;
          feedback.className = "spil-feedback bad";
        }
        scoreBar(scoreEl, { round, score, streak });
        setTimeout(() => next(current), 900);
      });
      choices.appendChild(btn);
    });
  }

  (async () => {
    status.textContent = "Henter Diesel + Miles95…";
    const [d, m] = await Promise.all([
      fetch("/Opgaver/Diesel").then((r) => r.json()),
      fetch("/Opgaver/Miles95").then((r) => r.json()),
    ]);
    pool = [
      ...d.map((x) => ({ ...x, kind: "Diesel" })),
      ...m.map((x) => ({ ...x, kind: "Miles95" })),
    ];
    status.textContent = `${pool.length} pris-punkter · higher or lower`;
    next(null);
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
