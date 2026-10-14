(() => {
  const { escapeHtml, shuffle, pick, pickN, titleCase, runChoiceQuiz } = window.SpilCommon;

  function parseCars(payload) {
    const text = JSON.stringify(payload);
    const re = /https:\/\/www\.bilbasen\.dk\/brugt\/bil\/([a-z0-9-]+)\/([a-z0-9-]+)\/[^"\\]*/gi;
    const out = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(text))) {
      const brand = m[1];
      const model = m[2];
      const key = `${brand}/${model}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        brand,
        model,
        brandLabel: titleCase(brand.replace(/-/g, " ")),
        modelLabel: titleCase(model.replace(/-/g, " ")),
        url: m[0],
      });
    }
    return out;
  }

  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const res = await fetch("/Opgaver/Bilbasen");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cars = parseCars(await res.json());
      if (cars.length < 4) throw new Error("For få bil-URL’er i Bilbasen-data");
      const brands = [...new Set(cars.map((c) => c.brand))];
      return { cars, brands, status: `${cars.length} annoncer · ${brands.length} mærker` };
    },
    getRound: (ctx) => {
      const correct = pick(ctx.cars);
      const wrongBrands = pickN(
        ctx.brands.filter((b) => b !== correct.brand),
        3
      );
      const options = shuffle([correct.brand, ...wrongBrands]).map((b) => ({
        id: b,
        label: escapeHtml(titleCase(b.replace(/-/g, " "))),
      }));
      return {
        prompt: `Hvilket mærke er denne Bilbasen-annonce?<br /><code style="font-size:0.78rem;word-break:break-all">${escapeHtml(correct.url)}</code>`,
        options,
        correctId: correct.brand,
        revealOk: `${correct.brandLabel} ${correct.modelLabel}`,
        revealBad: `Det var ${correct.brandLabel} (${correct.modelLabel})`,
      };
    },
  });
})();
