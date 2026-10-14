(() => {
  const status = document.getElementById("status");
  const app = document.getElementById("app");
  document.getElementById("title").textContent = "Status";
  document.getElementById("lede").textContent =
    "Health for .NET + databaser, Go health, og Opgaver-kaldestatistik.";

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
        ${card("Opgaver Stats", results.stats.path, results.stats.body)}
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
