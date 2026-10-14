(() => {
  document.getElementById("gameTitle").textContent = "Dex-nummer";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/pokemon?limit=151").then((r) => r.json())).filter((p) => p.spriteUrl);
      return { pool, status: `${pool.length} Pokémon` };
    },
    getRound: (ctx) => {
      const p = pick(ctx.pool);
      const wrong = pickN(
        ctx.pool.filter((x) => x.id !== p.id).map((x) => x.id),
        3
      );
      return {
        prompt: `Hvilket national-dex-nummer har <strong>${escapeHtml(p.name)}</strong>?`,
        mediaHtml: `<img class="poke" src="${escapeHtml(p.spriteUrl)}" width="128" height="128" alt=""/>`,
        options: shuffle([p.id, ...wrong]).map((id) => ({ id: String(id), label: `#${id}` })),
        correctId: String(p.id),
        revealOk: `#${p.id}`,
        revealBad: `${p.name} er #${p.id}`,
      };
    },
  });
})();
