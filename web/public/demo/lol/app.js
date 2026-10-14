(() => {
  const auth = window.ApierAuth;
  const gate = document.getElementById("gate");
  const toolbar = document.getElementById("toolbar");
  const classesEl = document.getElementById("classes");
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");

  let all = [];
  let activeClass = "all";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function apiHeaders() {
    const key = auth.getStoredApiKey();
    if (!key) throw new Error("Mangler API-nøgle");
    return { "X-Api-Key": key };
  }

  async function lolFetch(path) {
    const res = await fetch(path, { headers: apiHeaders() });
    if (res.status === 401) {
      throw new Error("Ugyldig eller manglende API-nøgle (401)");
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderGate() {
    const loggedIn = auth.isLoggedIn();
    const key = auth.getStoredApiKey();
    const profile = auth.getProfile();

    if (key) {
      gate.innerHTML = `
        <div class="lol-gate-ok">
          <p>
            API-nøgle klar${loggedIn && profile?.name ? ` · ${escapeHtml(profile.name)}` : ""}.
            Header: <code>X-Api-Key</code>
          </p>
          <button type="button" class="btn ghost sm" id="btnClearKey">Skift nøgle</button>
        </div>`;
      toolbar.hidden = false;
      classesEl.hidden = false;
      document.getElementById("btnClearKey").addEventListener("click", () => {
        auth.setStoredApiKey(null);
        all = [];
        grid.innerHTML = "";
        detail.classList.add("hidden");
        renderGate();
      });
      return true;
    }

    toolbar.hidden = true;
    classesEl.hidden = true;
    status.textContent = "";

    if (!loggedIn) {
      gate.innerHTML = `
        <div class="lol-gate-card">
          <h2>Kræver API-nøgle</h2>
          <p>
            LoL-endpoints er beskyttet. Log ind med Mercantec Auth, opret en nøgle,
            og kald med header <code>X-Api-Key</code>.
          </p>
          <button type="button" class="btn primary" id="btnLogin">Log ind</button>
        </div>`;
      document.getElementById("btnLogin").addEventListener("click", () => {
        auth.beginLogin("/demo/lol");
      });
      return false;
    }

    gate.innerHTML = `
      <div class="lol-gate-card">
        <h2>Opret API-nøgle</h2>
        <p>Du er logget ind som <strong>${escapeHtml(profile?.name || "bruger")}</strong>.
          Opret en nøgle til denne session, eller indsæt en eksisterende.</p>
        <div class="lol-gate-actions">
          <button type="button" class="btn primary" id="btnCreateKey">Opret nøgle</button>
          <input type="password" id="keyPaste" placeholder="Indsæt eksisterende nøgle" autocomplete="off" />
          <button type="button" class="btn ghost" id="btnUsePaste">Brug nøgle</button>
        </div>
        <p class="demo-status" id="gateStatus"></p>
      </div>`;

    document.getElementById("btnCreateKey").addEventListener("click", async () => {
      const gateStatus = document.getElementById("gateStatus");
      gateStatus.classList.remove("error");
      gateStatus.textContent = "Opretter…";
      try {
        const res = await auth.apiFetch("/api/ApiKeys", {
          method: "POST",
          body: JSON.stringify({ name: "LoL-demo" }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        auth.setStoredApiKey(data.key);
        gateStatus.textContent = "Nøgle oprettet og gemt i session.";
        renderGate();
        bootData();
      } catch (e) {
        gateStatus.textContent = e.message || "Kunne ikke oprette nøgle";
        gateStatus.classList.add("error");
      }
    });

    document.getElementById("btnUsePaste").addEventListener("click", () => {
      const val = document.getElementById("keyPaste").value.trim();
      if (!val) return;
      auth.setStoredApiKey(val);
      renderGate();
      bootData();
    });

    return false;
  }

  async function loadClasses() {
    const classes = await lolFetch("/LeagueOfLegends/classes");
    classesEl.innerHTML = [
      `<button type="button" class="type-chip active" data-class="all">Alle</button>`,
      ...classes.map(
        (c) =>
          `<button type="button" class="type-chip" data-class="${escapeHtml(c)}">${escapeHtml(c)}</button>`
      ),
    ].join("");
    classesEl.querySelectorAll(".type-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeClass = btn.dataset.class;
        classesEl.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b === btn));
        renderGrid();
      });
    });
  }

  async function loadList() {
    status.classList.remove("error");
    status.textContent = "Henter /LeagueOfLegends …";
    all = await lolFetch("/LeagueOfLegends");
    status.textContent = `${all.length} champions · klik for detaljer`;
    renderGrid();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return all.filter((c) => {
      if (activeClass !== "all" && !(c.classes || []).includes(activeClass)) return false;
      if (!q) return true;
      return (c.name || "").toLowerCase().includes(q) || (c.title || "").toLowerCase().includes(q);
    });
  }

  function renderGrid() {
    const items = filtered();
    status.textContent = `${items.length} resultater · klik for detaljer`;
    grid.innerHTML = items
      .map(
        (c, i) => `
      <article class="lol-card" tabindex="0" role="button" data-id="${escapeHtml(c.id)}" style="animation-delay:${Math.min(i, 24) * 20}ms">
        <img src="${escapeHtml(c.imgUrl || "")}" alt="" loading="lazy" width="64" height="64" onerror="this.style.visibility='hidden'" />
        <h3>${escapeHtml(c.name)}</h3>
        <p class="sub">${escapeHtml(c.title || "")}</p>
        <div class="poke-types">${(c.classes || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      </article>`
      )
      .join("");

    grid.querySelectorAll(".lol-card").forEach((el) => {
      const open = () => showDetail(el.dataset.id);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  async function showDetail(id) {
    detail.classList.remove("hidden");
    detail.innerHTML = `<p class="demo-status">Henter champion…</p>`;
    try {
      const c = await lolFetch(`/LeagueOfLegends/${encodeURIComponent(id)}`);
      detail.innerHTML = `
        <div class="detail-head">
          <img class="lol" src="${escapeHtml(c.imgUrl || "")}" alt="${escapeHtml(c.name)}" width="96" height="96" />
          <div>
            <h2>${escapeHtml(c.name)}</h2>
            <p class="demo-meta-line">${escapeHtml(c.title || "")}</p>
            <div class="poke-types" style="margin-top:0.5rem;justify-content:flex-start">
              ${(c.classes || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
            </div>
            <p class="demo-meta-line" style="margin-top:0.65rem">
              ${escapeHtml(c.rangeType || "—")} · ${escapeHtml(c.resource || "—")}
              ${c.region ? ` · ${escapeHtml(c.region)}` : ""}
            </p>
          </div>
        </div>
        <div class="call-box">
          <div>API-kald</div>
          <code>GET /LeagueOfLegends/${escapeHtml(c.id)}</code><br />
          <code>Header: X-Api-Key: …</code>
        </div>
        <pre class="demo-json" style="margin-top:1rem;max-height:40vh">${escapeHtml(JSON.stringify(c, null, 2))}</pre>`;
      detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      detail.innerHTML = `<p class="demo-status error">${escapeHtml(e.message)}</p>`;
    }
  }

  function bootData() {
    Promise.all([loadClasses(), loadList()]).catch((e) => {
      status.textContent = e.message || "Fejl";
      status.classList.add("error");
    });
  }

  document.getElementById("btnLoad").addEventListener("click", () => {
    loadList().catch((e) => {
      status.textContent = e.message;
      status.classList.add("error");
    });
  });
  search.addEventListener("input", () => {
    if (all.length) renderGrid();
  });

  if (renderGate()) bootData();
})();
