(() => {
  document.getElementById("gameTitle").textContent = "Subregion";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          subregion: c.subregion || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.subregion);
      const subs = [...new Set(pool.map((c) => c.subregion))];
      return { pool, subs, status: `${pool.length} lande · ${subs.length} subregions` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.subregion, ...pickN(ctx.subs.filter((s) => s !== c.subregion), 3)]);
      return {
        prompt: `Hvilken subregion er <strong>${escapeHtml(c.name)}</strong> i?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((s) => ({ id: s, label: escapeHtml(s) })),
        correctId: c.subregion,
        revealOk: c.subregion,
        revealBad: `Subregion: ${c.subregion}`,
      };
    },
  });
})();
