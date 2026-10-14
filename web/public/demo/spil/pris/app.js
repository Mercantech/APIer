(() => {
  const { escapeHtml, shuffle, pick, runChoiceQuiz } = window.SpilCommon;
  const statusEl = document.getElementById("status");
  const stageEl = document.getElementById("stage");
  const scoreEl = document.getElementById("score");

  function nearOptions(price) {
    const p = Number(price);
    const deltas = shuffle([0.35, 0.7, 1.15, 1.6, -0.4, -0.85, -1.3]).slice(0, 3);
    const opts = [{ id: "c", label: `${p.toFixed(2)} kr`, price: p }];
    deltas.forEach((d, i) => {
      const v = Math.max(1, +(p + d).toFixed(2));
      opts.push({ id: `w${i}`, label: `${v.toFixed(2)} kr`, price: v });
    });
    return shuffle(opts);
  }

  runChoiceQuiz({
    statusEl,
    stageEl,
    scoreEl,
    boot: async () => {
      const [dRes, mRes] = await Promise.all([
        fetch("/Opgaver/Diesel"),
        fetch("/Opgaver/Miles95"),
      ]);
      if (!dRes.ok || !mRes.ok) throw new Error("Kunne ikke hente brændstofpriser");
      const diesel = await dRes.json();
      const miles = await mRes.json();
      const pool = [
        ...diesel.map((x) => ({ ...x, kind: "Diesel" })),
        ...miles.map((x) => ({ ...x, kind: "Miles95" })),
      ].filter((x) => x.Price && x.Date);
      return { pool, status: `${pool.length} pris-punkter klar` };
    },
    getRound: (ctx) => {
      const row = pick(ctx.pool);
      const options = nearOptions(row.Price);
      return {
        prompt: `Hvad kostede <strong>${escapeHtml(row.kind)}</strong> den <strong>${escapeHtml(row.Date)}</strong>?`,
        options: options.map((o) => ({ id: o.id, label: o.label })),
        correctId: "c",
        revealOk: `Ja — ${Number(row.Price).toFixed(2)} kr`,
        revealBad: `Det var ${Number(row.Price).toFixed(2)} kr`,
      };
    },
  });
})();
