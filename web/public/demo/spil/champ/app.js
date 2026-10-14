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

  function champImg(alias) {
    return `/assets/lol/champions/${encodeURIComponent(alias)}.png`;
  }

  async function boot() {
    status.textContent = "Henter Data Dragon versions + champions…";
    const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) =>
      r.json()
    );
    const ver = versions[0];
    const data = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`
    ).then((r) => r.json());

    pool = Object.values(data.data || {}).map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
    }));

    if (pool.length < 8) throw new Error("For få champions");
    status.textContent = `${pool.length} champions · patch ${ver}`;
    nextRound();
  }

  function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });

    const correct = pick(pool);
    const options = shuffle([correct, ...pickN(pool, 3, [correct])]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvem er denne champion?</p>
      <div class="spil-media">
        <img class="champ silhuet" id="portrait" src="${escapeHtml(champImg(correct.id))}"
          alt="" width="128" height="128"
          onerror="this.onerror=null;this.src='https://cdn.communitydragon.org/latest/champion/${escapeHtml(correct.id)}/square'" />
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
      feedback.textContent = `${correct.name} — ${correct.title}`;
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
