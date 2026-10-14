(() => {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const summaryLine = document.getElementById("summaryLine");
  let tab = "people";
  let items = [];

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const titleOf = (x) => x.name || x.title || `#${x.apiId}`;

  async function loadSummary() {
    const s = await fetch("/api/StarWars").then((r) => r.json());
    summaryLine.textContent = `${s.people} people · ${s.planets} planets · ${s.films} films · ${s.species} species · ${s.starships} starships`;
  }

  async function loadList() {
    const params = new URLSearchParams({ limit: "120" });
    const q = search.value.trim();
    if (q) params.set("q", q);
    const url = `/api/StarWars/${tab}?${params}`;
    status.textContent = `Henter ${url} …`;
    status.classList.remove("error");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
    status.textContent = `${items.length} ${tab}`;
    grid.innerHTML = items
      .map(
        (x, i) => `
      <article class="poke-card" tabindex="0" role="button" data-id="${x.apiId}" style="animation-delay:${Math.min(i, 20) * 20}ms">
        <h3>${esc(titleOf(x))}</h3>
        <p class="id">#${x.apiId}${x.episode_id ? ` · Ep ${x.episode_id}` : ""}${x.climate ? ` · ${esc(x.climate)}` : ""}${x.starship_class ? ` · ${esc(x.starship_class)}` : ""}${x.classification ? ` · ${esc(x.classification)}` : ""}${x.gender ? ` · ${esc(x.gender)}` : ""}</p>
      </article>`
      )
      .join("");
    grid.querySelectorAll(".poke-card").forEach((el) => {
      const open = () => showDetail(Number(el.dataset.id));
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
    detail.innerHTML = `<p class="demo-status">Henter…</p>`;
    const res = await fetch(`/api/StarWars/${tab}/${id}`);
    if (!res.ok) {
      detail.innerHTML = `<p class="demo-status error">Ikke fundet</p>`;
      return;
    }
    const x = await res.json();
    const rel = (label, arr) =>
      arr?.length
        ? `<li><strong>${label}</strong> ${arr.length} relationer</li>`
        : "";
    detail.innerHTML = `
      <div class="detail-head"><div>
        <h2>${esc(titleOf(x))} <span class="demo-meta-line">#${x.apiId}</span></h2>
        <ul class="meta-list">
          ${Object.entries(x)
            .filter(([k, v]) => !["id", "createdAt", "updatedAt", "films", "characters", "planets", "starships", "vehicles", "species", "people", "pilots", "residents", "opening_crawl"].includes(k) && typeof v !== "object")
            .slice(0, 12)
            .map(([k, v]) => `<li><strong>${esc(k)}</strong> ${esc(v)}</li>`)
            .join("")}
          ${rel("films", x.films)}
          ${rel("characters", x.characters)}
          ${rel("planets", x.planets)}
          ${rel("starships", x.starships)}
          ${rel("species", x.species)}
          ${rel("people", x.people)}
          ${rel("pilots", x.pilots)}
        </ul>
      </div></div>
      <div class="call-box"><div>API-kald</div><code>GET /api/StarWars/${tab}/${id}</code></div>`;
  }

  const err = (e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  };

  document.getElementById("tabs").querySelectorAll(".type-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      document.querySelectorAll("#tabs .type-chip").forEach((b) => b.classList.toggle("active", b === btn));
      detail.classList.add("hidden");
      loadList().catch(err);
    });
  });
  document.getElementById("btnLoad").addEventListener("click", () => loadList().catch(err));
  let t;
  search.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => loadList().catch(err), 280);
  });
  Promise.all([loadSummary(), loadList()]).catch(err);
})();
