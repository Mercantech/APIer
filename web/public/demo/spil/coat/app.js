(() => {
  document.getElementById("gameTitle").textContent = "Våbenskjold";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          coat: c.coatOfArms?.png || c.coatOfArms?.svg || "",
          cca3: c.cca3 || "",
        }))
        .filter((c) => c.name && c.coat);
      if (pool.length < 8) throw new Error("For få våbenskjolde i datasættet");
      return { pool, status: `${pool.length} lande med våbenskjold` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.pool);
      const options = shuffle([correct, ...pickN(ctx.pool, 3, [correct])]);
      return {
        prompt: "Hvilket land hører våbenskjoldet til?",
        mediaHtml: `<img class="flag" src="${escapeHtml(correct.coat)}" alt="Våbenskjold" width="160" height="160" style="object-fit:contain;background:rgba(255,255,255,.06);padding:0.75rem;border-radius:12px"/>`,
        options: options.map((c) => ({ id: c.cca3 || c.name, label: escapeHtml(c.name) })),
        correctId: correct.cca3 || correct.name,
        revealOk: correct.name,
        revealBad: `Det var ${correct.name}`,
      };
    },
  });
})();
