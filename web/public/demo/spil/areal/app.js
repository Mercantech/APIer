(() => {
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          area: c.area || 0,
          cca3: c.cca3 || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && c.area > 0);
      return { pool, status: `${pool.length} lande med areal` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.area >= b.area ? a : b));
      return {
        prompt: "Hvilket land har størst <strong>areal</strong>?",
        options: shuffle(four).map((c) => ({
          id: c.cca3 || c.name,
          label: `${escapeHtml(c.name)}${
            c.flag
              ? ` <img src="${escapeHtml(c.flag)}" width="28" height="18" alt="" style="float:right;border-radius:2px"/>`
              : ""
          }`,
        })),
        correctId: correct.cca3 || correct.name,
        revealOk: `${correct.name}: ${Math.round(correct.area).toLocaleString("da-DK")} km²`,
        revealBad: `Størst: ${correct.name} (${Math.round(correct.area).toLocaleString("da-DK")} km²)`,
      };
    },
  });
})();
