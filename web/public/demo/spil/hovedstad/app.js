(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/api/Countries");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pool = (await res.json())
        .map((c) => ({
          name: c?.name?.common || "",
          capital: (c.capital || [])[0] || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.capital);
      return { pool, status: `${pool.length} lande med hovedstad` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const wrongCaps = pickN(
        ctx.pool.filter((c) => c.capital !== correct.capital).map((c) => c.capital),
        3
      );
      const options = shuffle([correct.capital, ...wrongCaps]).map((cap) => ({
        id: cap,
        label: escapeHtml(cap),
      }));
      return {
        prompt: `Hvad er hovedstaden i <strong>${escapeHtml(correct.name)}</strong>?`,
        mediaHtml: correct.flag
          ? `<img class="flag" src="${escapeHtml(correct.flag)}" alt="" width="220" height="140" />`
          : "",
        options,
        correctId: correct.capital,
        revealOk: correct.capital,
        revealBad: `Hovedstad: ${correct.capital}`,
      };
    },
  });
})();
