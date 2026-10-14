(() => {
  document.getElementById("gameTitle").textContent = "Længst øst";
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
          lng: Array.isArray(c.latlng) ? c.latlng[1] : null,
        }))
        .filter((c) => c.name && typeof c.lng === "number");
      return { pool, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.lng >= b.lng ? a : b));
      return {
        prompt: "Hvilket land ligger <strong>længst øst</strong>?",
        options: shuffle(four).map((c) => ({ id: c.cca3 || c.name, label: escapeHtml(c.name) })),
        correctId: correct.cca3 || correct.name,
        revealOk: `${correct.name} (${correct.lng.toFixed(1)}°)`,
        revealBad: `Østligst: ${correct.name} (${correct.lng.toFixed(1)}°)`,
      };
    },
  });
})();
