(() => {
  document.getElementById("gameTitle").textContent = "Flest timezones";
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          cca3: c.cca3 || "",
          n: (c.timezones || []).length,
        }))
        .filter((c) => c.name && c.n > 0);
      return { pool, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.n >= b.n ? a : b));
      return {
        prompt: "Hvilket land har flest <strong>timezones</strong>?",
        options: shuffle(four).map((c) => ({ id: c.cca3 || c.name, label: escapeHtml(c.name) })),
        correctId: correct.cca3 || correct.name,
        revealOk: `${correct.name}: ${correct.n}`,
        revealBad: `Flest: ${correct.name} (${correct.n})`,
      };
    },
  });
})();
