(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          fifa: c.fifa || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.fifa);
      return { pool, status: `${pool.length} lande med FIFA-kode` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const wrong = pickN(
        ctx.pool.filter((c) => c.fifa !== correct.fifa).map((c) => c.fifa),
        3
      );
      return {
        prompt: `Hvad er FIFA-koden for <strong>${escapeHtml(correct.name)}</strong>?`,
        mediaHtml: correct.flag
          ? `<img class="flag" src="${escapeHtml(correct.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: shuffle([correct.fifa, ...wrong]).map((f) => ({
          id: f,
          label: escapeHtml(f),
        })),
        correctId: correct.fifa,
        revealOk: correct.fifa,
        revealBad: `FIFA: ${correct.fifa}`,
      };
    },
  });
})();
