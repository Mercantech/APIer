(() => {
  document.getElementById("gameTitle").textContent = "Champ-titel";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
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
        title: c.title,
      }));
      return { pool, status: `${pool.length} titles` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const options = shuffle([correct, ...pickN(ctx.pool, 3, [correct])]);
      return {
        prompt: `Hvem er “<strong>${escapeHtml(correct.title)}</strong>”?`,
        options: options.map((c) => ({ id: c.id, label: escapeHtml(c.name) })),
        correctId: correct.id,
        revealOk: `${correct.name} — ${correct.title}`,
        revealBad: `${correct.name} — ${correct.title}`,
      };
    },
  });
})();
