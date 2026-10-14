(() => {
  document.getElementById("gameTitle").textContent = "Køreside";
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          side: c.car?.side || "",
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && (c.side === "left" || c.side === "right"));
      return { pool, status: `${pool.length} lande med køreside` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      const correct = c.side === "left" ? "Venstre" : "Højre";
      return {
        prompt: `Hvilken side af vejen kører man i <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="200" height="120" alt=""/>`
          : "",
        options: shuffle([
          { id: "Venstre", label: "Venstre" },
          { id: "Højre", label: "Højre" },
        ]),
        correctId: correct,
        revealOk: correct,
        revealBad: `Svar: ${correct}`,
      };
    },
  });
})();
