(() => {
  const { escapeHtml, shuffle, pick, pickN, titleCase, scoreBar } = window.SpilCommon;
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";

  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let pool = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let locked = false;

  function imgUrl(name) {
    return `${ASSET}/items/${name}.png`;
  }

  function mcImg(name) {
    const n = escapeHtml(name);
    return `<img class="mc" src="${imgUrl(name)}" alt="" width="96" height="96" loading="lazy"
      onerror="this.onerror=null;this.src='${ASSET}/blocks/${n}.png'" />`;
  }

  function tinyImg(name) {
    const n = escapeHtml(name);
    return `<img src="${imgUrl(name)}" alt="" width="24" height="24" loading="lazy"
      onerror="this.onerror=null;this.src='${ASSET}/blocks/${n}.png'" />`;
  }

  function flattenShape(inShape) {
    const ids = [];
    for (const row of inShape || []) {
      for (const cell of row || []) {
        if (cell != null && cell !== 0) ids.push(cell);
      }
    }
    return ids;
  }

  function uniqueSorted(names) {
    return [...new Set(names)].sort();
  }

  function keyFor(names) {
    return uniqueSorted(names).join("|");
  }

  async function boot() {
    status.textContent = "Henter items + recipes…";
    const [itemsRes, recipesRes] = await Promise.all([
      fetch("/go/minecraft/items?limit=5000"),
      fetch("/go/minecraft/recipes?limit=2000"),
    ]);
    if (!itemsRes.ok || !recipesRes.ok) throw new Error("Kunne ikke hente Minecraft-data");
    const items = await itemsRes.json();
    const recipes = await recipesRes.json();
    const idToName = Object.fromEntries(items.map((it) => [it.id, it.name]));

    pool = recipes
      .map((r) => {
        const shapeIds = flattenShape(r.raw?.inShape);
        const fromList = Array.isArray(r.ingredients) ? r.ingredients.filter((x) => x != null) : [];
        const ids = shapeIds.length ? shapeIds : fromList;
        const names = ids.map((id) => idToName[id]).filter(Boolean);
        if (!r.resultName || names.length < 1 || names.length > 6) return null;
        return {
          result: r.resultName,
          ingredients: uniqueSorted(names),
          key: keyFor(names),
        };
      })
      .filter(Boolean);

    // Unikke resultater (første recipe pr. item)
    const seen = new Set();
    pool = pool.filter((p) => {
      if (seen.has(p.result)) return false;
      seen.add(p.result);
      return true;
    });

    if (pool.length < 8) throw new Error("For få crafting-opskrifter til quiz");
    status.textContent = `${pool.length} opskrifter klar`;
    nextRound();
  }

  function nextRound() {
    locked = false;
    round += 1;
    scoreBar(scoreEl, { round, score, streak });

    const correct = pick(pool);
    const distractors = pickN(
      pool.filter((p) => p.key !== correct.key),
      3
    ).map((p) => p.ingredients);

    const options = shuffle([correct.ingredients, ...distractors]);

    stage.innerHTML = `
      <p class="spil-prompt">Hvad skal der til for at crafte <strong>${escapeHtml(titleCase(correct.result))}</strong>?</p>
      <div class="spil-media">${mcImg(correct.result)}</div>
      <div class="spil-choices" id="choices"></div>
      <p class="spil-feedback" id="feedback"></p>
      <div class="spil-actions">
        <button type="button" class="btn primary sm" id="btnNext" hidden>Næste</button>
      </div>`;

    const choices = document.getElementById("choices");
    options.forEach((ings) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "spil-choice";
      btn.innerHTML = `<div class="spil-ing-list">${ings
        .map((n) => `<span>${tinyImg(n)}${escapeHtml(titleCase(n))}</span>`)
        .join("")}</div>`;
      btn.addEventListener("click", () => answer(btn, ings, correct, options));
      choices.appendChild(btn);
    });

    document.getElementById("btnNext").addEventListener("click", nextRound);
  }

  function answer(btn, ings, correct, options) {
    if (locked) return;
    locked = true;
    const ok = keyFor(ings) === correct.key;
    const feedback = document.getElementById("feedback");
    const buttons = [...document.querySelectorAll(".spil-choice")];

    buttons.forEach((b, i) => {
      b.disabled = true;
      if (keyFor(options[i]) === correct.key) b.classList.add("correct");
    });
    if (!ok) btn.classList.add("wrong");

    if (ok) {
      score += 1;
      streak += 1;
      feedback.textContent = "Rigtigt!";
      feedback.className = "spil-feedback ok";
    } else {
      streak = 0;
      feedback.textContent = `Forkert — det var: ${correct.ingredients.map(titleCase).join(", ")}`;
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
