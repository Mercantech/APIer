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
          capital: (c.capital || [])[0] || "",
        }))
        .filter((c) => c.name && c.capital);
      return { pool, status: `${pool.length} hovedstæder` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const wrong = pickN(
        ctx.pool.filter((c) => c.name !== correct.name).map((c) => c.name),
        3
      );
      return {
        prompt: `<strong>${escapeHtml(correct.capital)}</strong> er hovedstad i…?`,
        options: shuffle([correct.name, ...wrong]).map((n) => ({
          id: n,
          label: escapeHtml(n),
        })),
        correctId: correct.name,
        revealOk: correct.name,
        revealBad: `${correct.capital} → ${correct.name}`,
      };
    },
  });
})();
