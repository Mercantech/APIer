(() => {
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/go/minecraft/biomes?limit=500");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pool = (await res.json()).filter(
        (b) => b.displayName && typeof b.temperature === "number"
      );
      return { pool, status: `${pool.length} biomes med temperatur` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.temperature >= b.temperature ? a : b));
      return {
        prompt: "Hvilken biome er <strong>varmest</strong>?",
        options: shuffle(four).map((b) => ({
          id: b.name,
          label: escapeHtml(b.displayName),
        })),
        correctId: correct.name,
        revealOk: `${correct.displayName} (${correct.temperature})`,
        revealBad: `Varmest: ${correct.displayName} (${correct.temperature})`,
      };
    },
  });
})();
