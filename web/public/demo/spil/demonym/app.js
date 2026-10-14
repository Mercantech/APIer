(() => {
  document.getElementById("gameTitle").textContent = "Demonym";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          demonym: c.demonyms?.eng?.m || c.demonyms?.eng?.f || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.demonym);
      return { pool, status: `${pool.length} demonyms` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const wrong = pickN(
        ctx.pool.filter((c) => c.demonym !== correct.demonym).map((c) => c.demonym),
        3
      );
      return {
        prompt: `Hvad kaldes en person fra <strong>${escapeHtml(correct.name)}</strong>?`,
        mediaHtml: correct.flag
          ? `<img class="flag" src="${escapeHtml(correct.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: shuffle([correct.demonym, ...wrong]).map((d) => ({
          id: d,
          label: escapeHtml(d),
        })),
        correctId: correct.demonym,
        revealOk: correct.demonym,
        revealBad: `Demonym: ${correct.demonym}`,
      };
    },
  });
})();
