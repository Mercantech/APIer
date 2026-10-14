(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/StarWars/starships?limit=100").then((r) => r.json())).filter(
        (s) => s.starship_class && s.name
      );
      const classes = [...new Set(pool.map((s) => s.starship_class))];
      return { pool, classes, status: `${pool.length} starships` };
    },
    getRound: (ctx) => {
      const s = pick(ctx.pool);
      const wrong = pickN(
        ctx.classes.filter((c) => c !== s.starship_class),
        3
      );
      return {
        prompt: `Hvilken klasse er <strong>${escapeHtml(s.name)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">${escapeHtml(s.model || "")}</p>`,
        options: shuffle([s.starship_class, ...wrong]).map((c) => ({
          id: c,
          label: escapeHtml(c),
        })),
        correctId: s.starship_class,
        revealOk: `${s.name}: ${s.starship_class}`,
        revealBad: `Klasse: ${s.starship_class}`,
      };
    },
  });
})();
