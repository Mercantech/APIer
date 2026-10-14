(() => {
  document.getElementById("gameTitle").textContent = "Højeste mob";
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/minecraft/mobs?limit=400").then((r) => r.json())).filter(
        (m) => m.displayName && typeof m.height === "number" && m.height > 0
      );
      return { pool, status: `${pool.length} mobs` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.height >= b.height ? a : b));
      return {
        prompt: "Hvilken mob er <strong>højest</strong>?",
        options: shuffle(four).map((m) => ({ id: m.name, label: escapeHtml(m.displayName) })),
        correctId: correct.name,
        revealOk: `${correct.displayName}: ${correct.height}`,
        revealBad: `Højest: ${correct.displayName} (${correct.height})`,
      };
    },
  });
})();
