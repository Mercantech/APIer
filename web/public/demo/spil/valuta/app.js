(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => {
          const codes = c.currencies ? Object.keys(c.currencies) : [];
          const names = codes.map((k) => c.currencies[k]?.name || k);
          return {
            name: c?.name?.common || "",
            code: codes[0] || "",
            currencyName: names[0] || "",
            flag: c?.flags?.png || "",
          };
        })
        .filter((c) => c.name && c.code);
      const codes = [...new Set(pool.map((c) => c.code))];
      return { pool, codes, status: `${pool.length} lande med valuta` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.code, ...pickN(ctx.codes.filter((x) => x !== c.code), 3)]);
      return {
        prompt: `Hvilken valutakode bruger <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((code) => ({ id: code, label: escapeHtml(code) })),
        correctId: c.code,
        revealOk: `${c.code} — ${c.currencyName}`,
        revealBad: `${c.code} (${c.currencyName})`,
      };
    },
  });
})();
