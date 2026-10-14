(() => {
  document.getElementById("gameTitle").textContent = "Længst syd";
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
          lat: Array.isArray(c.latlng) ? c.latlng[0] : null,
        }))
        .filter((c) => c.name && typeof c.lat === "number");
      return { pool, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.lat <= b.lat ? a : b));
      return {
        prompt: "Hvilket land ligger <strong>længst syd</strong>?",
        options: shuffle(four).map((c) => ({ id: c.cca3 || c.name, label: escapeHtml(c.name) })),
        correctId: correct.cca3 || correct.name,
        revealOk: `${correct.name} (${correct.lat.toFixed(1)}°)`,
        revealBad: `Sydligst: ${correct.name} (${correct.lat.toFixed(1)}°)`,
      };
    },
  });
})();
