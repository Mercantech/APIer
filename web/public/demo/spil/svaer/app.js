(() => {
  document.getElementById("gameTitle").textContent = "Sværhedsgrad";
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
        difficulty: c.info?.difficulty ?? 0,
      }));
      return { pool, status: `${pool.length} champs` };
    },
    getRound: (ctx) => {
      const four = pickN(ctx.pool, 4);
      const correct = four.reduce((a, b) => (a.difficulty >= b.difficulty ? a : b));
      return {
        prompt: "Hvilken champion har højest <strong>difficulty</strong>?",
        options: shuffle(four).map((c) => ({
          id: c.id,
          label: `${escapeHtml(c.name)} <img src="/assets/lol/champions/${escapeHtml(c.id)}.png" width="28" height="28" alt="" style="float:right;border-radius:6px"
            onerror="this.style.display='none'"/>`,
        })),
        correctId: correct.id,
        revealOk: `${correct.name}: ${correct.difficulty}/10`,
        revealBad: `Sværest: ${correct.name} (${correct.difficulty}/10)`,
      };
    },
  });
})();
