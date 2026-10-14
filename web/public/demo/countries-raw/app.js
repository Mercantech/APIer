(() => {
  const status = document.getElementById("status");
  const app = document.getElementById("app");

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  (async () => {
    status.textContent = "Henter /Opgaver/CountriesRAW …";
    const res = await fetch("/Opgaver/CountriesRAW");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.countries || data.data || [data];
    const sample = list.slice(0, 24);
    status.textContent = `${list.length} poster i RAW-filen`;
    app.innerHTML = `
      <div class="call-box"><code>GET /Opgaver/CountriesRAW</code></div>
      <p class="demo-meta-line" style="margin:0.75rem 0">Sammenlign med Mongo-versionen under Countries-demo.</p>
      <div class="recipe-list">
        ${sample
          .map((c, i) => {
            const name = c.name?.common || c.name || c.Name || `#${i}`;
            const code = c.cca3 || c.cca2 || c.code || "";
            return `<article class="recipe-block"><strong>${escapeHtml(String(name))}</strong>
              <span class="demo-meta-line"> ${escapeHtml(String(code))}</span></article>`;
          })
          .join("")}
      </div>
      <details style="margin-top:1rem">
        <summary>Rå JSON (uddrag)</summary>
        <pre class="demo-json" style="max-height:40vh">${escapeHtml(JSON.stringify(sample, null, 2).slice(0, 5000))}</pre>
      </details>
      <p style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
        <a class="btn ghost sm" href="/demo/countries">Countries (Mongo) →</a>
        <a class="btn primary sm" href="/demo/spil/flag">Spil Kend flaget →</a>
      </p>`;
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
