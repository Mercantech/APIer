(() => {
  document.getElementById("gameTitle").textContent = "Attack vs Defense";
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
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
        defense: c.info?.defense ?? 0,
      }));
      return { pool, status: `${pool.length} champs` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool.filter((x) => x.attack !== x.defense));
      const correct = c.attack > c.defense ? "Attack" : "Defense";
      return {
        prompt: `Har <strong>${escapeHtml(c.name)}</strong> højest attack eller defense?`,
        mediaHtml: `<img class="champ" src="/assets/lol/champions/${escapeHtml(c.id)}.png" width="96" height="96" alt=""
          onerror="this.onerror=null;this.src='https://cdn.communitydragon.org/latest/champion/${escapeHtml(c.id)}/square'"/>`,
        options: shuffle([
          { id: "Attack", label: "Attack" },
          { id: "Defense", label: "Defense" },
        ]),
        correctId: correct,
        revealOk: `ATK ${c.attack} / DEF ${c.defense}`,
        revealBad: `ATK ${c.attack} / DEF ${c.defense}`,
      };
    },
  });
})();
