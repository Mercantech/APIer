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
          continent: (c.continents || [])[0] || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.continent);
      const continents = [...new Set(pool.map((c) => c.continent))];
      return { pool, continents, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([
        c.continent,
        ...pickN(
          ctx.continents.filter((x) => x !== c.continent),
          Math.min(3, ctx.continents.length - 1)
        ),
      ]);
      return {
        prompt: `Hvilket kontinent hører <strong>${escapeHtml(c.name)}</strong> til?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="200" height="120" alt=""/>`
          : "",
        options: opts.map((x) => ({ id: x, label: escapeHtml(x) })),
        correctId: c.continent,
        revealOk: c.continent,
        revealBad: `Kontinent: ${c.continent}`,
      };
    },
  });
})();
