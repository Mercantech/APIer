(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/RickAndMorty/characters?limit=500").then((r) => r.json())).filter(
        (c) => c.image && c.species
      );
      const species = [...new Set(pool.map((c) => c.species))];
      return { pool, species, status: `${pool.length} characters · ${species.length} species` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const wrong = pickN(
        ctx.species.filter((s) => s !== c.species),
        3
      );
      return {
        prompt: `Hvilken species er <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: `<img src="${escapeHtml(c.image)}" alt="" width="140" height="140" style="border-radius:12px" />`,
        options: shuffle([c.species, ...wrong]).map((s) => ({ id: s, label: escapeHtml(s) })),
        correctId: c.species,
        revealOk: `${c.name}: ${c.species}`,
        revealBad: `Species: ${c.species}`,
      };
    },
  });
})();
