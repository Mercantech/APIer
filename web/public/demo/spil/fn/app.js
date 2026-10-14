(() => {
  document.getElementById("gameTitle").textContent = "FN-medlem?";
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          un: !!c.unMember,
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name);
      return { pool, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const correct = c.un ? "Ja" : "Nej";
      return {
        prompt: `Er <strong>${escapeHtml(c.name)}</strong> FN-medlem?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
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
