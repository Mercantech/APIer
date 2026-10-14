(() => {
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const ver = (await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then((r) =>
        r.json()
      ))[0];
      // Full champion details needed for attackrange — fetch a few via individual endpoints is slow;
      // use champion.json tags + known: attackrange is in per-champ file. Use CDN champion-full alternative:
      const full = await fetch(
        `https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/championFull.json`
      ).then((r) => r.json());
      const pool = Object.values(full.data || {}).map((c) => ({
        id: c.id,
        name: c.name,
        ranged: (c.stats?.attackrange || 0) > 200,
        range: c.stats?.attackrange || 0,
      }));
      return { pool, status: `${pool.length} champions med attack range` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const correct = c.ranged ? "Ranged" : "Melee";
      return {
        prompt: `Er <strong>${escapeHtml(c.name)}</strong> melee eller ranged?`,
        mediaHtml: `<img class="champ" src="/assets/lol/champions/${escapeHtml(c.id)}.png" width="96" height="96" alt=""
          onerror="this.onerror=null;this.src='https://cdn.communitydragon.org/latest/champion/${escapeHtml(c.id)}/square'"/>`,
        options: shuffle([
          { id: "Melee", label: "Melee" },
          { id: "Ranged", label: "Ranged" },
        ]),
        correctId: correct,
        revealOk: `${correct} (range ${c.range})`,
        revealBad: `${correct} (range ${c.range})`,
      };
    },
  });
})();
