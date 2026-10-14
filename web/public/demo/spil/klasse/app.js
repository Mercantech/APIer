(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) =>
        r.json()
      );
      const ver = versions[0];
      const data = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`
      ).then((r) => r.json());
      const pool = Object.values(data.data || {}).map((c) => ({
        id: c.id,
        name: c.name,
        tags: c.tags || [],
      }));
      const classes = [...new Set(pool.flatMap((c) => c.tags))];
      return { pool, classes, status: `${pool.length} champs · ${classes.length} klasser` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool.filter((x) => x.tags.length));
      const correct = pick(c.tags);
      const wrong = pickN(
        ctx.classes.filter((t) => t !== correct),
        3
      );
      return {
        prompt: `Hvilken klasse er <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: `<img class="champ" src="/assets/lol/champions/${escapeHtml(c.id)}.png" alt="" width="96" height="96"
          onerror="this.onerror=null;this.src='https://cdn.communitydragon.org/latest/champion/${escapeHtml(c.id)}/square'" />`,
        options: shuffle([correct, ...wrong]).map((t) => ({ id: t, label: escapeHtml(t) })),
        correctId: correct,
        revealOk: `${c.name}: ${c.tags.join(", ")}`,
        revealBad: `Klasser: ${c.tags.join(", ")}`,
      };
    },
  });
})();
