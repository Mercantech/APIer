(() => {
  // 1.20.4 findes ikke i minecraft-assets — brug nærmeste med textures
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";
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

  /** Items ligger ofte kun under blocks/ (fx stone); tools under items/. */
  function assetCandidates(kind, name) {
    if (!name) return [];
    if (kind === "items") {
      return [`${ASSET}/items/${name}.png`, `${ASSET}/blocks/${name}.png`];
    }
    if (kind === "blocks") {
      return [`${ASSET}/blocks/${name}.png`, `${ASSET}/items/${name}.png`];
    }
    if (kind === "mobs") {
      return [
        `${ASSET}/entity/${name}/${name}.png`,
        `${ASSET}/entity/${name}.png`,
      ];
    }
    return [];
  }

  function imgTag(kind, name, cls) {
    const cands = assetCandidates(kind, name);
    if (!cands.length) return "";
    const first = escapeHtml(cands[0]);
    const rest = escapeHtml(cands.slice(1).join("|"));
    const classAttr = cls ? ` class="${cls}"` : "";
    return `<img${classAttr} src="${first}" data-fallbacks="${rest}" alt="" width="48" height="48" loading="lazy" onerror="window.__mcImgFallback(this)" />`;
  }

  window.__mcImgFallback = function (img) {
    const next = (img.dataset.fallbacks || "").split("|").filter(Boolean);
    if (next.length) {
      img.dataset.fallbacks = next.slice(1).join("|");
      img.src = next[0];
      return;
    }
    img.remove();
  };

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
        return `
        <article class="mc-card" tabindex="0" role="button" data-idx="${i}" style="animation-delay:${Math.min(i, 24) * 20}ms">
          ${imgTag(tab, name)}
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
          .map((r) => {
            const name = r.resultName || r.id;
            return `
          <article class="recipe-block">
            <div style="display:flex;align-items:center;gap:0.75rem">
              ${imgTag("items", name)}
              <div>
                <strong>${escapeHtml(name)}</strong>
                <span class="demo-meta-line"> × ${r.resultCount ?? 1}</span>
              </div>
            </div>
            <pre>${escapeHtml(JSON.stringify(r.raw ?? r, null, 2))}</pre>
          </article>`;
          })
          .join("")}
      </div>`;
  }

  function showItem(it, listUrl) {
    detail.classList.remove("hidden");
    const name = it.name || "";
    detail.innerHTML = `
      <div class="detail-head">
        ${imgTag(tab === "biomes" ? "" : tab, name, "mc")}
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
      tabs.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("active", b.dataset.tab === "recipes")
      );
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
