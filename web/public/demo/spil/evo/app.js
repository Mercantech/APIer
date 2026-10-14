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

  async function boot() {
    status.textContent = "Henter /go/pokemon?limit=151 …";
    const res = await fetch("/go/pokemon?limit=151");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pool = await res.json();
    status.textContent = `${pool.length} Pokémon klar`;
    nextRound();
  }

  async function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });
    stage.innerHTML = `<p class="spil-prompt">Henter evolution…</p>`;

    let ordered = [];
    for (let attempt = 0; attempt < 12 && ordered.length < 2; attempt++) {
      const seed = pick(pool);
      const res = await fetch(`/go/pokemon/${seed.id}/evolutions`);
      if (!res.ok) continue;
      const data = await res.json();
      ordered = orderChain(data.chain || []).filter((n) => n.spriteUrl);
    }
    if (ordered.length < 2) {
      status.textContent = "Kunne ikke finde evolution — prøv igen";
      setTimeout(nextRound, 400);
      return;
    }

    const idx = Math.floor(Math.random() * (ordered.length - 1));
    const from = ordered[idx];
    const correct = ordered[idx + 1];
    const options = shuffle([correct, ...pickN(pool.filter((p) => p.id !== correct.id), 3)]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvad udvikler <strong>${escapeHtml(from.name)}</strong> sig til?</p>
      <div class="spil-media">
        <img class="poke" src="${escapeHtml(from.spriteUrl)}" alt="" width="128" height="128" />
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
      btn.innerHTML = `<img src="${escapeHtml(p.spriteUrl)}" alt="" width="40" height="40" style="vertical-align:middle;margin-right:0.5rem" />${escapeHtml(p.name)}`;
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        const ok = p.id === correct.id;
        [...choices.querySelectorAll(".spil-choice")].forEach((b, i) => {
          b.disabled = true;
          if (options[i].id === correct.id) b.classList.add("correct");
        });
        if (!ok) btn.classList.add("wrong");
        const feedback = document.getElementById("feedback");
        if (ok) {
          score += 1;
          streak += 1;
          feedback.textContent = `${from.name} → ${correct.name}`;
          feedback.className = "spil-feedback ok";
        } else {
          streak = 0;
          feedback.textContent = `${from.name} → ${correct.name}`;
          feedback.className = "spil-feedback bad";
        }
        scoreBar(scoreEl, { round, score, streak });
        document.getElementById("btnNext").hidden = false;
      });
      choices.appendChild(btn);
    });
    document.getElementById("btnNext").addEventListener("click", () => nextRound());
  }

  boot().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
