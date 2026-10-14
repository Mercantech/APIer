(() => {
  const { escapeHtml, normalizeName, pick } = window.SpilCommon;

  const status = document.getElementById("status");
  const scoreEl = document.getElementById("score");
  const grid = document.getElementById("grid");

  /** @type {Map<string, string[]>} */
  let byLetter = new Map();
  /** @type {Map<string, Set<string>>} */
  let norms = new Map();

  function startingLetter(name) {
    const cleaned = String(name || "").replace(/^The\s+/i, "").trim();
    const ch = cleaned.charAt(0).toUpperCase();
    return /^[A-Z]$/.test(ch) ? ch : null;
  }

  function updateScore() {
    const letters = [...byLetter.keys()];
    let ok = 0;
    for (const L of letters) {
      const input = grid.querySelector(`input[data-letter="${L}"]`);
      if (!input) continue;
      const n = normalizeName(input.value);
      if (n && norms.get(L)?.has(n)) {
        ok += 1;
        input.closest(".alfabet-cell")?.classList.add("ok");
      } else {
        input.closest(".alfabet-cell")?.classList.remove("ok");
      }
    }
    scoreEl.innerHTML = `<span>Udfyldt <strong>${ok}</strong> / ${letters.length}</span>`;
    status.textContent =
      ok === letters.length
        ? "Alle bogstaver klar — flot!"
        : `${letters.length} bogstaver i datasættet (X findes ikke som startbogstav)`;
  }

  async function boot() {
    status.textContent = "Henter /api/Countries/simplified …";
    const res = await fetch("/api/Countries/simplified");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const names = raw
      .map((c) => c?.name?.common || c?.Name?.Common || "")
      .filter(Boolean);

    byLetter = new Map();
    norms = new Map();
    for (const name of names) {
      const L = startingLetter(name);
      if (!L) continue;
      if (!byLetter.has(L)) {
        byLetter.set(L, []);
        norms.set(L, new Set());
      }
      byLetter.get(L).push(name);
      norms.get(L).add(normalizeName(name));
    }

    const letters = [...byLetter.keys()].sort();
    grid.innerHTML = letters
      .map(
        (L) => `
      <label class="alfabet-cell">
        <span class="letter">${L}</span>
        <input type="text" data-letter="${L}" placeholder="Land med ${L}…" autocomplete="off" spellcheck="false" />
      </label>`
      )
      .join("");

    grid.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", updateScore);
      input.addEventListener("change", updateScore);
    });

    updateScore();
  }

  document.getElementById("btnCheck").addEventListener("click", () => {
    updateScore();
    let firstWrong = null;
    grid.querySelectorAll("input").forEach((input) => {
      const L = input.dataset.letter;
      const n = normalizeName(input.value);
      const good = n && norms.get(L)?.has(n);
      input.closest(".alfabet-cell")?.classList.toggle("ok", !!good);
      if (!good && input.value.trim() && !firstWrong) firstWrong = input;
    });
    if (firstWrong) firstWrong.focus();
  });

  document.getElementById("btnHint").addEventListener("click", () => {
    const empty = [...grid.querySelectorAll("input")].filter((i) => !i.value.trim());
    if (!empty.length) {
      status.textContent = "Alle felter er udfyldt — tryk Tjek alle";
      return;
    }
    const input = pick(empty);
    const L = input.dataset.letter;
    const sample = pick(byLetter.get(L) || []);
    input.value = sample;
    input.focus();
    updateScore();
    status.textContent = `Hint ${L}: ${sample}`;
  });

  boot().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
