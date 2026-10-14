(() => {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const summaryLine = document.getElementById("summaryLine");
  const tabs = document.getElementById("tabs");

  let tab = "characters";
  let items = [];

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadSummary() {
    const res = await fetch("/api/RickAndMorty");
    if (!res.ok) return;
    const s = await res.json();
    summaryLine.textContent = `${s.characters} characters · ${s.locations} locations · ${s.episodes} episodes · Postgres`;
  }

  async function loadFilterOptions() {
    filter.innerHTML = `<option value="">Alle</option>`;
    if (tab === "characters") {
      const res = await fetch("/api/RickAndMorty/characters/species");
      if (!res.ok) return;
      const species = await res.json();
      filter.innerHTML =
        `<option value="">Alle species</option>` +
        species.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    } else if (tab === "locations") {
      const res = await fetch("/api/RickAndMorty/locations/dimensions");
      if (!res.ok) return;
      const dims = await res.json();
      filter.innerHTML =
        `<option value="">Alle dimensioner</option>` +
        dims
          .slice(0, 40)
          .map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`)
          .join("");
    } else {
      filter.innerHTML = `
        <option value="">Alle sæsoner</option>
        <option value="1">Sæson 1</option>
        <option value="2">Sæson 2</option>
        <option value="3">Sæson 3</option>
        <option value="4">Sæson 4</option>
        <option value="5">Sæson 5</option>`;
    }
  }

  function listUrl() {
    const q = search.value.trim();
    const f = filter.value;
    if (tab === "characters") {
      const params = new URLSearchParams({ limit: "200" });
      if (q) params.set("q", q);
      if (f) params.set("species", f);
      return `/api/RickAndMorty/characters?${params}`;
    }
    if (tab === "locations") {
      const params = new URLSearchParams({ limit: "200" });
      if (q) params.set("q", q);
      if (f) params.set("dimension", f);
      return `/api/RickAndMorty/locations?${params}`;
    }
    if (f) return `/api/RickAndMorty/episodes/season/${encodeURIComponent(f)}`;
    const params = new URLSearchParams({ limit: "100" });
    if (q) params.set("q", q);
    return `/api/RickAndMorty/episodes?${params}`;
  }

  async function loadList() {
    const url = listUrl();
    status.textContent = `Henter ${url} …`;
    status.classList.remove("error");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
    status.textContent = `${items.length} ${tab} · klik for detaljer`;
    renderGrid();
  }

  function renderGrid() {
    if (tab === "characters") {
      grid.innerHTML = items
        .map(
          (c, i) => `
        <article class="poke-card" tabindex="0" role="button" data-id="${c.apiId}" style="animation-delay:${Math.min(i, 20) * 25}ms">
          <img src="${escapeHtml(c.image)}" alt="" loading="lazy" width="96" height="96" />
          <h3>${escapeHtml(c.name)}</h3>
          <p class="id">#${c.apiId} · ${escapeHtml(c.status)}</p>
          <div class="poke-types"><span>${escapeHtml(c.species)}</span></div>
        </article>`
        )
        .join("");
    } else if (tab === "locations") {
      grid.innerHTML = items
        .map(
          (l, i) => `
        <article class="poke-card" tabindex="0" role="button" data-id="${l.apiId}" style="animation-delay:${Math.min(i, 20) * 25}ms">
          <h3>${escapeHtml(l.name)}</h3>
          <p class="id">#${l.apiId}</p>
          <div class="poke-types"><span>${escapeHtml(l.type || "—")}</span></div>
          <p class="demo-meta-line" style="margin-top:0.4rem">${escapeHtml(l.dimension)}</p>
        </article>`
        )
        .join("");
    } else {
      grid.innerHTML = items
        .map(
          (e, i) => `
        <article class="poke-card" tabindex="0" role="button" data-id="${e.apiId}" style="animation-delay:${Math.min(i, 20) * 25}ms">
          <h3>${escapeHtml(e.name)}</h3>
          <p class="id">#${e.apiId} · ${escapeHtml(e.episode)}</p>
          <p class="demo-meta-line" style="margin-top:0.4rem">${escapeHtml(e.air_date)}</p>
        </article>`
        )
        .join("");
    }

    grid.querySelectorAll(".poke-card").forEach((el) => {
      const open = () => showDetail(Number(el.dataset.id));
      el.addEventListener("click", open);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open();
        }
      });
    });
  }

  async function showDetail(apiId) {
    detail.classList.remove("hidden");
    detail.innerHTML = `<p class="demo-status">Henter #${apiId} …</p>`;
    const res = await fetch(`/api/RickAndMorty/${tab}/${apiId}`);
    if (!res.ok) {
      detail.innerHTML = `<p class="demo-status error">Ikke fundet</p>`;
      return;
    }
    const item = await res.json();

    if (tab === "characters") {
      detail.innerHTML = `
        <div class="detail-head">
          <img class="poke" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" width="160" height="160" style="border-radius:12px;image-rendering:auto" />
          <div>
            <h2>${escapeHtml(item.name)} <span class="demo-meta-line">#${item.apiId}</span></h2>
            <div class="poke-types">
              <span>${escapeHtml(item.status)}</span>
              <span>${escapeHtml(item.species)}</span>
              <span>${escapeHtml(item.gender)}</span>
            </div>
            <p class="demo-meta-line" style="margin-top:0.65rem">
              Origin: ${escapeHtml(item.origin?.name || "—")}<br />
              Location: ${escapeHtml(item.location?.name || "—")}
            </p>
            <p class="demo-meta-line">${(item.episode || []).length} episodes</p>
          </div>
        </div>
        <div class="call-box">
          <div>API-kald</div>
          <code>GET /api/RickAndMorty/characters/${item.apiId}</code><br />
          <code>GET /api/RickAndMorty/characters?species=${encodeURIComponent(item.species)}&amp;status=${encodeURIComponent(item.status)}</code>
        </div>`;
    } else if (tab === "locations") {
      detail.innerHTML = `
        <div class="detail-head">
          <div>
            <h2>${escapeHtml(item.name)} <span class="demo-meta-line">#${item.apiId}</span></h2>
            <p class="demo-meta-line">${escapeHtml(item.type)} · ${escapeHtml(item.dimension)}</p>
            <p class="demo-meta-line" style="margin-top:0.65rem">${(item.residents || []).length} residents</p>
          </div>
        </div>
        <div class="call-box">
          <div>API-kald</div>
          <code>GET /api/RickAndMorty/locations/${item.apiId}</code>
        </div>`;
    } else {
      detail.innerHTML = `
        <div class="detail-head">
          <div>
            <h2>${escapeHtml(item.name)} <span class="demo-meta-line">#${item.apiId}</span></h2>
            <p class="demo-meta-line">${escapeHtml(item.episode)} · ${escapeHtml(item.air_date)}</p>
            <p class="demo-meta-line" style="margin-top:0.65rem">${(item.characters || []).length} characters</p>
          </div>
        </div>
        <div class="call-box">
          <div>API-kald</div>
          <code>GET /api/RickAndMorty/episodes/${item.apiId}</code>
        </div>`;
    }
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showErr(e) {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  }

  tabs.querySelectorAll(".type-chip").forEach((btn) => {
    btn.addEventListener("click", async () => {
      tab = btn.dataset.tab;
      tabs.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b === btn));
      detail.classList.add("hidden");
      search.value = "";
      await loadFilterOptions();
      loadList().catch(showErr);
    });
  });

  document.getElementById("btnLoad").addEventListener("click", () => loadList().catch(showErr));
  filter.addEventListener("change", () => loadList().catch(showErr));
  let t;
  search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => loadList().catch(showErr), 280);
  });

  Promise.all([loadSummary(), loadFilterOptions(), loadList()]).catch(showErr);
})();
