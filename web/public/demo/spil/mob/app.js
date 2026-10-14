(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/go/minecraft/mobs?limit=300");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pool = (await res.json()).filter(
        (m) => m.name && m.displayName && m.type === "mob"
      );
      return { pool, status: `${pool.length} mobs` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const options = shuffle([correct, ...pickN(ctx.pool, 3, [correct])]);
      const src = `${ASSET}/entity/${correct.name}/${correct.name}.png`;
      return {
        prompt: "Hvilken mob er dette?",
        mediaHtml: `<img class="champ silhuet" id="portrait" src="${escapeHtml(src)}" alt="" width="128" height="128"
          onerror="this.style.display='none'" />`,
        options: options.map((m) => ({ id: m.name, label: escapeHtml(m.displayName) })),
        correctId: correct.name,
        revealOk: correct.displayName,
        revealBad: `Det var ${correct.displayName}`,
        onReveal: () => {
          const img = document.getElementById("portrait");
          if (img) {
            img.classList.remove("silhuet");
            img.classList.add("revealed");
          }
        },
      };
    },
  });
})();
