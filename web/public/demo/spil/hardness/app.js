(() => {
  const { escapeHtml, shuffle, pickN, titleCase, runChoiceQuiz } = window.SpilCommon;
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/go/minecraft/blocks?limit=2000");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pool = (await res.json()).filter(
        (b) => b.diggable && typeof b.hardness === "number" && b.hardness > 0 && b.name !== "air"
      );
      return { pool, status: `${pool.length} grave-bare blocks` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.hardness >= b.hardness ? a : b));
      return {
        prompt: "Hvilken block har højest <strong>hardness</strong>?",
        options: shuffle(four).map((b) => ({
          id: b.name,
          label: `${escapeHtml(b.displayName || titleCase(b.name))}
            <img src="${ASSET}/blocks/${escapeHtml(b.name)}.png" alt="" width="28" height="28"
              style="float:right;image-rendering:pixelated"
              onerror="this.style.display='none'" />`,
        })),
        correctId: correct.name,
        revealOk: `${correct.displayName || correct.name}: ${correct.hardness}`,
        revealBad: `Hårdest: ${correct.displayName || correct.name} (${correct.hardness})`,
      };
    },
  });
})();
