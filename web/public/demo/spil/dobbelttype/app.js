(() => {
  document.getElementById("gameTitle").textContent = "Én eller to typer?";
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/pokemon?limit=151").then((r) => r.json())).filter(
        (p) => p.spriteUrl && (p.types || []).length
      );
      return { pool, status: `${pool.length} Pokémon` };
    },
    getRound: (ctx) => {
      const p = pick(ctx.pool);
      const dual = (p.types || []).length >= 2;
      const correct = dual ? "To typer" : "Én type";
      return {
        prompt: `Har <strong>${escapeHtml(p.name)}</strong> én eller to typer?`,
        mediaHtml: `<img class="poke" src="${escapeHtml(p.spriteUrl)}" width="128" height="128" alt=""/>`,
        options: shuffle([
          { id: "Én type", label: "Én type" },
          { id: "To typer", label: "To typer" },
        ]),
        correctId: correct,
        revealOk: `${(p.types || []).join(" / ")}`,
        revealBad: `${(p.types || []).join(" / ")}`,
      };
    },
  });
})();
