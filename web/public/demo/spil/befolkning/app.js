(() => {
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;

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
          pop: c.population || 0,
          flag: c?.flags?.png || "",
          cca3: c.cca3 || "",
        }))
        .filter((c) => c.name && c.pop > 0);
      return { pool, status: `${pool.length} lande med population` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.pop >= b.pop ? a : b));
      return {
        prompt: "Hvilket land har flest indbyggere?",
        options: shuffle(four).map((c) => ({
          id: c.cca3 || c.name,
          label: `${escapeHtml(c.name)}${
            c.flag
              ? ` <img src="${escapeHtml(c.flag)}" alt="" width="28" height="18" style="float:right;border-radius:2px" />`
              : ""
          }`,
        })),
        correctId: correct.cca3 || correct.name,
        revealOk: `${correct.name}: ${correct.pop.toLocaleString("da-DK")}`,
        revealBad: `Flest: ${correct.name} (${correct.pop.toLocaleString("da-DK")})`,
      };
    },
  });
})();
