(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (
        await fetch("/api/Terraria/items/weapons?limit=300").then((r) => r.json())
      ).filter((i) => i.damageType && i.damage != null);
      const types = [...new Set(pool.map((i) => i.damageType))];
      return { pool, types, status: `${pool.length} våben` };
    },
    getRound: (ctx) => {
      const w = pick(ctx.pool);
      const wrong = pickN(
        ctx.types.filter((t) => t !== w.damageType),
        3
      );
      return {
        prompt: `Hvilken damage-type har <strong>${escapeHtml(w.name)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">${w.damage} damage · rarity ${w.rarity}</p>`,
        options: shuffle([w.damageType, ...wrong]).map((t) => ({
          id: t,
          label: escapeHtml(t),
        })),
        correctId: w.damageType,
        revealOk: `${w.name}: ${w.damageType}`,
        revealBad: `Type: ${w.damageType}`,
      };
    },
  });
})();
