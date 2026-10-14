(() => {
  const { escapeHtml, shuffle, pick, pickN, titleCase, runChoiceQuiz } = window.SpilCommon;
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/go/minecraft/items?limit=2000").then((r) => r.json())).filter(
        (i) => i.name && i.name !== "air" && [1, 16, 64].includes(i.stackSize)
      );
      return { pool, status: `${pool.length} items` };
    },
    getRound: (ctx) => {
      const item = pick(ctx.pool);
      const sizes = shuffle([1, 16, 64]);
      return {
        prompt: `Hvad er max stack-size for <strong>${escapeHtml(item.displayName || titleCase(item.name))}</strong>?`,
        mediaHtml: `<img class="mc" src="${ASSET}/items/${escapeHtml(item.name)}.png" width="64" height="64" alt=""
          onerror="this.onerror=null;this.src='${ASSET}/blocks/${escapeHtml(item.name)}.png'" style="image-rendering:pixelated"/>`,
        options: sizes.map((s) => ({ id: String(s), label: String(s) })),
        correctId: String(item.stackSize),
        revealOk: `${item.stackSize}`,
        revealBad: `Stack-size: ${item.stackSize}`,
      };
    },
  });
})();
