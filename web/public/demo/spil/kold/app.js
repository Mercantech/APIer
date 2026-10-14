(() => {
  document.getElementById("gameTitle").textContent = "Koldeste biome";
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/minecraft/biomes?limit=500").then((r) => r.json())).filter(
        (b) => typeof b.temperature === "number" && b.displayName
      );
      return { pool, status: `${pool.length} biomes` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.temperature <= b.temperature ? a : b));
      return {
        prompt: "Hvilken biome er <strong>koldest</strong>?",
        options: shuffle(four).map((b) => ({ id: b.name, label: escapeHtml(b.displayName) })),
        correctId: correct.name,
        revealOk: `${correct.displayName} (${correct.temperature})`,
        revealBad: `Koldest: ${correct.displayName} (${correct.temperature})`,
      };
    },
  });
})();
