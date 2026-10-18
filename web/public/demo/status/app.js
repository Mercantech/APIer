(() => {
  const status = document.getElementById("status");
  const app = document.getElementById("app");
  document.getElementById("title").textContent = "Status";
  document.getElementById("lede").textContent =
    "Health for .NET + databaser, Go health, og kaldestatistik på tværs af alle kategorier.";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function card(title, path, data) {
    const ok =
      !data?.isError &&
      !String(data?.status || "").toLowerCase().includes("error") &&
      data != null;
    return `<article class="recipe-block" style="border-color:${ok ? "rgba(61,214,198,0.45)" : "rgba(232,120,120,0.5)"}">
      <strong>${escapeHtml(title)}</strong>
      <div class="demo-meta-line"><code>GET ${escapeHtml(path)}</code></div>
      <pre class="demo-json" style="margin-top:0.5rem;max-height:220px">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </article>`;
  }

  function statsByCategory(body) {
    const cats = body?.categories || [];
    if (!cats.length) {
      return `<pre class="demo-json">${escapeHtml(JSON.stringify(body, null, 2))}</pre>`;
    }
    const rows = cats
      .map((c) => {
        const eps = (c.endpoints || [])
          .slice(0, 8)
          .map(
            (e) =>
              `<li><code>${escapeHtml(e.method)} ${escapeHtml(e.path)}</code> — <strong>${Number(e.calls).toLocaleString("da-DK")}</strong></li>`
          )
          .join("");
        const more =
          (c.endpoints || []).length > 8
            ? `<li class="demo-meta-line">… +${c.endpoints.length - 8} flere</li>`
            : "";
        return `<article class="recipe-block" style="border-color:rgba(61,214,198,0.35)">
          <strong>${escapeHtml(c.title || c.id)}</strong>
          <div class="demo-meta-line">${Number(c.endpointCount || 0)} endpoints · ${Number(c.totalCalls || 0).toLocaleString("da-DK")} kald</div>
          <ul style="margin:0.5rem 0 0;padding-left:1.1rem;font-size:0.88rem">${eps}${more}</ul>
        </article>`;
      })
      .join("");
    return `<p class="demo-meta-line" style="margin-bottom:0.75rem">Total <strong>${Number(body.totalCalls || 0).toLocaleString("da-DK")}</strong> kald · <code>${escapeHtml(body.source || "")}</code></p>
      <div class="recipe-list">${rows}</div>`;
  }

  async function load() {
    status.textContent = "Henter status…";
    const paths = [
      ["/api/Status/all", "dotnet-all"],
      ["/api/Status", "dotnet"],
      ["/go/health", "go"],
      ["/Opgaver/Stats", "stats"],
      ["/go/", "go-info"],
    ];
    const results = {};
    await Promise.all(
      paths.map(async ([path, key]) => {
        try {
          const res = await fetch(path);
          const text = await res.text();
          try {
            results[key] = { path, status: res.status, body: JSON.parse(text) };
          } catch {
            results[key] = { path, status: res.status, body: text };
          }
        } catch (e) {
          results[key] = { path, status: 0, body: { error: String(e.message || e) } };
        }
      })
    );

    status.textContent = `Opdateret ${new Date().toLocaleTimeString("da-DK")}`;
    app.innerHTML = `
      <div class="spil-actions" style="justify-content:flex-start;margin-bottom:1rem">
        <button type="button" class="btn primary sm" id="btnRefresh">Opdater</button>
      </div>
      <div class="recipe-list">
        ${card(".NET Status/all", results["dotnet-all"].path, results["dotnet-all"].body)}
        ${card("Go health", results.go.path, results.go.body)}
        <article class="recipe-block" style="border-color:rgba(61,214,198,0.45)">
          <strong>Kaldestatistik — alle kategorier</strong>
          <div class="demo-meta-line"><code>GET ${escapeHtml(results.stats.path)}</code></div>
          <div style="margin-top:0.65rem">${statsByCategory(results.stats.body)}</div>
        </article>
        ${card("Go info", results["go-info"].path, results["go-info"].body)}
      </div>`;
    document.getElementById("btnRefresh").addEventListener("click", () => load().catch(showErr));
  }

  function showErr(e) {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  }

  load().catch(showErr);
})();
