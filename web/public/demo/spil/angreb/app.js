(() => {
  document.getElementById("gameTitle").textContent = "Højest attack";
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
        attack: c.info?.attack ?? 0,
      }));
      return { pool, status: `${pool.length} champs` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.attack >= b.attack ? a : b));
      return {
        prompt: "Hvem har højest <strong>attack</strong>-rating?",
        options: shuffle(four).map((c) => ({ id: c.id, label: escapeHtml(c.name) })),
        correctId: correct.id,
        revealOk: `${correct.name}: ${correct.attack}`,
        revealBad: `Højest ATK: ${correct.name} (${correct.attack})`,
      };
    },
  });
})();
