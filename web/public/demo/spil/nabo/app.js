(() => {
  const { escapeHtml, shuffle, pick, pickN, scoreBar } = window.SpilCommon;

  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let byCca3 = new Map();
  let withBorders = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let locked = false;

  async function boot() {
    status.textContent = "Henter /api/Countries …";
    const res = await fetch("/api/Countries");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    byCca3 = new Map();
    for (const c of raw) {
      const cca3 = c.cca3 || c.Cca3;
      const name = c?.name?.common || c?.Name?.Common;
      const borders = c.borders || c.Borders || [];
      const flag = c?.flags?.png || c?.Flags?.Png || "";
      if (!cca3 || !name) continue;
      byCca3.set(cca3, { cca3, name, borders, flag });
    }

    withBorders = [...byCca3.values()].filter(
      (c) => Array.isArray(c.borders) && c.borders.some((b) => byCca3.has(b))
    );

    if (withBorders.length < 8) throw new Error("For få lande med naboer");
    status.textContent = `${withBorders.length} lande med grænser`;
    nextRound();
  }

  function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });

    const country = pick(withBorders);
    const neighborCodes = country.borders.filter((b) => byCca3.has(b));
    const correct = byCca3.get(pick(neighborCodes));

    const nonNeighbors = [...byCca3.values()].filter(
      (c) => c.cca3 !== country.cca3 && !neighborCodes.includes(c.cca3)
    );
    const options = shuffle([correct, ...pickN(nonNeighbors, 3)]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvilket land grænser op til <strong>${escapeHtml(country.name)}</strong>?</p>
      <div class="spil-media">
        ${
          country.flag
            ? `<img class="flag" src="${escapeHtml(country.flag)}" alt="" width="200" height="130" loading="lazy" />`
            : ""
        }
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
      btn.addEventListener("click", () => answer(btn, c, correct, options, country));
      choices.appendChild(btn);
    });

    document.getElementById("btnNext").addEventListener("click", nextRound);
  }

  function answer(btn, chosen, correct, options, country) {
    if (locked) return;
    locked = true;
    const ok = chosen.cca3 === correct.cca3;
    const feedback = document.getElementById("feedback");
    const neighborNames = country.borders
      .map((b) => byCca3.get(b)?.name)
      .filter(Boolean)
      .slice(0, 6);

    [...document.querySelectorAll(".spil-choice")].forEach((b, i) => {
      b.disabled = true;
      if (options[i].cca3 === correct.cca3) b.classList.add("correct");
    });
    if (!ok) btn.classList.add("wrong");

    if (ok) {
      score += 1;
      streak += 1;
      feedback.textContent = "Rigtigt!";
      feedback.className = "spil-feedback ok";
    } else {
      streak = 0;
      feedback.textContent = `Fx ${neighborNames.join(", ")}`;
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
