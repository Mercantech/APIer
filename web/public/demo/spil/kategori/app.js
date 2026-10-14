(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/minecraft/mobs?limit=400").then((r) => r.json())).filter(
        (m) => m.displayName && m.category
      );
      const cats = [...new Set(pool.map((m) => m.category))];
      return { pool, cats, status: `${pool.length} mobs · ${cats.length} kategorier` };
    },
    getRound: (ctx) => {
      const m = pick(ctx.pool);
      const wrong = pickN(
        ctx.cats.filter((c) => c !== m.category),
        3
      );
      return {
        prompt: `Hvilken kategori er <strong>${escapeHtml(m.displayName)}</strong>?`,
        options: shuffle([m.category, ...wrong]).map((c) => ({ id: c, label: escapeHtml(c) })),
        correctId: m.category,
        revealOk: m.category,
        revealBad: `Kategori: ${m.category}`,
      };
    },
  });
})();
