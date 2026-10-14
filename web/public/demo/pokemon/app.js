(() => {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const typesEl = document.getElementById("types");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");

  let all = [];
  let activeType = "all";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadTypes() {
    const res = await fetch("/go/pokemon/types");
    if (!res.ok) throw new Error("Kunne ikke hente typer");
    const types = await res.json();
    typesEl.innerHTML = [
      `<button type="button" class="type-chip active" data-type="all">Alle</button>`,
      ...types.map(
        (t) => `<button type="button" class="type-chip" data-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`
      ),
    ].join("");
    typesEl.querySelectorAll(".type-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeType = btn.dataset.type;
        typesEl.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b === btn));
        renderGrid();
      });
    });
  }

  async function loadList() {
    status.textContent = "Henter /go/pokemon?limit=151 …";
    status.classList.remove("error");
    const res = await fetch("/go/pokemon?limit=151");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    all = await res.json();
    status.textContent = `${all.length} Pokémon klar · klik et kort for detaljer`;
    renderGrid();
  }

  function filtered() {
    const q = search.value.trim().toLowerCase();
    return all.filter((p) => {
      if (activeType !== "all" && !(p.types || []).includes(activeType)) return false;
      if (!q) return true;
      return p.name.includes(q) || String(p.id) === q;
    });
  }

  function renderGrid() {
    const items = filtered();
    grid.innerHTML = items
      .map(
        (p, i) => `
      <article class="poke-card" tabindex="0" role="button" data-id="${p.id}" style="animation-delay:${Math.min(i, 20) * 25}ms">
        <img src="${escapeHtml(p.spriteUrl)}" alt="" loading="lazy" width="96" height="96" />
        <h3>${escapeHtml(p.name)}</h3>
        <p class="id">#${p.id}</p>
        <div class="poke-types">${(p.types || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
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
    detail.innerHTML = `<p class="demo-status">Henter #${id} …</p>`;
    const [pokeRes, evoRes] = await Promise.all([
      fetch(`/go/pokemon/${id}`),
      fetch(`/go/pokemon/${id}/evolutions`),
    ]);
    if (!pokeRes.ok) {
      detail.innerHTML = `<p class="demo-status error">Pokémon ikke fundet</p>`;
      return;
    }
    const p = await pokeRes.json();
    const evo = evoRes.ok ? await evoRes.json() : { chain: [] };
    const chain = evo.chain || [];

    detail.innerHTML = `
      <div class="detail-head">
        <img class="poke" src="${escapeHtml(p.spriteUrl)}" alt="${escapeHtml(p.name)}" width="128" height="128" />
        <div>
          <h2>${escapeHtml(p.name)} <span class="demo-meta-line">#${p.id}</span></h2>
          <div class="poke-types">${(p.types || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
          <p class="demo-meta-line" style="margin-top:0.65rem">
            Højde ${p.height} · Vægt ${p.weight} · Base XP ${p.baseExperience}
          </p>
        </div>
      </div>
      <div class="call-box">
        <div>API-kald</div>
        <code>GET /go/pokemon/${p.id}</code><br />
        <code>GET /go/pokemon/${p.id}/evolutions</code>
      </div>
      <h3 style="margin:1.25rem 0 0.35rem;font-size:1rem">Evolution</h3>
      <div class="evo-row">
        ${chain
          .map(
            (c, idx) => `
          ${idx ? `<span class="evo-arrow" aria-hidden="true">→</span>` : ""}
          <button type="button" class="evo-step" data-id="${c.id}">
            <img src="${escapeHtml(c.spriteUrl)}" alt="" width="72" height="72" />
            <span>${escapeHtml(c.name)}</span>
          </button>`
          )
          .join("") || "<p class='demo-meta-line'>Ingen kæde</p>"}
      </div>`;

    detail.querySelectorAll(".evo-step").forEach((btn) => {
      btn.addEventListener("click", () => showDetail(Number(btn.dataset.id)));
    });
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("btnLoad").addEventListener("click", () => {
    loadList().catch((e) => {
      status.textContent = e.message;
      status.classList.add("error");
    });
  });
  search.addEventListener("input", () => renderGrid());

  Promise.all([loadTypes(), loadList()]).catch((e) => {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  });
})();
