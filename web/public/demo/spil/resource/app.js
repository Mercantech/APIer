(() => {
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
        partype: c.partype || "None",
      }));
      const types = [...new Set(pool.map((c) => c.partype))];
      return { pool, types, status: `${pool.length} champs · patch ${ver}` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      let opts = [c.partype, ...pickN(ctx.types.filter((t) => t !== c.partype), 3)];
      while (opts.length < 4) opts.push(`Extra${opts.length}`);
      opts = shuffle(opts.slice(0, 4));
      return {
        prompt: `Hvilken resource bruger <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: `<img class="champ" src="/assets/lol/champions/${escapeHtml(c.id)}.png" width="96" height="96" alt=""
          onerror="this.onerror=null;this.src='https://cdn.communitydragon.org/latest/champion/${escapeHtml(c.id)}/square'"/>`,
        options: opts.map((t) => ({ id: t, label: escapeHtml(t) })),
        correctId: c.partype,
        revealOk: c.partype,
        revealBad: `Resource: ${c.partype}`,
      };
    },
  });
})();
