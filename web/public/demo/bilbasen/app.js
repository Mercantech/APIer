(() => {
  const status = document.getElementById("status");
  const app = document.getElementById("app");
  document.getElementById("title").textContent = "Bilbasen";
  document.getElementById("lede").textContent =
    "Scrapet Bilbasen-JSON — parse annonce-URL’er til mærke/model. God øvelse i nested JSON.";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function titleCase(name) {
    return String(name || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

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

  (async () => {
    status.textContent = "Henter /Opgaver/Bilbasen …";
    const res = await fetch("/Opgaver/Bilbasen");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const cars = parseCars(raw);
    status.textContent = `${Array.isArray(raw) ? raw.length : 1} rå objekter · ${cars.length} bil-URL’er fundet`;
    app.innerHTML = `
      <div class="call-box"><code>GET /Opgaver/Bilbasen</code></div>
      <p class="demo-meta-line" style="margin:0.75rem 0">Parsning: /brugt/bil/{brand}/{model}/…</p>
      <div class="recipe-list">
        ${cars
          .map(
            (c) => `<article class="recipe-block">
              <strong>${escapeHtml(titleCase(c.brand))}</strong> · ${escapeHtml(titleCase(c.model))}
              <div><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.url)}</a></div>
            </article>`
          )
          .join("")}
      </div>
      <details style="margin-top:1.25rem">
        <summary>Rå JSON (uddrag)</summary>
        <pre class="demo-json" style="max-height:40vh">${escapeHtml(JSON.stringify(raw, null, 2).slice(0, 4000))}…</pre>
      </details>
      <p style="margin-top:1rem"><a class="btn primary sm" href="/demo/spil/bil">Spil Bilmærke →</a></p>`;
  })().catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
