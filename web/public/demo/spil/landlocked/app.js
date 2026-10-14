(() => {
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const all = await fetch("/api/Countries").then((r) => r.json());
      const pool = all
        .map((c) => ({
          name: c?.name?.common || "",
          landlocked: !!c.landlocked,
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name);
      return { pool, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const correct = c.landlocked ? "Ja" : "Nej";
      return {
        prompt: `Er <strong>${escapeHtml(c.name)}</strong> landlocked (uden kyst)?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="200" height="120" alt=""/>`
          : "",
        options: shuffle([
          { id: "Ja", label: "Ja" },
          { id: "Nej", label: "Nej" },
        ]),
        correctId: correct,
        revealOk: correct,
        revealBad: `Svar: ${correct}`,
      };
    },
  });
})();
