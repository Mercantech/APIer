(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const bosses = (await fetch("/api/Terraria/bosses").then((r) => r.json())).filter((b) => b.stage);
      // Dedup by name — keep first entry
      const seen = new Set();
      const pool = bosses.filter((b) => {
        if (seen.has(b.name)) return false;
        seen.add(b.name);
        return true;
      });
      const stages = [...new Set(pool.map((b) => b.stage))];
      return { pool, stages, status: `${pool.length} bosses` };
    },
    getRound: (ctx) => {
      const b = pick(ctx.pool);
      const wrong = pickN(
        ctx.stages.filter((s) => s !== b.stage),
        Math.min(2, ctx.stages.length - 1)
      );
      return {
        prompt: `Hvilken stage er <strong>${escapeHtml(b.name)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">HP ${escapeHtml(b.life)}</p>`,
        options: shuffle([b.stage, ...wrong]).map((s) => ({ id: s, label: escapeHtml(s) })),
        correctId: b.stage,
        revealOk: `${b.name}: ${b.stage}`,
        revealBad: `Stage: ${b.stage}`,
      };
    },
  });
})();
