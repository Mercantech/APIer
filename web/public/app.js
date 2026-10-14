(() => {
  const catalog = window.APIER_CATALOG;
  if (!catalog) return;

  const backendsEl = document.getElementById("backends");
  const filtersEl = document.getElementById("filters");
  const listEl = document.getElementById("endpoints");

  const backendById = Object.fromEntries(catalog.backends.map((b) => [b.id, b]));

  const sourceLabel = {
    json: "JSON-fil",
    mongodb: "MongoDB",
    postgres: "Postgres",
    memory: "Memory",
    runtime: "Runtime",
    docs: "Docs",
  };

  let activeFilter = "all";

  function renderBackends() {
    backendsEl.innerHTML = catalog.backends
      .map(
        (b, i) => `
      <article class="backend-card" style="animation-delay:${i * 60}ms">
        <h3>${escapeHtml(b.name)}</h3>
        <div class="backend-meta">
          <span class="chip lang">${escapeHtml(b.language)}</span>
          <span class="chip service">${escapeHtml(b.service)}</span>
        </div>
        <p>${escapeHtml(b.description)}</p>
      </article>`
      )
      .join("");
  }

  function renderFilters() {
    const sources = [...new Set(catalog.endpoints.map((e) => e.source.type))];
    const buttons = [
      { id: "all", label: "Alle" },
      ...catalog.backends.map((b) => ({ id: `backend:${b.id}`, label: b.language })),
      ...sources.map((s) => ({ id: `source:${s}`, label: sourceLabel[s] || s })),
    ];

    filtersEl.innerHTML = buttons
      .map(
        (b) =>
          `<button type="button" class="filter-btn${b.id === activeFilter ? " active" : ""}" data-filter="${b.id}">${escapeHtml(b.label)}</button>`
      )
      .join("");

    filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderEndpoints();
      });
    });
  }

  function matchesFilter(ep) {
    if (activeFilter === "all") return true;
    if (activeFilter.startsWith("backend:")) {
      return ep.backend === activeFilter.slice("backend:".length);
    }
    if (activeFilter.startsWith("source:")) {
      return ep.source.type === activeFilter.slice("source:".length);
    }
    return true;
  }

  function renderEndpoints() {
    const items = catalog.endpoints.filter(matchesFilter);
    listEl.innerHTML = items
      .map((ep, i) => {
        const backend = backendById[ep.backend];
        const href = `${catalog.host}${ep.path.replace(/\{[^}]+\}/g, "Europe")}`;
        const openable = !ep.path.includes("{") || ep.path.includes("{region}");
        const title = openable
          ? `<a class="path" href="${href}" target="_blank" rel="noreferrer">${escapeHtml(ep.path)}</a>`
          : `<span class="path">${escapeHtml(ep.path)}</span>`;

        return `
        <article class="endpoint" style="animation-delay:${Math.min(i, 12) * 40}ms">
          <div class="endpoint-top">
            <span class="method">${escapeHtml(ep.method)}</span>
            ${title}
          </div>
          <h3>${escapeHtml(ep.title)}</h3>
          <p class="summary">${escapeHtml(ep.summary)}</p>
          <div class="tags">
            <span class="tag source-${escapeHtml(ep.source.type)}">${escapeHtml(sourceLabel[ep.source.type] || ep.source.type)}</span>
            <span class="tag backend-${escapeHtml(ep.backend)}">${escapeHtml(backend?.language || ep.backend)} · ${escapeHtml(backend?.service || "")}</span>
            ${ep.auth ? `<span class="tag auth">${escapeHtml(ep.auth)}</span>` : ""}
          </div>
          <p class="source-detail">${escapeHtml(ep.source.detail)}</p>
        </article>`;
      })
      .join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  renderBackends();
  renderFilters();
  renderEndpoints();
})();
