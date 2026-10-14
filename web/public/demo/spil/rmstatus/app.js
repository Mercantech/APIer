(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/RickAndMorty/characters?limit=400").then((r) => r.json())).filter(
        (c) => c.image && c.status
      );
      const statuses = [...new Set(pool.map((c) => c.status))];
      return { pool, statuses, status: `${pool.length} characters` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const wrong = pickN(
        ctx.statuses.filter((s) => s !== c.status),
        Math.min(2, ctx.statuses.length - 1)
      );
      return {
        prompt: `Hvad er status for <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: `<img src="${escapeHtml(c.image)}" alt="" width="140" height="140" style="border-radius:12px" />`,
        options: shuffle([c.status, ...wrong]).map((s) => ({ id: s, label: escapeHtml(s) })),
        correctId: c.status,
        revealOk: `${c.name}: ${c.status}`,
        revealBad: `Svaret er ${c.status}`,
      };
    },
  });
})();
