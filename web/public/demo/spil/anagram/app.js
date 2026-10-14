(() => {
  const { escapeHtml, shuffle, pick, scoreBar } = window.SpilCommon;
  const status = document.getElementById("status");
  const stage = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  let words = [];
  let round = 0;
  let score = 0;
  let streak = 0;
  let secret = "";
  let scramble = "";

  function scrambleWord(w) {
    let s = w;
    let guard = 0;
    while (s === w && guard++ < 30) s = shuffle(w.split("")).join("");
    return s;
  }

  function next() {
    round += 1;
    secret = pick(words);
    scramble = scrambleWord(secret);
    scoreBar(scoreEl, { round, score, streak });
    stage.innerHTML = `
      <p class="spil-prompt">Ret anagrammet</p>
      <p style="font-size:2rem;font-weight:700;letter-spacing:0.2em;margin:0;font-family:var(--mono)">${escapeHtml(scramble.toUpperCase())}</p>
      <form id="form" class="spil-actions" style="width:min(360px,100%);display:grid;gap:0.65rem">
        <input type="text" id="guess" maxlength="12" autocomplete="off" spellcheck="false"
          placeholder="Dit gæt" style="font:inherit;padding:0.7rem 0.9rem;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.28);color:var(--text);text-align:center;text-transform:lowercase"/>
        <button type="submit" class="btn primary sm">Tjek</button>
      </form>
      <p class="spil-feedback" id="feedback"></p>`;
    const form = document.getElementById("form");
    const input = document.getElementById("guess");
    input.focus();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const g = input.value.trim().toLowerCase();
      const feedback = document.getElementById("feedback");
      if (g === secret) {
        score += 1;
        streak += 1;
        feedback.textContent = "Rigtigt!";
        feedback.className = "spil-feedback ok";
        scoreBar(scoreEl, { round, score, streak });
        setTimeout(next, 700);
      } else {
        streak = 0;
        feedback.textContent = `Forkert — det var ${secret}`;
        feedback.className = "spil-feedback bad";
        scoreBar(scoreEl, { round, score, streak });
        setTimeout(next, 1100);
      }
    });
  }

  (async () => {
    status.textContent = "Henter /Opgaver/Wordle …";
    const data = await fetch("/Opgaver/Wordle").then((r) => r.json());
    words = (data.wordlist || [])
      .map((w) => String(w).toLowerCase())
      .filter((w) => /^[a-z]{5}$/.test(w));
    if (words.length < 50) throw new Error("For få ord");
    status.textContent = `${words.length} ord · anagram`;
    next();
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
