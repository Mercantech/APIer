(() => {
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const summaryLine = document.getElementById("summaryLine");
  let tab = "items";
  let items = [];

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  async function loadSummary() {
    const s = await fetch("/api/Terraria").then((r) => r.json());
    summaryLine.textContent = `${s.items} items · ${s.recipes} recipes · ${s.bosses} bosses · ${s.license}`;
  }

  function listUrl() {
    const params = new URLSearchParams({ limit: "120" });
    const q = search.value.trim();
    if (q) params.set("q", q);
    if (tab === "weapons") return `/api/Terraria/items/weapons?${params}`;
    if (tab === "armor") return `/api/Terraria/items/armor?${params}`;
    if (tab === "recipes") return `/api/Terraria/recipes?${params}`;
    if (tab === "bosses") {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      return `/api/Terraria/bosses?${p}`;
    }
    return `/api/Terraria/items?${params}`;
  }

  async function loadList() {
    const url = listUrl();
    status.textContent = `Henter ${url} …`;
    status.classList.remove("error");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    items = await res.json();
    status.textContent = `${items.length} resultater`;
    if (tab === "recipes") {
      grid.innerHTML = items
        .map(
          (r, i) => `
        <article class="poke-card" tabindex="0" role="button" data-kind="recipe" data-id="${r.resultItemId}" style="animation-delay:${Math.min(i, 20) * 20}ms">
          <h3>${esc(r.resultName)}</h3>
          <p class="id">×${r.resultAmount} · ${esc(r.station)}</p>
          <p class="demo-meta-line">${esc((r.ingredients || []).slice(0, 3).join(", "))}</p>
        </article>`
        )
        .join("");
    } else if (tab === "bosses") {
      grid.innerHTML = items
        .map(
          (n, i) => `
        <article class="poke-card" tabindex="0" role="button" data-kind="boss" data-id="${n.npcId}" style="animation-delay:${Math.min(i, 20) * 20}ms">
          <h3>${esc(n.name)}</h3>
          <p class="id">${esc(n.stage)}</p>
          <p class="demo-meta-line">HP ${esc(n.life)} · Def ${esc(n.defense)}</p>
        </article>`
        )
        .join("");
    } else {
      grid.innerHTML = items
        .map(
          (it, i) => `
        <article class="poke-card" tabindex="0" role="button" data-kind="item" data-id="${it.itemId}" style="animation-delay:${Math.min(i, 20) * 20}ms">
          <h3>${esc(it.name)}</h3>
          <p class="id">#${it.itemId} · ${esc(it.category)}</p>
          <div class="poke-types">${it.damage != null ? `<span>${it.damage} dmg</span>` : ""}${it.defense != null ? `<span>${it.defense} def</span>` : ""}</div>
        </article>`
        )
        .join("");
    }
    grid.querySelectorAll(".poke-card").forEach((el) => {
      const open = () => showDetail(el.dataset.kind, Number(el.dataset.id));
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  async function showDetail(kind, id) {
    detail.classList.remove("hidden");
    detail.innerHTML = `<p class="demo-status">Henter…</p>`;
    if (kind === "boss") {
      const n = items.find((x) => x.npcId === id);
      detail.innerHTML = `
        <div class="detail-head"><div>
          <h2>${esc(n?.name)} <span class="demo-meta-line">#${id}</span></h2>
          <p class="demo-meta-line">${esc(n?.stage)} · HP ${esc(n?.life)} · Def ${esc(n?.defense)}</p>
          <p class="demo-meta-line"><a href="${esc(n?.wikiUrl)}" target="_blank" rel="noopener">Terraria Wiki ↗</a></p>
        </div></div>
        <div class="call-box"><code>GET /api/Terraria/bosses/${id}</code></div>`;
      return;
    }
    const res = await fetch(`/api/Terraria/items/${id}`);
    if (!res.ok) {
      detail.innerHTML = `<p class="demo-status error">Ikke fundet</p>`;
      return;
    }
    const data = await res.json();
    const it = data.item || data;
    const recipes = data.recipes || [];
    detail.innerHTML = `
      <div class="detail-head"><div>
        <h2>${esc(it.name)} <span class="demo-meta-line">#${it.itemId}</span></h2>
        <p class="demo-meta-line">${esc(it.type)} · ${esc(it.category)} · rarity ${it.rarity}</p>
        <p class="flavor">${esc(it.tooltip)}</p>
        <ul class="meta-list">
          ${it.damage != null ? `<li><strong>Damage</strong> ${it.damage} ${esc(it.damageType)}</li>` : ""}
          ${it.defense != null ? `<li><strong>Defense</strong> ${it.defense}</li>` : ""}
          <li><strong>Sell</strong> ${esc(it.sellValue || "—")}</li>
          <li><a href="${esc(it.wikiUrl)}" target="_blank" rel="noopener">Terraria Wiki ↗</a></li>
        </ul>
        ${
          recipes.length
            ? `<h3 class="detail-sub">Recipes</h3><ul class="meta-list">${recipes
                .map(
                  (r) =>
                    `<li><strong>${esc(r.station)}</strong> → ${(r.ingredients || []).map(esc).join(", ")} (×${r.resultAmount})</li>`
                )
                .join("")}</ul>`
            : ""
        }
      </div></div>
      <div class="call-box"><code>GET /api/Terraria/items/${id}</code></div>`;
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
