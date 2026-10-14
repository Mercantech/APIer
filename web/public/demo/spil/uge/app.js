(() => {
  document.getElementById("gameTitle").textContent = "Ugens start";
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  const labels = {
    monday: "Mandag",
    sunday: "Søndag",
    saturday: "Lørdag",
  };
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const pool = (await fetch("/api/Countries").then((r) => r.json()))
        .map((c) => ({
          name: c?.name?.common || "",
          start: (c.startOfWeek || "").toLowerCase(),
          flag: c?.flags?.png || "",
        }))
        .filter((c) => c.name && labels[c.start]);
      const starts = [...new Set(pool.map((c) => c.start))];
      return { pool, starts, status: `${pool.length} lande` };
    },
    getRound: (ctx) => {
      const c = pick(ctx.pool);
      let opts = [c.start, ...pickN(ctx.starts.filter((s) => s !== c.start), 2)];
      // pad with known days if few variants
      ["monday", "sunday", "saturday"].forEach((d) => {
        if (opts.length < 3 && !opts.includes(d)) opts.push(d);
      });
      opts = shuffle(opts.slice(0, 3));
      return {
        prompt: `Hvilken dag starter ugen i <strong>${escapeHtml(c.name)}</strong>?`,
        mediaHtml: c.flag
          ? `<img class="flag" src="${escapeHtml(c.flag)}" width="180" height="110" alt=""/>`
          : "",
        options: opts.map((s) => ({ id: s, label: labels[s] || s })),
        correctId: c.start,
        revealOk: labels[c.start],
        revealBad: `Ugen starter ${labels[c.start]}`,
      };
    },
  });
})();
