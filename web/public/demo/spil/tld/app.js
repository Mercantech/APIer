(() => {
  document.getElementById("gameTitle").textContent = "Internet-TLD";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          tld: (c.tld || [])[0] || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.tld && c.tld.startsWith("."));
      const tlds = [...new Set(pool.map((c) => c.tld))];
      return { pool, tlds, status: `${pool.length} lande med TLD` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const opts = shuffle([c.tld, ...pickN(ctx.tlds.filter((t) => t !== c.tld), 3)]);
      return {
        prompt: `Hvilket top-level domain hører til <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((t) => ({ id: t, label: escapeHtml(t) })),
        correctId: c.tld,
        revealOk: c.tld,
        revealBad: `TLD: ${c.tld}`,
      };
    },
  });
})();
