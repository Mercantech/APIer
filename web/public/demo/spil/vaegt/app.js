(() => {
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/pokemon?limit=151").then((r) => r.json())).filter(
        (p) => p.weight > 0 && p.spriteUrl
      );
      return { pool, status: `${pool.length} Pokémon med vægt` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.weight >= b.weight ? a : b));
      return {
        prompt: "Hvilken Pokémon vejer <strong>mest</strong>?",
        options: shuffle(four).map((p) => ({
          id: String(p.id),
          label: `<img src="${escapeHtml(p.spriteUrl)}" width="40" height="40" alt="" style="vertical-align:middle;margin-right:.4rem"/>${escapeHtml(p.name)}`,
        })),
        correctId: String(correct.id),
        revealOk: `${correct.name}: ${correct.weight / 10} kg`,
        revealBad: `Tungest: ${correct.name} (${correct.weight / 10} kg)`,
      };
    },
  });
})();
