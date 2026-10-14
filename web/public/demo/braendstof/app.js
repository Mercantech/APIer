(() => {
  const status = document.getElementById("status");
  const app = document.getElementById("app");
  document.getElementById("title").textContent = "Brændstof";
  document.getElementById("lede").textContent =
    "Historiske diesel- og Miles95-priser fra /Opgaver/Diesel og /Opgaver/Miles95.";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function spark(rows, color) {
    const prices = rows.map((r) => Number(r.Price)).filter((n) => !Number.isNaN(n));
    if (!prices.length) return "";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const w = 640;
    const h = 120;
    const step = w / Math.max(prices.length - 1, 1);
    const pts = prices
      .map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / (max - min || 1)) * (h - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="120" role="img" aria-label="Prisgraf">
      <polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}" />
    </svg>
    <p class="demo-meta-line">${min.toFixed(2)} – ${max.toFixed(2)} kr · ${rows.length} punkter · ${escapeHtml(rows[0]?.Date)} → ${escapeHtml(rows[rows.length - 1]?.Date)}</p>`;
  }

  function table(rows) {
    const sample = rows.filter((_, i) => i % Math.ceil(rows.length / 12) === 0).slice(0, 12);
    return `<div class="recipe-list">${sample
      .map(
        (r) =>
          `<article class="recipe-block"><strong>${escapeHtml(r.Date)}</strong> · ${escapeHtml(r.Price)} kr</article>`
      )
      .join("")}</div>`;
  }

  (async () => {
    status.textContent = "Henter Diesel + Miles95…";
    const [dRes, mRes] = await Promise.all([
      fetch("/Opgaver/Diesel"),
      fetch("/Opgaver/Miles95"),
    ]);
    if (!dRes.ok || !mRes.ok) throw new Error("Kunne ikke hente priser");
    const diesel = await dRes.json();
    const miles = await mRes.json();
    status.textContent = `Diesel ${diesel.length} · Miles95 ${miles.length}`;
    app.innerHTML = `
      <section class="detail-panel" style="margin-bottom:1rem">
        <h2 style="margin:0 0 0.5rem;font-size:1.25rem">Diesel</h2>
        <div class="call-box"><code>GET /Opgaver/Diesel</code></div>
        ${spark(diesel, "#3dd6c6")}
        ${table(diesel)}
      </section>
      <section class="detail-panel">
        <h2 style="margin:0 0 0.5rem;font-size:1.25rem">Miles95</h2>
        <div class="call-box"><code>GET /Opgaver/Miles95</code></div>
        ${spark(miles, "#f0b429")}
        ${table(miles)}
      </section>
      <p style="margin-top:1rem"><a class="btn primary sm" href="/demo/spil/pris">Spil Pris-gæt →</a></p>`;
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
