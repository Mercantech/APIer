(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/StarWars/people?limit=100").then((r) => r.json())).filter(
        (p) => p.name && p.birth_year && p.birth_year !== "unknown"
      );
      return { pool, status: `${pool.length} personer` };
    },
    getRound: (ctx) => {
      const p = pick(ctx.pool);
      const wrong = pickN(
        ctx.pool.filter((x) => x.apiId !== p.apiId),
        3
      );
      return {
        prompt: `Hvem er født <strong>${escapeHtml(p.birth_year)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">${escapeHtml(p.gender)} · ${escapeHtml(p.eye_color)} øjne</p>`,
        options: shuffle([p, ...wrong]).map((x) => ({
          id: String(x.apiId),
          label: escapeHtml(x.name),
        })),
        correctId: String(p.apiId),
        revealOk: `${p.name} (${p.birth_year})`,
        revealBad: `Det er ${p.name}`,
      };
    },
  });
})();
