(() => {
  const catalog = window.APIER_CATALOG;
  const auth = window.ApierAuth;
  if (!catalog || !auth) return;

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
  let endpointsBound = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function resolvePath(path) {
    return path.replace(/\{region\}/g, "Europe").replace(/\{[^}]+\}/g, "demo");
  }

  /* ——— Auth bar ——— */
  function renderAuthBar() {
    const loggedIn = auth.isLoggedIn();
    const profile = auth.getProfile();
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");
    const btnKeys = document.getElementById("btnKeys");
    const chip = document.getElementById("userChip");

    btnLogin.hidden = loggedIn;
    btnLogout.hidden = !loggedIn;
    btnKeys.hidden = !loggedIn;
    chip.hidden = !loggedIn;
    if (loggedIn && profile) {
      chip.textContent = profile.name || profile.email || "Bruger";
    }
  }

  document.getElementById("btnLogin").addEventListener("click", () => auth.beginLogin());
  document.getElementById("btnLogout").addEventListener("click", () => {
    auth.logoutLocal();
    renderAuthBar();
  });

  /* ——— Keys drawer ——— */
  const keysDrawer = document.getElementById("keysDrawer");
  const keysBackdrop = document.getElementById("keysBackdrop");

  function openKeys() {
    keysDrawer.classList.add("open");
    keysDrawer.setAttribute("aria-hidden", "false");
    keysBackdrop.hidden = false;
    loadKeys();
  }

  function closeKeys() {
    keysDrawer.classList.remove("open");
    keysDrawer.setAttribute("aria-hidden", "true");
    keysBackdrop.hidden = true;
  }

  document.getElementById("btnKeys").addEventListener("click", openKeys);
  document.getElementById("keysClose").addEventListener("click", closeKeys);
  keysBackdrop.addEventListener("click", closeKeys);

  async function loadKeys() {
    const list = document.getElementById("keyList");
    list.innerHTML = "<li>Henter…</li>";
    try {
      const res = await auth.apiFetch("/api/ApiKeys");
      if (!res.ok) throw new Error(await res.text());
      const keys = await res.json();
      if (!keys.length) {
        list.innerHTML = "<li class='muted'>Ingen aktive nøgler endnu.</li>";
        return;
      }
      list.innerHTML = keys
        .map(
          (k) => `
        <li>
          <div>
            <strong>${escapeHtml(k.name)}</strong>
            <code>${escapeHtml(k.keyPrefix)}…</code>
            <span class="muted">${new Date(k.createdAt).toLocaleString("da-DK")}</span>
          </div>
          <button type="button" class="btn ghost sm" data-revoke="${escapeHtml(k.id)}">Tilbagekald</button>
        </li>`
        )
        .join("");
      list.querySelectorAll("[data-revoke]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await auth.apiFetch(`/api/ApiKeys/${btn.dataset.revoke}`, { method: "DELETE" });
          loadKeys();
        });
      });
    } catch (e) {
      list.innerHTML = `<li class="error">${escapeHtml(e.message)}</li>`;
    }
  }

  document.getElementById("btnCreateKey").addEventListener("click", async () => {
    const name = document.getElementById("keyName").value.trim();
    try {
      const res = await auth.apiFetch("/api/ApiKeys", {
        method: "POST",
        body: JSON.stringify({ name: name || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const once = document.getElementById("keyOnce");
      const onceVal = document.getElementById("keyOnceValue");
      once.hidden = false;
      onceVal.textContent = data.key;
      auth.setStoredApiKey(data.key);
      loadKeys();
    } catch (e) {
      alert(e.message || "Kunne ikke oprette nøgle");
    }
  });

  document.getElementById("btnCopyKey").addEventListener("click", async () => {
    const val = document.getElementById("keyOnceValue").textContent;
    try {
      await navigator.clipboard.writeText(val);
      auth.setStoredApiKey(val);
      alert("Kopieret. Nøglen bruges automatisk i live-kald i denne session.");
    } catch {
      auth.setStoredApiKey(val);
      alert("Nøglen er gemt til live-kald i denne session.");
    }
  });

  /* ——— Demo drawer ——— */
  const demoDrawer = document.getElementById("demoDrawer");
  const demoBackdrop = document.getElementById("demoBackdrop");
  const demoTitle = document.getElementById("demoTitle");
  const demoBody = document.getElementById("demoBody");

  function openDemo(ep) {
    const backend = backendById[ep.backend];
    const path = resolvePath(ep.path);
    demoTitle.textContent = ep.title;
    demoBody.innerHTML = `
      <div class="demo-meta">
        <span class="method">${escapeHtml(ep.method)}</span>
        <code class="path">${escapeHtml(path)}</code>
      </div>
      <p>${escapeHtml(ep.summary)}</p>
      <div class="tags">
        <span class="tag source-${escapeHtml(ep.source.type)}">${escapeHtml(sourceLabel[ep.source.type] || ep.source.type)}</span>
        <span class="tag backend-${escapeHtml(ep.backend)}">${escapeHtml(backend?.language || "")} · ${escapeHtml(backend?.service || "")}</span>
        ${ep.auth === "apiKey" ? `<span class="tag auth">X-Api-Key</span>` : ep.auth ? `<span class="tag auth">${escapeHtml(ep.auth)}</span>` : ""}
      </div>
      <p class="source-detail">${escapeHtml(ep.source.detail)}</p>
      ${
        ep.auth === "apiKey"
          ? `<p class="drawer-note">Kræver din API-nøgle. ${
              auth.getStoredApiKey()
                ? "Nøgle er klar i denne session."
                : auth.isLoggedIn()
                  ? `<button type="button" class="btn ghost sm" id="demoOpenKeys">Opret / vælg nøgle</button>`
                  : `<button type="button" class="btn primary sm" id="demoLogin">Log ind</button>`
            }</p>`
          : ""
      }
      <div class="demo-actions">
        <button type="button" class="btn primary" id="demoFetch" ${ep.method !== "GET" || path.includes("{") ? "disabled" : ""}>Kald live</button>
        <a class="btn ghost" href="${escapeHtml(path)}" target="_blank" rel="noreferrer">Åbn i ny fane</a>
      </div>
      <p class="muted" id="demoStatus"></p>
      <pre class="demo-json" id="demoJson">Klik «Kald live» for at hente data.</pre>
    `;

    demoDrawer.classList.add("open");
    demoDrawer.setAttribute("aria-hidden", "false");
    demoBackdrop.hidden = false;

    document.getElementById("demoLogin")?.addEventListener("click", () => auth.beginLogin());
    document.getElementById("demoOpenKeys")?.addEventListener("click", openKeys);
    document.getElementById("demoFetch")?.addEventListener("click", () => runLiveCall(ep, path));
  }

  function closeDemo() {
    demoDrawer.classList.remove("open");
    demoDrawer.setAttribute("aria-hidden", "true");
    demoBackdrop.hidden = true;
  }

  document.getElementById("demoClose").addEventListener("click", closeDemo);
  demoBackdrop.addEventListener("click", closeDemo);

  function trimDemo(data) {
    if (Array.isArray(data)) {
      const slice = data.slice(0, 3);
      return {
        _demo: `Viser ${slice.length} af ${data.length} elementer`,
        items: slice,
      };
    }
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 12) {
        const slim = {};
        keys.slice(0, 12).forEach((k) => (slim[k] = data[k]));
        slim._truncated = true;
        return slim;
      }
    }
    return data;
  }

  async function runLiveCall(ep, path) {
    const status = document.getElementById("demoStatus");
    const pre = document.getElementById("demoJson");
    status.textContent = "Henter…";
    pre.textContent = "";

    const headers = {};
    if (ep.auth === "apiKey") {
      const key = auth.getStoredApiKey();
      if (!key) {
        status.textContent = "Mangler API-nøgle — log ind og opret en under API-nøgler.";
        pre.textContent = "";
        return;
      }
      headers["X-Api-Key"] = key;
    }

    try {
      const res = await fetch(path, { headers });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      if (res.status === 401) {
        status.textContent = `401 — ${typeof parsed === "string" ? parsed : "Uautoriseret"}`;
        pre.textContent = typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
        return;
      }

      status.textContent = `${res.status} · ${res.headers.get("content-type") || "svar"}`;
      const demo = typeof parsed === "string" ? parsed.slice(0, 2000) : trimDemo(parsed);
      pre.textContent =
        typeof demo === "string" ? demo : JSON.stringify(demo, null, 2);
    } catch (e) {
      status.textContent = "Netværksfejl";
      pre.textContent = e.message || String(e);
    }
  }

  /* ——— Catalog ——— */
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
    endpointsBound = catalog.endpoints.filter(matchesFilter);
    listEl.innerHTML = endpointsBound
      .map((ep, i) => {
        const backend = backendById[ep.backend];
        return `
        <article class="endpoint" tabindex="0" role="button" data-idx="${i}" style="animation-delay:${Math.min(i, 12) * 40}ms">
          <div class="endpoint-top">
            <span class="method">${escapeHtml(ep.method)}</span>
            <span class="path">${escapeHtml(ep.path)}</span>
          </div>
          <h3>${escapeHtml(ep.title)}</h3>
          <p class="summary">${escapeHtml(ep.summary)}</p>
          <div class="tags">
            <span class="tag source-${escapeHtml(ep.source.type)}">${escapeHtml(sourceLabel[ep.source.type] || ep.source.type)}</span>
            <span class="tag backend-${escapeHtml(ep.backend)}">${escapeHtml(backend?.language || ep.backend)} · ${escapeHtml(backend?.service || "")}</span>
            ${ep.auth === "apiKey" ? `<span class="tag auth">API-nøgle</span>` : ep.auth ? `<span class="tag auth">${escapeHtml(ep.auth)}</span>` : ""}
          </div>
          <p class="source-detail">${escapeHtml(ep.source.detail)}</p>
        </article>`;
      })
      .join("");

    listEl.querySelectorAll(".endpoint").forEach((el) => {
      const open = () => openDemo(endpointsBound[Number(el.dataset.idx)]);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open();
        }
      });
    });
  }

  renderAuthBar();
  renderBackends();
  renderFilters();
  renderEndpoints();
})();
