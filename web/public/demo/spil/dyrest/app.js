(() => {
  document.getElementById("gameTitle").textContent = "Diesel eller Miles95?";
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const [d, m] = await Promise.all([
        fetch("/Opgaver/Diesel").then((r) => r.json()),
        fetch("/Opgaver/Miles95").then((r) => r.json()),
      ]);
      const byDate = new Map();
      d.forEach((x) => {
        if (x.Date) byDate.set(x.Date, { ...(byDate.get(x.Date) || {}), diesel: Number(x.Price), date: x.Date });
      });
      m.forEach((x) => {
        if (x.Date && byDate.has(x.Date)) {
          const row = byDate.get(x.Date);
          row.miles = Number(x.Price);
        }
      });
      const pool = [...byDate.values()].filter(
        (r) => r.diesel && r.miles && r.diesel !== r.miles
      );
      return { pool, status: `${pool.length} datoer med begge priser` };
    },
    getRound: (ctx) => {
      const row = pick(ctx.pool);
      const correct = row.diesel > row.miles ? "Diesel" : "Miles95";
      return {
        prompt: `Hvad var dyrest den <strong>${escapeHtml(row.date)}</strong>?`,
        options: shuffle([
          { id: "Diesel", label: "Diesel" },
          { id: "Miles95", label: "Miles95" },
        ]),
        correctId: correct,
        revealOk: `Diesel ${row.diesel.toFixed(2)} · Miles95 ${row.miles.toFixed(2)}`,
        revealBad: `Diesel ${row.diesel.toFixed(2)} · Miles95 ${row.miles.toFixed(2)}`,
      };
    },
  });
})();
