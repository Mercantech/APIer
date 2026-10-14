(() => {
  const ASSET = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.4";
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const tabs = document.getElementById("tabs");

  let tab = "items";
  let cache = {};

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function assetUrl(kind, name) {
    if (kind === "items" || kind === "blocks") {
      return `${ASSET}/items/${name}.png`;
    }
    if (kind === "mobs") {
      return `${ASSET}/entity/${name}.png`;
    }
    return "";
  }

  function endpointFor(t, q) {
    if (t === "recipes") {
      if (q) return `/go/minecraft/recipes/${encodeURIComponent(q)}`;
      return `/go/minecraft/recipes?limit=40`;
    }
    const base = `/go/minecraft/${t}?limit=80`;
    return q ? `${base}&q=${encodeURIComponent(q)}` : base;
  }

  async function load() {
    const q = search.value.trim();
    const url = endpointFor(tab, q);
    status.textContent = `Henter ${url} …`;
    status.classList.remove("error");
    detail.classList.add("hidden");

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[tab] = data;
      status.textContent = Array.isArray(data)
        ? `${data.length} resultater · klik for detaljer`
        : "Svar modtaget";
      if (tab === "recipes") renderRecipes(data, url);
      else renderGrid(data, url);
    } catch (e) {
      status.textContent = e.message || "Fejl";
      status.classList.add("error");
      grid.innerHTML = "";
    }
  }

  function renderGrid(items, url) {
    grid.innerHTML = items
      .map((it, i) => {
        const name = it.name || it.id;
        const title = it.displayName || name;
        const img = assetUrl(tab, name);
        const imgHtml = img
          ? `<img src="${escapeHtml(img)}" alt="" width="48" height="48" loading="lazy" onerror="this.style.visibility='hidden'" />`
          : "";
        return `
        <article class="mc-card" tabindex="0" role="button" data-idx="${i}" style="animation-delay:${Math.min(i, 24) * 20}ms">
          ${imgHtml}
          <h3>${escapeHtml(title)}</h3>
          <p class="sub">${escapeHtml(name)}</p>
        </article>`;
      })
      .join("");

    grid.querySelectorAll(".mc-card").forEach((el) => {
      const open = () => showItem(items[Number(el.dataset.idx)], url);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function renderRecipes(list, url) {
    grid.innerHTML = "";
    detail.classList.remove("hidden");
    if (!Array.isArray(list) || !list.length) {
      detail.innerHTML = `<p class="demo-status">Ingen recipes — prøv fx <code>diamond_pickaxe</code></p>`;
      return;
    }
    detail.innerHTML = `
      <h2 style="margin:0 0 0.5rem;font-size:1.35rem">Recipes</h2>
      <div class="call-box"><code>GET ${escapeHtml(url)}</code></div>
      <div class="recipe-list">
        ${list
          .map(
            (r) => `
          <article class="recipe-block">
            <strong>${escapeHtml(r.resultName || r.id)}</strong>
            <span class="demo-meta-line"> × ${r.resultCount ?? 1}</span>
            <pre>${escapeHtml(JSON.stringify(r.raw ?? r, null, 2))}</pre>
          </article>`
          )
          .join("")}
      </div>`;
  }

  function showItem(it, listUrl) {
    detail.classList.remove("hidden");
    const name = it.name || "";
    const img = assetUrl(tab, name);
    detail.innerHTML = `
      <div class="detail-head">
        ${img ? `<img class="mc" src="${escapeHtml(img)}" alt="" width="64" height="64" onerror="this.remove()" />` : ""}
        <div>
          <h2>${escapeHtml(it.displayName || name)}</h2>
          <p class="demo-meta-line">${escapeHtml(name)} · id ${it.id ?? "—"}</p>
        </div>
      </div>
      <div class="call-box">
        <code>GET ${escapeHtml(listUrl)}</code>
        ${
          tab === "items" || tab === "blocks"
            ? `<br /><button type="button" class="btn ghost sm" id="btnRecipe" style="margin-top:0.6rem">Find recipe</button>`
            : ""
        }
      </div>
      <pre class="demo-json" style="margin-top:1rem;max-height:40vh">${escapeHtml(JSON.stringify(it, null, 2))}</pre>`;

    document.getElementById("btnRecipe")?.addEventListener("click", () => {
      tab = "recipes";
      tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === "recipes"));
      search.value = name;
      load();
    });
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  tabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
      if (tab === "recipes" && !search.value.trim()) {
        search.value = "diamond_pickaxe";
      }
      load();
    });
  });

  document.getElementById("btnLoad").addEventListener("click", load);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") load();
  });

  load();
})();
