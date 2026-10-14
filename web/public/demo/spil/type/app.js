(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/go/pokemon?limit=151");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pool = (await res.json()).filter((p) => p.spriteUrl && (p.types || []).length);
      const types = [...new Set(pool.flatMap((p) => p.types))];
      return { pool, types, status: `${pool.length} Pokémon · ${types.length} typer` };
    },
    getRound: (ctx) => {
      const p = pick(ctx.pool);
      const correct = pick(p.types);
      const wrong = pickN(
        ctx.types.filter((t) => t !== correct),
        3
      );
      const options = shuffle([correct, ...wrong]).map((t) => ({
        id: t,
        label: escapeHtml(t),
      }));
      return {
        prompt: `Hvilken type har <strong>${escapeHtml(p.name)}</strong>?`,
        mediaHtml: `<img class="poke" src="${escapeHtml(p.spriteUrl)}" alt="" width="128" height="128" />`,
        options,
        correctId: correct,
        revealOk: `${p.name}: ${(p.types || []).join(", ")}`,
        revealBad: `Typer: ${(p.types || []).join(", ")}`,
      };
    },
  });
})();
