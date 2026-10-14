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
          region: c.region || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.region);
      const regions = [...new Set(pool.map((c) => c.region))];
      return { pool, regions, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.region, ...pickN(ctx.regions.filter((r) => r !== c.region), 3)]);
      return {
        prompt: `Hvilken region ligger <strong>${escapeHtml(c.name)}</strong> i?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="200" height="120" alt=""/>`
          : "",
        options: opts.map((r) => ({ id: r, label: escapeHtml(r) })),
        correctId: c.region,
        revealOk: c.region,
        revealBad: `Region: ${c.region}`,
      };
    },
  });
})();
