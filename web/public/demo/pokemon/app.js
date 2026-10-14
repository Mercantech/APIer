(() => {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const typesEl = document.getElementById("types");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const generation = document.getElementById("generation");
  const legendaryOnly = document.getElementById("legendaryOnly");

  let all = [];
  let activeType = "all";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function statBar(label, value) {
    const pct = Math.min(100, Math.round((Number(value) || 0) / 255 * 100));
    return `<div class="stat-row">
      <span class="stat-label">${escapeHtml(label)}</span>
      <div class="stat-track"><div class="stat-fill" style="width:${pct}%"></div></div>
      <span class="stat-val">${Number(value) || 0}</span>
    </div>`;
  }

  async function loadTypes() {
    const res = await fetch("/go/pokemon/types");
    if (!res.ok) throw new Error("Kunne ikke hente typer");
    const types = await res.json();
    typesEl.innerHTML = [
      `<button type="button" class="type-chip active" data-type="all">Alle</button>`,
      ...types.map(
        (t) =>
          `<button type="button" class="type-chip" data-type="${escapeHtml(t)}">${escapeHtml(t)}</button>`
      ),
    ].join("");
    typesEl.querySelectorAll(".type-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeType = btn.dataset.type;
        typesEl.querySelectorAll(".type-chip").forEach((b) => b.classList.toggle("active", b === btn));
        loadList().catch(showErr);
      });
    });
  }

  async function loadGenerations() {
    const res = await fetch("/go/pokemon/generations");
    if (!res.ok) return;
    const gens = await res.json();
    generation.innerHTML =
      `<option value="0">Alle generationer</option>` +
      gens
        .map(
          (g) =>
            `<option value="${g.generation}">Gen ${g.generation} (${g.count})</option>`
        )
        .join("");
  }

  function listUrl() {
    const params = new URLSearchParams({ limit: "2000" });
    const gen = Number(generation.value) || 0;
    if (gen > 0) params.set("generation", String(gen));
    if (legendaryOnly.checked) params.set("legendary", "true");
    if (activeType !== "all") params.set("type", activeType);
    const q = search.value.trim();
    if (q && !/^\d+$/.test(q)) params.set("q", q);
    return `/go/pokemon?${params}`;
  }

  async function loadList() {
    const url = listUrl();
    status.textContent = `Henter ${url} …`;
    status.classList.remove("error");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    all = await res.json();
    const q = search.value.trim().toLowerCase();
    const shown = q && /^\d+$/.test(q) ? all.filter((p) => String(p.id) === q) : all;
    status.textContent = `${shown.length} Pokémon · klik for stats, abilities og mere`;
    renderGrid(shown);
  }

  function renderGrid(items) {
    grid.innerHTML = items
      .map(
        (p, i) => `
      <article class="poke-card" tabindex="0" role="button" data-id="${p.id}" style="animation-delay:${Math.min(i, 20) * 25}ms">
        <img src="${escapeHtml(p.artworkUrl || p.spriteUrl)}" alt="" loading="lazy" width="96" height="96" />
        <h3>${escapeHtml(p.name)}</h3>
        <p class="id">#${p.id}${p.generation ? ` · Gen ${p.generation}` : ""}</p>
        <div class="poke-types">${(p.types || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
        ${p.isLegendary || p.isMythical ? `<p class="poke-badge">${p.isLegendary ? "Legendary" : "Mythical"}</p>` : ""}
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
    const s = p.stats || {};
    const art = p.artworkUrl || p.spriteUrl;
    const abilities = [
      ...(p.abilities || []),
      ...(p.hiddenAbility ? [`${p.hiddenAbility} (hidden)`] : []),
    ];

    detail.innerHTML = `
      <div class="detail-head">
        <img class="poke" src="${escapeHtml(art)}" alt="${escapeHtml(p.name)}" width="160" height="160" />
        <div>
          <h2>${escapeHtml(p.name)} <span class="demo-meta-line">#${p.id}</span></h2>
          <p class="demo-meta-line">${escapeHtml(p.genus || "")}${p.generation ? ` · Generation ${p.generation}` : ""}</p>
          <div class="poke-types">${(p.types || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
          <p class="demo-meta-line" style="margin-top:0.65rem">
            Højde ${p.height} · Vægt ${p.weight} · Base XP ${p.baseExperience}
            ${p.isLegendary ? " · Legendary" : ""}${p.isMythical ? " · Mythical" : ""}${p.isBaby ? " · Baby" : ""}
          </p>
          <p class="flavor">${escapeHtml(p.flavorText || "")}</p>
        </div>
      </div>

      <div class="detail-grid">
        <div>
          <h3 class="detail-sub">Base stats</h3>
          ${statBar("HP", s.hp)}
          ${statBar("Attack", s.attack)}
          ${statBar("Defense", s.defense)}
          ${statBar("Sp. Atk", s.specialAttack)}
          ${statBar("Sp. Def", s.specialDefense)}
          ${statBar("Speed", s.speed)}
        </div>
        <div>
          <h3 class="detail-sub">Meta</h3>
          <ul class="meta-list">
            <li><strong>Abilities</strong> ${(abilities.length ? abilities : ["—"]).map(escapeHtml).join(", ")}</li>
            <li><strong>Color</strong> ${escapeHtml(p.color || "—")}</li>
            <li><strong>Habitat</strong> ${escapeHtml(p.habitat || "—")}</li>
            <li><strong>Shape</strong> ${escapeHtml(p.shape || "—")}</li>
            <li><strong>Egg groups</strong> ${(p.eggGroups || []).map(escapeHtml).join(", ") || "—"}</li>
            <li><strong>Capture</strong> ${p.captureRate ?? "—"} · <strong>Happiness</strong> ${p.baseHappiness ?? "—"}</li>
            <li><strong>Gender rate</strong> ${p.genderRate ?? "—"} · <strong>Hatch</strong> ${p.hatchCounter ?? "—"}</li>
          </ul>
          ${p.shinySpriteUrl ? `<img class="shiny-sprite" src="${escapeHtml(p.shinySpriteUrl)}" alt="Shiny" width="96" height="96" title="Shiny sprite" />` : ""}
        </div>
      </div>

      <div class="call-box">
        <div>API-kald</div>
        <code>GET /go/pokemon/${p.id}</code><br />
        <code>GET /go/pokemon/${p.id}/evolutions</code><br />
        <code>GET /go/pokemon?generation=${p.generation || 1}&amp;type=${(p.types || ["normal"])[0]}</code>
      </div>
      <h3 class="detail-sub">Evolution</h3>
      <div class="evo-row">
        ${
          chain
            .map(
              (c, idx) => `
          ${idx ? `<span class="evo-arrow" aria-hidden="true">→</span>` : ""}
          <button type="button" class="evo-step" data-id="${c.id}">
            <img src="${escapeHtml(c.spriteUrl)}" alt="" width="72" height="72" />
            <span>${escapeHtml(c.name)}</span>
          </button>`
            )
            .join("") || "<p class='demo-meta-line'>Ingen kæde</p>"
        }
      </div>`;

    detail.querySelectorAll(".evo-step").forEach((btn) => {
      btn.addEventListener("click", () => showDetail(Number(btn.dataset.id)));
    });
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showErr(e) {
    status.textContent = e.message || "Fejl";
    status.classList.add("error");
  }

  let searchTimer;
  document.getElementById("btnLoad").addEventListener("click", () => loadList().catch(showErr));
  generation.addEventListener("change", () => loadList().catch(showErr));
  legendaryOnly.addEventListener("change", () => loadList().catch(showErr));
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadList().catch(showErr), 280);
  });

  Promise.all([loadTypes(), loadGenerations(), loadList()]).catch(showErr);
})();
