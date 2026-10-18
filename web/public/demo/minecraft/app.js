(() => {
  // Rå PNG'er via jsDelivr (mcasset.cloud serverer HTML-viewer, ikke image/*)
  const ASSET =
    "https://cdn.jsdelivr.net/gh/PrismarineJS/minecraft-assets@master/data/1.21.4";
  const TEX = {
    item: `${ASSET}/items`,
    block: `${ASSET}/blocks`,
  };

  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const detail = document.getElementById("detail");
  const search = document.getElementById("search");
  const tabs = document.getElementById("tabs");

  let tab = "items";

  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function roundNum(v) {
    if (v == null || v === "") return v;
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    // Undgå 4,333333333333333 i UI
    return Math.round(n * 1000) / 1000;
  }

  function formatMeta(it) {
    if (tab === "blocks") {
      const h = roundNum(it.hardness);
      const dig = it.diggable === false ? "ikke diggable" : "diggable";
      return `hardness ${h ?? "—"} · ${dig}`;
    }
    if (tab === "items") {
      return `stack ${it.stackSize ?? it.stack_size ?? "—"}`;
    }
    if (tab === "mobs") {
      return `${escapeHtml(it.category || "mob")} · ${roundNum(it.width) ?? "?"}×${roundNum(it.height) ?? "?"}`;
    }
    if (tab === "biomes") {
      return `temp ${roundNum(it.temperature) ?? "—"} · rain ${roundNum(it.rainfall) ?? "—"}`;
    }
    return "";
  }

  /** Flere kandidater: item/block + side/front/top-varianter */
  function assetCandidates(kind, name) {
    if (!name || name === "air") return [];
    const n = String(name);
    const blockVariants = [
      `${TEX.block}/${n}.png`,
      `${TEX.block}/${n}_side.png`,
      `${TEX.block}/${n}_front.png`,
      `${TEX.block}/${n}_top.png`,
      `${TEX.block}/${n}_still.png`,
    ];
    const itemVariants = [`${TEX.item}/${n}.png`];

    if (kind === "items") return [...itemVariants, ...blockVariants];
    if (kind === "blocks") return [...blockVariants, ...itemVariants];
    if (kind === "mobs") {
      return [
        `${TEX.item}/${n}_spawn_egg.png`,
        `${TEX.item}/${n}.png`,
      ];
    }
    return itemVariants;
  }

  function imgTag(kind, name, cls) {
    const cands = assetCandidates(kind, name);
    if (!cands.length) {
      return `<div class="mc-ph${cls ? ` ${cls}` : ""}" aria-hidden="true">?</div>`;
    }
    const first = escapeHtml(cands[0]);
    const rest = escapeHtml(cands.slice(1).join("|"));
    const classAttr = cls ? ` class="${cls}"` : "";
    return `<img${classAttr} src="${first}" data-fallbacks="${rest}" alt="" width="48" height="48" loading="lazy" decoding="async" onerror="window.__mcImgFallback(this)" />`;
  }

  window.__mcImgFallback = function (img) {
    const next = (img.dataset.fallbacks || "").split("|").filter(Boolean);
    if (next.length) {
      img.dataset.fallbacks = next.slice(1).join("|");
      img.src = next[0];
      return;
    }
    const ph = document.createElement("div");
    ph.className = "mc-ph";
    ph.setAttribute("aria-hidden", "true");
    ph.textContent = "?";
    img.replaceWith(ph);
  };

  function endpointFor(t, q) {
    if (t === "recipes") {
      if (q) return `/go/minecraft/recipes/${encodeURIComponent(q)}`;
      return `/go/minecraft/recipes?limit=40`;
    }
    const params = new URLSearchParams({ limit: "80" });
    if (q) params.set("q", q);
    // Uden søgning: items ≠ blocks (ellers er første side næsten identisk)
    if (t === "items" && !q) params.set("excludeBlocks", "true");
    return `/go/minecraft/${t}?${params}`;
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
      const label =
        tab === "items" && !q
          ? "inventory-items (uden block-duplikater)"
          : tab;
      status.textContent = Array.isArray(data)
        ? `${data.length} ${label} · klik for detaljer`
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
        const meta = formatMeta(it);
        return `
        <article class="mc-card" tabindex="0" role="button" data-idx="${i}" style="animation-delay:${Math.min(i, 24) * 20}ms">
          ${imgTag(tab, name)}
          <span class="mc-kind">${escapeHtml(tab === "blocks" ? "block" : tab === "items" ? "item" : tab)}</span>
          <h3>${escapeHtml(title)}</h3>
          <p class="sub">${escapeHtml(name)}</p>
          ${meta ? `<p class="mc-meta">${escapeHtml(meta)}</p>` : ""}
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

  function sanitizeDetail(it) {
    const copy = { ...it };
    for (const k of ["hardness", "width", "height", "temperature", "rainfall"]) {
      if (k in copy) copy[k] = roundNum(copy[k]);
    }
    return copy;
  }

  function showItem(it, listUrl) {
    detail.classList.remove("hidden");
    const name = it.name || "";
    const meta = formatMeta(it);
    detail.innerHTML = `
      <div class="detail-head">
        ${imgTag(tab === "biomes" ? "items" : tab, name, "mc")}
        <div>
          <h2>${escapeHtml(it.displayName || name)}</h2>
          <p class="demo-meta-line">${escapeHtml(name)} · id ${it.id ?? "—"}</p>
          ${meta ? `<p class="demo-meta-line">${escapeHtml(meta)}</p>` : ""}
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
      <pre class="demo-json" style="margin-top:1rem;max-height:40vh">${escapeHtml(JSON.stringify(sanitizeDetail(it), null, 2))}</pre>`;

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
