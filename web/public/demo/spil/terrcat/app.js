(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Terraria/items?limit=400").then((r) => r.json())).filter(
        (i) => i.category && i.name
      );
      const cats = [...new Set(pool.map((i) => i.category))];
      return { pool, cats, status: `${pool.length} items` };
    },
    getRound: (ctx) => {
      const i = pick(ctx.pool);
      const wrong = pickN(
        ctx.cats.filter((c) => c !== i.category),
        3
      );
      return {
        prompt: `Hvilken kategori er <strong>${escapeHtml(i.name)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">${escapeHtml(i.type || "")}</p>`,
        options: shuffle([i.category, ...wrong]).map((c) => ({
          id: c,
          label: escapeHtml(c),
        })),
        correctId: i.category,
        revealOk: `${i.name}: ${i.category}`,
        revealBad: `Kategori: ${i.category}`,
      };
    },
  });
})();
