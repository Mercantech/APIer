(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/StarWars/planets?limit=100").then((r) => r.json())).filter(
        (p) => p.climate && p.climate !== "unknown" && p.name !== "unknown"
      );
      const climates = [...new Set(pool.map((p) => p.climate))];
      return { pool, climates, status: `${pool.length} planeter` };
    },
    getRound: (ctx) => {
      const p = pick(ctx.pool);
      const wrong = pickN(
        ctx.climates.filter((c) => c !== p.climate),
        3
      );
      return {
        prompt: `Hvilket klima har <strong>${escapeHtml(p.name)}</strong>?`,
        options: shuffle([p.climate, ...wrong]).map((c) => ({ id: c, label: escapeHtml(c) })),
        correctId: p.climate,
        revealOk: `${p.name}: ${p.climate}`,
        revealBad: `Klima: ${p.climate}`,
      };
    },
  });
})();
