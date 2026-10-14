(() => {
  document.getElementById("gameTitle").textContent = "Mest magi";
  const { escapeHtml, shuffle, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const ver = (await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) =>
        r.json()
      ))[0];
      const data = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`
      ).then((r) => r.json());
      const pool = Object.values(data.data || {}).map((c) => ({
        id: c.id,
        name: c.name,
        magic: c.info?.magic ?? 0,
      }));
      return { pool, status: `${pool.length} champs` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.magic >= b.magic ? a : b));
      return {
        prompt: "Hvem har højest <strong>magic</strong>-rating?",
        options: shuffle(four).map((c) => ({
          id: c.id,
          label: escapeHtml(c.name),
        })),
        correctId: correct.id,
        revealOk: `${correct.name}: magic ${correct.magic}`,
        revealBad: `Mest magi: ${correct.name} (${correct.magic})`,
      };
    },
  });
})();
