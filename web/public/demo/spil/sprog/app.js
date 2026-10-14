(() => {
  document.getElementById("gameTitle").textContent = "Officielt sprog";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => {
          const langs = c.languages ? Object.values(c.languages) : [];
          return {
            name: c?.name?.common || "",
            lang: langs[0] || "",
            langs,
            flag: c?.flags?.png || "",
          };
        })
        .filter((c) => c.name && c.lang);
      const langs = [...new Set(pool.map((c) => c.lang))];
      return { pool, langs, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.lang, ...pickN(ctx.langs.filter((l) => l !== c.lang), 3)]);
      return {
        prompt: `Hvad er et officielt sprog i <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((l) => ({ id: l, label: escapeHtml(l) })),
        correctId: c.lang,
        revealOk: c.langs.join(", "),
        revealBad: c.langs.join(", "),
      };
    },
  });
})();
