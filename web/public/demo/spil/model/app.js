(() => {
  document.getElementById("gameTitle").textContent = "Bilmodel";
  const { escapeHtml, shuffle, pick, pickN, titleCase, runChoiceQuiz } = window.SpilCommon;

  function parseCars(payload) {
    const text = JSON.stringify(payload);
    const re = /https:\/\/www\.bilbasen\.dk\/brugt\/bil\/([a-z0-9-]+)\/([a-z0-9-]+)\/[^"\\]*/gi;
    const out = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(text))) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ brand: m[1], model: m[2], url: m[0] });
    }
    return out;
  }

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const cars = parseCars(await fetch("/Opgaver/Bilbasen").then((r) => r.json()));
      if (cars.length < 4) throw new Error("For få bilmodeller");
      const models = [...new Set(cars.map((c) => c.model))];
      return { cars, models, status: `${cars.length} annoncer` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.cars);
      const wrong = pickN(
        ctx.models.filter((m) => m !== correct.model),
        3
      );
      return {
        prompt: `Hvilken <strong>model</strong> er det? (${escapeHtml(titleCase(correct.brand.replace(/-/g, " ")))})`,
        mediaHtml: `<code style="font-size:0.78rem;word-break:break-all">${escapeHtml(correct.url)}</code>`,
        options: shuffle([correct.model, ...wrong]).map((m) => ({
          id: m,
          label: escapeHtml(titleCase(m.replace(/-/g, " "))),
        })),
        correctId: correct.model,
        revealOk: titleCase(correct.model.replace(/-/g, " ")),
        revealBad: titleCase(correct.model.replace(/-/g, " ")),
      };
    },
  });
})();
