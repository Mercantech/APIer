(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/RickAndMorty/characters?limit=400").then((r) => r.json())).filter(
        (c) => c.image && c.gender
      );
      const genders = [...new Set(pool.map((c) => c.gender))];
      return { pool, genders, status: `${pool.length} characters` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const wrong = pickN(
        ctx.genders.filter((g) => g !== c.gender),
        Math.min(3, ctx.genders.length - 1)
      );
      return {
        prompt: `Hvilket gender har <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: `<img src="${escapeHtml(c.image)}" alt="" width="140" height="140" style="border-radius:12px" />`,
        options: shuffle([c.gender, ...wrong]).map((g) => ({ id: g, label: escapeHtml(g) })),
        correctId: c.gender,
        revealOk: `${c.name}: ${c.gender}`,
        revealBad: `Gender: ${c.gender}`,
      };
    },
  });
})();
