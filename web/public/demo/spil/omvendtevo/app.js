(() => {
  document.getElementById("gameTitle").textContent = "Evolverer fra?";
  const { escapeHtml, shuffle, pick, pickN, scoreBar } = window.SpilCommon;
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let pool = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let locked = false;

  function orderChain(nodes) {
    const seen = new Set();
    const out = [];
    const roots = nodes.filter((n) => n.evolvesFromId == null);
    function walk(n) {
      if (!n || seen.has(n.id)) return;
      seen.add(n.id);
      out.push(n);
      nodes.filter((x) => x.evolvesFromId === n.id).forEach(walk);
    }
    roots.forEach(walk);
    nodes.forEach(walk);
    return out;
  }

  async function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });
    stage.innerHTML = `<p class="spil-prompt">Henter evolution…</p>`;

    let ordered = [];
    for (let i = 0; i < 12 && ordered.length < 2; i++) {
      const seed = pick(pool);
      const data = await fetch(`/go/pokemon/${seed.id}/evolutions`).then((r) => r.json());
      ordered = orderChain(data.chain || []).filter((n) => n.spriteUrl);
    }
    if (ordered.length < 2) {
      setTimeout(nextRound, 300);
      return;
    }

    const idx = 1 + Math.floor(Math.random() * (ordered.length - 1));
    const to = ordered[idx];
    const correct = ordered[idx - 1];
    const options = shuffle([correct, ...pickN(pool.filter((p) => p.id !== correct.id), 3)]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvad udvikler <strong>${escapeHtml(to.name)}</strong> sig <em>fra</em>?</p>
      <div class="spil-media"><img class="poke" src="${escapeHtml(to.spriteUrl)}" width="128" height="128" alt=""/></div>
      <div class="spil-choices" id="choices"></div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions"><button type="button" class="btn primary sm" id="btnNext" hidden>Næste</button></div>`;

    const choices = document.getElementById("choices");
    options.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.innerHTML = `<img src="${escapeHtml(p.spriteUrl)}" width="40" height="40" alt="" style="vertical-align:middle;margin-right:.4rem"/>${escapeHtml(p.name)}`;
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        const ok = p.id === correct.id;
        [...choices.querySelectorAll(".spil-choice")].forEach((b, i) => {
          b.disabled = true;
          if (options[i].id === correct.id) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        const fb = document.getElementById("feedback");
        if (ok) {
          score += 1;
          streak += 1;
          fb.textContent = `${correct.name} → ${to.name}`;
          fb.className = "spil-feedback ok";
        } else {
          streak = 0;
          fb.textContent = `${correct.name} → ${to.name}`;
          fb.className = "spil-feedback bad";
        }
        scoreBar(scoreEl, { round, score, streak });
        document.getElementById("btnNext").hidden = false;
      });
      choices.appendChild(btn);
    });
    document.getElementById("btnNext").addEventListener("click", nextRound);
  }

  (async () => {
    status.textContent = "Henter Pokémon…";
    pool = await fetch("/go/pokemon?limit=151").then((r) => r.json());
    status.textContent = `${pool.length} Pokémon klar`;
    nextRound();
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
