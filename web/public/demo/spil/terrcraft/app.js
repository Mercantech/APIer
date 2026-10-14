(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const recipes = (
        await fetch("/api/Terraria/recipes?limit=400").then((r) => r.json())
      ).filter((r) => r.station && r.resultName);
      const stations = [...new Set(recipes.map((r) => r.station))];
      return { recipes, stations, status: `${recipes.length} opskrifter` };
    },
    getRound: (ctx) => {
      const r = pick(ctx.recipes);
      const wrong = pickN(
        ctx.stations.filter((s) => s !== r.station),
        3
      );
      return {
        prompt: `Hvor craftes <strong>${escapeHtml(r.resultName)}</strong>?`,
        mediaHtml: `<p class="demo-meta-line">${escapeHtml((r.ingredients || []).slice(0, 3).join(", "))}</p>`,
        options: shuffle([r.station, ...wrong]).map((s) => ({
          id: s,
          label: escapeHtml(s),
        })),
        correctId: r.station,
        revealOk: `${r.resultName} → ${r.station}`,
        revealBad: `Station: ${r.station}`,
      };
    },
  });
})();
