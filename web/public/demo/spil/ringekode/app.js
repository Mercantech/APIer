(() => {
  document.getElementById("gameTitle").textContent = "Landekode";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => {
          const root = c.idd?.root || "";
          const suf = (c.idd?.suffixes || [])[0] || "";
          const code = root && suf ? `${root}${suf}` : root || "";
          return {
            name: c?.name?.common || "",
            code,
            flag: c?.flags?.png || "",
          };
        })
        .filter((c) => c.name && c.code && c.code.length >= 2);
      const codes = [...new Set(pool.map((c) => c.code))];
      return { pool, codes, status: `${pool.length} lande med telefonkode` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.code, ...pickN(ctx.codes.filter((x) => x !== c.code), 3)]);
      return {
        prompt: `Hvad er telefon-landekoden for <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((code) => ({ id: code, label: escapeHtml(code) })),
        correctId: c.code,
        revealOk: c.code,
        revealBad: `Kode: ${c.code}`,
      };
    },
  });
})();
