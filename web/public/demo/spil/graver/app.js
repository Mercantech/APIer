(() => {
  document.getElementById("gameTitle").textContent = "Kan man grave den?";
  const { escapeHtml, shuffle, pick, titleCase, runChoiceQuiz } = window.SpilCommon;
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const all = await fetch("/go/minecraft/blocks?limit=2000").then((r) => r.json());
      const pool = all.filter((b) => b.name && b.name !== "air" && typeof b.diggable === "boolean");
      return { pool, status: `${pool.length} blocks` };
    },
    getRound: (ctx) => {
      const b = pick(ctx.pool);
      const correct = b.diggable ? "Ja" : "Nej";
      return {
        prompt: `Kan man grave <strong>${escapeHtml(b.displayName || titleCase(b.name))}</strong>?`,
        mediaHtml: `<img class="mc" src="${ASSET}/blocks/${escapeHtml(b.name)}.png" width="64" height="64" alt="" style="image-rendering:pixelated"
          onerror="this.style.display='none'"/>`,
        options: shuffle([
          { id: "Ja", label: "Ja" },
          { id: "Nej", label: "Nej" },
        ]),
        correctId: correct,
        revealOk: correct,
        revealBad: `Svar: ${correct}`,
      };
    },
  });
})();
