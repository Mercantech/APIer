(() => {
  const REGIONS = ["Europe", "Asia", "Africa", "Americas", "Oceania", "Antarctic"];

  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const regionsEl = document.getElementById("regions");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");

  let all = [];
  let activeRegion = "all";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function commonName(c) {
    return c?.name?.common || c?.Name?.Common || "";
  }

  function flagUrl(c) {
    return c?.flags?.png || c?.flags?.svg || c?.Flags?.Png || "";
  }

  function cca3(c) {
    return c?.cca3 || c?.Cca3 || "";
  }

  function normalizeList(items) {
    return (items || [])
      .map((c) => ({
        name: commonName(c),
        flag: flagUrl(c),
        cca3: cca3(c),
        region: c.region || c.Region || "",
        raw: c,
      }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name, "da"));
  }

  function renderRegionChips() {
    regionsEl.innerHTML = [
      `<button type="button" class="type-chip active" data-region="all">Alle</button>`,
      ...REGIONS.map(
        (r) =>
          `<button type="button" class="type-chip" data-region="${escapeHtml(r)}">${escapeHtml(r)}</button>`
      ),
    ].join("");
    regionsEl.querySelectorAll(".type-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeRegion = btn.dataset.region;
        regionsEl.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b === btn));
        loadList().catch(showError);
      });
    });
  }

  async function loadList() {
    status.classList.remove("error");
    if (activeRegion === "all") {
      status.textContent = "Henter /api/Countries/simplified …";
      const res = await fetch("/api/Countries/simplified");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      all = normalizeList(await res.json());
    } else {
      status.textContent = `Henter /api/Countries/region/${activeRegion} …`;
      const res = await fetch(`/api/Countries/region/${encodeURIComponent(activeRegion)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      all = normalizeList(await res.json());
    }
    status.textContent = `${all.length} lande · klik for detaljer`;
    renderGrid();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cca3.toLowerCase().includes(q) ||
        (c.raw?.altSpellings || []).some((s) => String(s).toLowerCase().includes(q))
    );
  }

  function renderGrid() {
    const items = filtered();
    status.textContent = `${items.length} resultater · klik for detaljer`;
    grid.innerHTML = items
      .map(
        (c, i) => `
      <article class="country-card" tabindex="0" role="button" data-name="${escapeHtml(c.name)}" style="animation-delay:${Math.min(i, 24) * 18}ms">
        ${
          c.flag
            ? `<img src="${escapeHtml(c.flag)}" alt="" loading="lazy" width="72" height="48" onerror="this.style.visibility='hidden'" />`
            : `<div class="country-flag-placeholder" aria-hidden="true"></div>`
        }
        <h3>${escapeHtml(c.name)}</h3>
        <p class="sub">${escapeHtml(c.cca3 || "—")}</p>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".country-card").forEach((el) => {
      const open = () => showDetail(el.dataset.name);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function formatPop(n) {
    if (n == null) return "—";
    return Number(n).toLocaleString("da-DK");
  }

  async function showDetail(name) {
    detail.classList.remove("hidden");
    detail.innerHTML = `<p class="demo-status">Henter ${escapeHtml(name)} …</p>`;
    try {
      const [countryRes, bordersRes] = await Promise.all([
        fetch(`/api/Countries/name/${encodeURIComponent(name)}`),
        fetch(`/api/Countries/borders/${encodeURIComponent(name)}`),
      ]);
      if (!countryRes.ok) {
        detail.innerHTML = `<p class="demo-status error">Land ikke fundet</p>`;
        return;
      }
      const c = await countryRes.json();
      const borders = bordersRes.ok ? await bordersRes.json() : [];
      const langs = c.languages ? Object.values(c.languages).join(", ") : "—";
      const capital = (c.capital || []).join(", ") || "—";

      detail.innerHTML = `
        <div class="detail-head">
          ${
            flagUrl(c)
              ? `<img class="country" src="${escapeHtml(flagUrl(c))}" alt="" width="120" height="80" />`
              : ""
          }
          <div>
            <h2>${escapeHtml(commonName(c))}</h2>
            <p class="demo-meta-line">${escapeHtml(c.name?.official || "")}</p>
            <p class="demo-meta-line" style="margin-top:0.65rem">
              ${escapeHtml(c.region || "—")}${c.subregion ? ` · ${escapeHtml(c.subregion)}` : ""}
              · ${escapeHtml(cca3(c) || "—")}
            </p>
            <p class="demo-meta-line">
              Hovedstad ${escapeHtml(capital)} · Pop. ${formatPop(c.population)} · Areal ${formatPop(c.area)} km²
            </p>
            <p class="demo-meta-line">Sprog: ${escapeHtml(langs)}</p>
          </div>
        </div>
        <div class="call-box">
          <div>API-kald</div>
          <code>GET /api/Countries/name/${escapeHtml(commonName(c))}</code><br />
          <code>GET /api/Countries/borders/${escapeHtml(commonName(c))}</code>
        </div>
        <h3 style="margin:1.25rem 0 0.35rem;font-size:1rem">Nabolande</h3>
        <div class="border-row">
          ${(borders || [])
            .map(
              (b) => `
            <button type="button" class="border-chip" data-name="${escapeHtml(commonName(b))}">
              ${
                flagUrl(b)
                  ? `<img src="${escapeHtml(flagUrl(b))}" alt="" width="28" height="18" />`
                  : ""
              }
              <span>${escapeHtml(commonName(b))}</span>
            </button>`
            )
            .join("") || "<p class='demo-meta-line'>Ingen naboer i datasættet</p>"}
        </div>`;

      detail.querySelectorAll(".border-chip").forEach((btn) => {
        btn.addEventListener("click", () => showDetail(btn.dataset.name));
      });
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      detail.innerHTML = `<p class="demo-status error">${escapeHtml(e.message)}</p>`;
    }
  }

  function showError(e) {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  }

  document.getElementById("btnLoad").addEventListener("click", () => {
    loadList().catch(showError);
  });
  search.addEventListener("input", () => {
    if (all.length) renderGrid();
  });

  renderRegionChips();
  loadList().catch(showError);
})();
