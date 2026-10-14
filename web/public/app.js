(() => {
  const catalog = window.APIER_CATALOG;
  const auth = window.ApierAuth;
  if (!catalog || !auth) return;

  const backendsEl = document.getElementById("backends");
  const filtersEl = document.getElementById("filters");
  const listEl = document.getElementById("endpoints");

  const backendById = Object.fromEntries(catalog.backends.map((b) => [b.id, b]));

  const sourceLabel = {
    json: "JSON-fil",
    mongodb: "MongoDB",
    postgres: "Postgres",
    memory: "Memory",
    runtime: "Runtime",
    docs: "Docs",
  };

  let activeFilter = "all";
  let endpointsBound = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function resolvePath(path) {
    return path
      .replace(/\{region\}/g, "Europe")
      .replace(/\{name\}/g, "Ahri")
      .replace(/\{className\}/g, "Mage")
      .replace(/\{gameName\}/g, "demo")
      .replace(/\{id\}/gi, "1")
      .replace(/\{[^}]+\}/g, "demo");
  }

  function apiBase() {
    return (catalog.host || window.location.origin).replace(/\/$/, "");
  }

  function fullUrl(path) {
    return `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  }

  /* ——— Auth bar ——— */
  const btnLogin = document.getElementById("btnLogin");
  const accountMenu = document.getElementById("accountMenu");
  const btnAccount = document.getElementById("btnAccount");
  const accountDropdown = document.getElementById("accountDropdown");
  const accountName = document.getElementById("accountName");

  function closeAccountMenu() {
    accountDropdown.hidden = true;
    btnAccount.setAttribute("aria-expanded", "false");
  }

  function toggleAccountMenu() {
    const open = accountDropdown.hidden;
    accountDropdown.hidden = !open;
    btnAccount.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderAuthBar() {
    const loggedIn = auth.isLoggedIn();
    const profile = auth.getProfile();

    btnLogin.hidden = loggedIn;
    accountMenu.hidden = !loggedIn;
    closeAccountMenu();
    if (loggedIn) {
      accountName.textContent = profile?.name || profile?.email || "Bruger";
    }
  }

  btnLogin.addEventListener("click", () => auth.beginLogin());
  btnAccount.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAccountMenu();
  });
  document.getElementById("btnLogout").addEventListener("click", () => {
    auth.logoutLocal();
    closeAccountMenu();
    renderAuthBar();
  });
  document.addEventListener("click", (e) => {
    if (!accountMenu.contains(e.target)) closeAccountMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAccountMenu();
  });

  /* ——— Keys drawer ——— */
  const keysDrawer = document.getElementById("keysDrawer");
  const keysBackdrop = document.getElementById("keysBackdrop");

  function openKeys() {
    keysDrawer.classList.add("open");
    keysDrawer.setAttribute("aria-hidden", "false");
    keysBackdrop.hidden = false;
    loadKeys();
  }

  function closeKeys() {
    keysDrawer.classList.remove("open");
    keysDrawer.setAttribute("aria-hidden", "true");
    keysBackdrop.hidden = true;
  }

  document.getElementById("btnKeys").addEventListener("click", () => {
    closeAccountMenu();
    openKeys();
  });
  document.getElementById("keysClose").addEventListener("click", closeKeys);
  keysBackdrop.addEventListener("click", closeKeys);

  async function loadKeys() {
    const list = document.getElementById("keyList");
    list.innerHTML = "<li>Henter…</li>";
    try {
      const res = await auth.apiFetch("/api/ApiKeys");
      if (!res.ok) throw new Error(await res.text());
      const keys = await res.json();
      if (!keys.length) {
        list.innerHTML = "<li class='muted'>Ingen aktive nøgler endnu.</li>";
        return;
      }
      list.innerHTML = keys
        .map(
          (k) => `
        <li>
          <div>
            <strong>${escapeHtml(k.name)}</strong>
            <code>${escapeHtml(k.keyPrefix)}…</code>
            <span class="muted">${new Date(k.createdAt).toLocaleString("da-DK")}</span>
          </div>
          <button type="button" class="btn ghost sm" data-revoke="${escapeHtml(k.id)}">Tilbagekald</button>
        </li>`
        )
        .join("");
      list.querySelectorAll("[data-revoke]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          await auth.apiFetch(`/api/ApiKeys/${btn.dataset.revoke}`, { method: "DELETE" });
          loadKeys();
        });
      });
    } catch (e) {
      list.innerHTML = `<li class="error">${escapeHtml(e.message)}</li>`;
    }
  }

  document.getElementById("btnCreateKey").addEventListener("click", async () => {
    const name = document.getElementById("keyName").value.trim();
    try {
      const res = await auth.apiFetch("/api/ApiKeys", {
        method: "POST",
        body: JSON.stringify({ name: name || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const once = document.getElementById("keyOnce");
      const onceVal = document.getElementById("keyOnceValue");
      once.hidden = false;
      onceVal.textContent = data.key;
      auth.setStoredApiKey(data.key);
      loadKeys();
    } catch (e) {
      alert(e.message || "Kunne ikke oprette nøgle");
    }
  });

  document.getElementById("btnCopyKey").addEventListener("click", async () => {
    const val = document.getElementById("keyOnceValue").textContent;
    try {
      await navigator.clipboard.writeText(val);
      auth.setStoredApiKey(val);
      alert("Kopieret. Nøglen bruges automatisk i live-kald i denne session.");
    } catch {
      auth.setStoredApiKey(val);
      alert("Nøglen er gemt til live-kald i denne session.");
    }
  });

  /* ——— Demo drawer ——— */
  const demoDrawer = document.getElementById("demoDrawer");
  const demoBackdrop = document.getElementById("demoBackdrop");
  const demoTitle = document.getElementById("demoTitle");
  const demoBody = document.getElementById("demoBody");

  const CODE_LANGS = [
    { id: "curl", label: "cURL" },
    { id: "csharp", label: "C#" },
    { id: "js", label: "JavaScript" },
    { id: "python", label: "Python" },
    { id: "go", label: "Go" },
  ];

  function authKind(ep) {
    if (ep.auth === "apiKey") return "apiKey";
    if (ep.auth && String(ep.auth).toLowerCase().includes("jwt")) return "jwt";
    return null;
  }

  function authHeaders(ep, style) {
    const kind = authKind(ep);
    if (kind === "apiKey") {
      if (style === "curl") return [`  -H "X-Api-Key: $API_KEY"`];
      if (style === "obj") return { "X-Api-Key": "YOUR_API_KEY" };
      if (style === "csharp") return `client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);`;
      if (style === "python") return `headers={"X-Api-Key": api_key}`;
      if (style === "go") return `req.Header.Set("X-Api-Key", apiKey)`;
      if (style === "js") return `headers: { "X-Api-Key": apiKey }`;
    }
    if (kind === "jwt") {
      if (style === "curl") return [`  -H "Authorization: Bearer $ACCESS_TOKEN"`];
      if (style === "obj") return { Authorization: "Bearer YOUR_ACCESS_TOKEN" };
      if (style === "csharp")
        return `client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);`;
      if (style === "python") return `headers={"Authorization": f"Bearer {access_token}"}`;
      if (style === "go") return `req.Header.Set("Authorization", "Bearer "+accessToken)`;
      if (style === "js") return `headers: { Authorization: \`Bearer \${accessToken}\` }`;
    }
    return style === "curl" ? [] : style === "obj" ? {} : "";
  }

  function buildSnippets(ep, path) {
    const url = fullUrl(path);
    const method = (ep.method || "GET").toUpperCase();
    const kind = authKind(ep);
    const hasBody = method !== "GET" && method !== "HEAD";

    const curlLines = [`curl -sS -X ${method} "${url}"`, ...authHeaders(ep, "curl")];
    if (hasBody) curlLines.push(`  -H "Content-Type: application/json"`, `  -d '{}'`);

    const csharpAuth = authHeaders(ep, "csharp");
    const csharpVars =
      kind === "apiKey"
        ? `var apiKey = Environment.GetEnvironmentVariable("API_KEY")!;`
        : kind === "jwt"
          ? `var accessToken = Environment.GetEnvironmentVariable("ACCESS_TOKEN")!;`
          : "";
    const csharpCall =
      method === "GET"
        ? "var res = await client.GetAsync(url);"
        : `var res = await client.SendAsync(new HttpRequestMessage(HttpMethod.${method[0] + method.slice(1).toLowerCase()}, url));`;

    const jsHeaders = [];
    if (kind === "apiKey") jsHeaders.push(`    "X-Api-Key": apiKey`);
    if (kind === "jwt") jsHeaders.push(`    Authorization: \`Bearer \${accessToken}\``);
    if (hasBody) jsHeaders.push(`    "Content-Type": "application/json"`);
    const jsHeaderBlock = jsHeaders.length
      ? `,\n  headers: {\n${jsHeaders.join(",\n")}\n  }`
      : "";
    const jsBody = hasBody ? `,\n  body: JSON.stringify({})` : "";
    const jsEnv =
      kind === "apiKey"
        ? `const apiKey = process.env.API_KEY;\n`
        : kind === "jwt"
          ? `const accessToken = process.env.ACCESS_TOKEN;\n`
          : "";

    const pyEnv =
      kind === "apiKey"
        ? `api_key = os.environ["API_KEY"]\n`
        : kind === "jwt"
          ? `access_token = os.environ["ACCESS_TOKEN"]\n`
          : "";
    const pyHeaders = [];
    if (kind === "apiKey") pyHeaders.push(`    "X-Api-Key": api_key`);
    if (kind === "jwt") pyHeaders.push(`    "Authorization": f"Bearer {access_token}"`);
    if (hasBody) pyHeaders.push(`    "Content-Type": "application/json"`);
    const pyHeaderArg = pyHeaders.length ? `,\n    headers={\n${pyHeaders.join(",\n")}\n    }` : "";
    const pyData = hasBody ? `,\n    json={}` : "";

    const goEnv =
      kind === "apiKey"
        ? `\tapiKey := os.Getenv("API_KEY")\n`
        : kind === "jwt"
          ? `\taccessToken := os.Getenv("ACCESS_TOKEN")\n`
          : "";
    const goAuth = authHeaders(ep, "go");

    return {
      curl: curlLines.join(" \\\n"),
      csharp: `${kind === "jwt" ? "using System.Net.Http.Headers;\n\n" : ""}var url = "${url}";
${csharpVars ? csharpVars + "\n" : ""}using var client = new HttpClient();
${csharpAuth ? csharpAuth + "\n" : ""}${csharpCall}
res.EnsureSuccessStatusCode();
var json = await res.Content.ReadAsStringAsync();
Console.WriteLine(json);`,
      js: `${jsEnv}const res = await fetch("${url}", {
  method: "${method}"${jsHeaderBlock}${jsBody}
});
const data = await res.json();
console.log(data);`,
      python: `${kind ? "import os\n" : ""}import requests

url = "${url}"
${pyEnv}res = requests.request(
    "${method}",
    url${pyHeaderArg}${pyData}
)
res.raise_for_status()
print(res.json())`,
      go: `package main

import (
\t"fmt"
\t"io"
\t"net/http"${kind ? `\n\t"os"` : ""}
)

func main() {
${goEnv}\treq, _ := http.NewRequest("${method}", "${url}", nil)
${goAuth ? `\t` + goAuth + `\n` : ""}\tres, err := http.DefaultClient.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer res.Body.Close()
\tbody, _ := io.ReadAll(res.Body)
\tfmt.Println(string(body))
}`,
    };
  }

  function highlight(code, lang) {
    const src = String(code);
    const tokens = [];
    const push = (type, value) => {
      if (!value) return;
      tokens.push({ type, value });
    };

    if (lang === "json") {
      const re =
        /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[{}\[\],]/g;
      let last = 0;
      let m;
      while ((m = re.exec(src))) {
        if (m.index > last) push("plain", src.slice(last, m.index));
        if (m[1] != null && m[2]) {
          push("key", m[1]);
          push("plain", m[2]);
        } else if (m[1] != null) push("str", m[1]);
        else if (m[3]) push("bool", m[3]);
        else if (m[0].match(/^-?\d/)) push("num", m[0]);
        else push("punct", m[0]);
        last = m.index + m[0].length;
      }
      if (last < src.length) push("plain", src.slice(last));
    } else if (lang === "curl") {
      const re =
        /(\\[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(^|\s)(-[A-Za-z]+)|(\$[A-Z_][A-Z0-9_]*)|(https?:\/\/[^\s"']+)/gm;
      let last = 0;
      let m;
      while ((m = re.exec(src))) {
        if (m.index > last) push("plain", src.slice(last, m.index));
        if (m[1]) push("comment", m[1]);
        else if (m[2]) push("str", m[2]);
        else if (m[4]) {
          push("plain", m[3] || "");
          push("flag", m[4]);
        } else if (m[5]) push("var", m[5]);
        else if (m[6]) push("url", m[6]);
        last = m.index + m[0].length;
      }
      if (last < src.length) push("plain", src.slice(last));
    } else {
      const keywords =
        lang === "csharp"
          ? /\b(using|var|new|await|async|return|class|public|static|string|void|namespace|if|else)\b/g
          : lang === "js"
            ? /\b(const|let|var|await|async|function|return|import|from|export|if|else|new)\b/g
            : lang === "python"
              ? /\b(import|from|def|return|print|True|False|None|as|with)\b/g
              : lang === "go"
                ? /\b(package|import|func|return|if|else|defer|var|const|err|nil)\b/g
                : /$a/;
      const re = new RegExp(
        String.raw`(\/\/[^\n]*|#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|` +
          "`(?:\\\\.|[^\\\\`])*`" +
          String.raw`)|(-?\b\d+(?:\.\d+)?\b)|` +
          keywords.source,
        "gm"
      );
      let last = 0;
      let m;
      while ((m = re.exec(src))) {
        if (m.index > last) push("plain", src.slice(last, m.index));
        if (m[1]) push("comment", m[1]);
        else if (m[2]) push("str", m[2]);
        else if (m[3]) push("num", m[3]);
        else push("kw", m[0]);
        last = m.index + m[0].length;
      }
      if (last < src.length) push("plain", src.slice(last));
    }

    return tokens
      .map(({ type, value }) => {
        if (type === "plain") {
          return escapeHtml(value).replace(/\bcurl\b/g, '<span class="tok-kw">curl</span>');
        }
        return `<span class="tok-${type}">${escapeHtml(value)}</span>`;
      })
      .join("");
  }

  function authBannerHtml(ep) {
    const kind = authKind(ep);
    if (!kind) {
      return `<div class="call-auth open"><span class="call-auth-dot"></span> Offentligt endpoint — ingen auth nødvendig</div>`;
    }
    if (kind === "apiKey") {
      const hasKey = !!auth.getStoredApiKey();
      if (hasKey) {
        return `<div class="call-auth ready"><span class="call-auth-dot"></span>
          <div><strong>X-Api-Key</strong> — nøgle klar i denne session
          <p>Eksemplerne bruger <code>$API_KEY</code> / <code>YOUR_API_KEY</code>. Live-kald bruger din gemte nøgle.</p></div>
        </div>`;
      }
      if (auth.isLoggedIn()) {
        return `<div class="call-auth warn"><span class="call-auth-dot"></span>
          <div><strong>Kræver X-Api-Key</strong>
          <p>Opret en nøgle for at køre live-kald. Kode-eksempler viser headeren.</p>
          <button type="button" class="btn primary sm" id="demoOpenKeys">Opret API-nøgle</button></div>
        </div>`;
      }
      return `<div class="call-auth warn"><span class="call-auth-dot"></span>
        <div><strong>Kræver X-Api-Key</strong>
        <p>Log ind og opret en elev-nøgle. Se cURL/C# med auth under Kode.</p>
        <button type="button" class="btn primary sm" id="demoLogin">Log ind</button></div>
      </div>`;
    }
    return `<div class="call-auth warn"><span class="call-auth-dot"></span>
      <div><strong>${escapeHtml(ep.auth)}</strong>
      <p>Eksemplerne viser <code>Authorization: Bearer</code>.</p></div>
    </div>`;
  }

  let demoState = { ep: null, path: "", lang: "curl", snippets: null, live: null };

  function renderCodePanel() {
    const { lang, snippets } = demoState;
    const code = snippets?.[lang] || "";
    const highlightLang = lang === "curl" ? "curl" : lang === "js" ? "js" : lang;
    return `
      <section class="demo-section" aria-labelledby="demoCodeHeading">
        <h3 class="demo-section-title" id="demoCodeHeading">Kode</h3>
        <div class="lang-tabs" role="tablist" aria-label="Sprog">
          ${CODE_LANGS.map(
            (l) =>
              `<button type="button" class="lang-tab${l.id === lang ? " active" : ""}" data-lang="${l.id}" role="tab" aria-selected="${l.id === lang}">${l.label}</button>`
          ).join("")}
        </div>
        <div class="code-frame">
          <div class="code-toolbar">
            <span class="code-lang-label">${escapeHtml(CODE_LANGS.find((l) => l.id === lang)?.label || lang)}</span>
            <button type="button" class="btn ghost sm" id="demoCopyCode">Kopiér</button>
          </div>
          <pre class="code-block" id="demoCode"><code>${highlight(code, highlightLang)}</code></pre>
        </div>
      </section>`;
  }

  function renderLivePanel(ep, path) {
    const canCall = ep.method === "GET" && !ep.path.includes("{");
    const live = demoState.live;
    return `
      <section class="demo-section" aria-labelledby="demoLiveHeading">
        <h3 class="demo-section-title" id="demoLiveHeading">Live svar</h3>
        <div class="live-toolbar">
          <button type="button" class="btn primary" id="demoFetch" ${canCall ? "" : "disabled"}>Kald live</button>
          <a class="btn ghost" href="${escapeHtml(path)}" target="_blank" rel="noreferrer">Åbn i ny fane</a>
        </div>
        ${canCall ? "" : `<p class="drawer-note">Live-kald er kun til GET uden uopløste path-parametre. Brug kode-eksemplerne med de viste værdier.</p>`}
        <div class="live-status${live ? ` ${escapeHtml(live.tone)}` : ""}" id="demoStatus">${live ? escapeHtml(live.status) : "Klar — tryk «Kald live» for svar"}</div>
        <div class="code-frame">
          <div class="code-toolbar">
            <span class="code-lang-label">Response</span>
            <button type="button" class="btn ghost sm" id="demoCopyJson" ${live?.raw ? "" : "hidden"}>Kopiér JSON</button>
          </div>
          <pre class="code-block response" id="demoJson"><code>${
            live?.html || `<span class="tok-comment">// Intet svar endnu</span>`
          }</code></pre>
        </div>
      </section>`;
  }

  function wireDemoPanel(ep, path) {
    document.getElementById("demoLogin")?.addEventListener("click", () => auth.beginLogin());
    document.getElementById("demoOpenKeys")?.addEventListener("click", openKeys);

    demoBody.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        demoState.lang = btn.dataset.lang;
        paintDemoBody(ep, path);
      });
    });

    document.getElementById("demoCopyCode")?.addEventListener("click", async () => {
      const text = demoState.snippets?.[demoState.lang] || "";
      try {
        await navigator.clipboard.writeText(text);
        const b = document.getElementById("demoCopyCode");
        if (b) {
          b.textContent = "Kopieret";
          setTimeout(() => (b.textContent = "Kopiér"), 1200);
        }
      } catch {
        /* ignore */
      }
    });

    document.getElementById("demoFetch")?.addEventListener("click", () => runLiveCall(ep, path));
    document.getElementById("demoCopyPath")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(fullUrl(path));
        const b = document.getElementById("demoCopyPath");
        if (b) {
          b.textContent = "Kopieret";
          setTimeout(() => (b.textContent = "Kopiér URL"), 1200);
        }
      } catch {
        /* ignore */
      }
    });

    const copyJson = document.getElementById("demoCopyJson");
    if (copyJson && demoState.live?.raw) {
      copyJson.onclick = async () => {
        await navigator.clipboard.writeText(demoState.live.raw);
        copyJson.textContent = "Kopieret";
        setTimeout(() => (copyJson.textContent = "Kopiér JSON"), 1200);
      };
    }
  }

  function paintDemoBody(ep, path) {
    const backend = backendById[ep.backend];
    demoBody.innerHTML = `
      <div class="call-hero">
        <div class="demo-meta">
          <span class="method method-${escapeHtml(ep.method.toLowerCase())}">${escapeHtml(ep.method)}</span>
          <code class="path call-path">${escapeHtml(path)}</code>
        </div>
        <button type="button" class="btn ghost sm" id="demoCopyPath">Kopiér URL</button>
      </div>
      <p class="call-summary">${escapeHtml(ep.summary)}</p>
      <div class="tags">
        <span class="tag source-${escapeHtml(ep.source.type)}">${escapeHtml(sourceLabel[ep.source.type] || ep.source.type)}</span>
        <span class="tag backend-${escapeHtml(ep.backend)}">${escapeHtml(backend?.language || "")} · ${escapeHtml(backend?.service || "")}</span>
        ${
          ep.auth === "apiKey"
            ? `<span class="tag auth">X-Api-Key</span>`
            : ep.auth
              ? `<span class="tag auth">${escapeHtml(ep.auth)}</span>`
              : `<span class="tag auth open">Offentlig</span>`
        }
      </div>
      <p class="source-detail">${escapeHtml(ep.source.detail)}</p>
      ${authBannerHtml(ep)}
      <div class="panel-stack">
        ${renderLivePanel(ep, path)}
        ${renderCodePanel()}
      </div>
    `;
    wireDemoPanel(ep, path);
  }

  function openDemo(ep) {
    const path = resolvePath(ep.path);
    demoState = {
      ep,
      path,
      lang: "curl",
      snippets: buildSnippets(ep, path),
      live: null,
    };
    demoTitle.textContent = ep.title;
    paintDemoBody(ep, path);
    demoDrawer.classList.add("open");
    demoDrawer.setAttribute("aria-hidden", "false");
    demoBackdrop.hidden = false;
  }

  function closeDemo() {
    demoDrawer.classList.remove("open");
    demoDrawer.setAttribute("aria-hidden", "true");
    demoBackdrop.hidden = true;
  }

  document.getElementById("demoClose").addEventListener("click", closeDemo);
  demoBackdrop.addEventListener("click", closeDemo);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && demoDrawer.classList.contains("open")) closeDemo();
  });

  function trimDemo(data) {
    if (Array.isArray(data)) {
      const slice = data.slice(0, 3);
      return {
        _demo: `Viser ${slice.length} af ${data.length} elementer`,
        items: slice,
      };
    }
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      if (keys.length > 12) {
        const slim = {};
        keys.slice(0, 12).forEach((k) => (slim[k] = data[k]));
        slim._truncated = true;
        return slim;
      }
    }
    return data;
  }

  function applyLiveView() {
    const status = document.getElementById("demoStatus");
    const pre = document.getElementById("demoJson");
    const copyBtn = document.getElementById("demoCopyJson");
    const live = demoState.live;
    if (!status || !pre || !live) return;
    status.textContent = live.status;
    status.className = `live-status ${live.tone}`;
    pre.innerHTML = `<code>${live.html}</code>`;
    if (copyBtn) {
      copyBtn.hidden = !live.raw;
      copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(live.raw);
        copyBtn.textContent = "Kopieret";
        setTimeout(() => (copyBtn.textContent = "Kopiér JSON"), 1200);
      };
    }
  }

  async function runLiveCall(ep, path) {
    demoState.live = {
      status: "Henter…",
      tone: "pending",
      html: `<span class="tok-comment">// Henter…</span>`,
      raw: "",
    };
    applyLiveView();

    const headers = {};
    if (ep.auth === "apiKey") {
      const key = auth.getStoredApiKey();
      if (!key) {
        demoState.live = {
          status: "Mangler API-nøgle — opret under din konto",
          tone: "error",
          html: `<span class="tok-comment">// 401 — autentificér først</span>`,
          raw: "",
        };
        applyLiveView();
        return;
      }
      headers["X-Api-Key"] = key;
    }

    try {
      const res = await fetch(path, { headers });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      const ct = res.headers.get("content-type") || "svar";
      const demo = typeof parsed === "string" ? parsed.slice(0, 2000) : trimDemo(parsed);
      const raw = typeof demo === "string" ? demo : JSON.stringify(demo, null, 2);
      const asJson =
        typeof demo !== "string" || raw.trim().startsWith("{") || raw.trim().startsWith("[");
      demoState.live = {
        status: `${res.status} · ${ct}`,
        tone: res.ok ? "ok" : "error",
        html: highlight(raw, asJson ? "json" : "curl"),
        raw,
      };
      applyLiveView();
    } catch (e) {
      demoState.live = {
        status: "Netværksfejl",
        tone: "error",
        html: `<span class="tok-str">${escapeHtml(e.message || String(e))}</span>`,
        raw: "",
      };
      applyLiveView();
    }
  }

  /* ——— Catalog ——— */
  function renderBackends() {
    backendsEl.innerHTML = catalog.backends
      .map(
        (b, i) => `
      <article class="backend-card" style="animation-delay:${i * 60}ms">
        <h3>${escapeHtml(b.name)}</h3>
        <div class="backend-meta">
          <span class="chip lang">${escapeHtml(b.language)}</span>
          <span class="chip service">${escapeHtml(b.service)}</span>
        </div>
        <p>${escapeHtml(b.description)}</p>
      </article>`
      )
      .join("");
  }

  const categoryById = Object.fromEntries((catalog.categories || []).map((c) => [c.id, c]));

  function renderFilters() {
    const sources = [...new Set(catalog.endpoints.map((e) => e.source.type))];
    const catButtons = (catalog.categories || []).map((c) => ({
      id: `category:${c.id}`,
      label: c.title,
    }));
    const buttons = [
      { id: "all", label: "Alle" },
      ...catButtons,
      ...catalog.backends.map((b) => ({ id: `backend:${b.id}`, label: b.language })),
      ...sources.map((s) => ({ id: `source:${s}`, label: sourceLabel[s] || s })),
    ];

    filtersEl.innerHTML = buttons
      .map(
        (b) =>
          `<button type="button" class="filter-btn${b.id === activeFilter ? " active" : ""}" data-filter="${escapeHtml(b.id)}">${escapeHtml(b.label)}</button>`
      )
      .join("");

    filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        renderFilters();
        renderEndpoints();
      });
    });
  }

  function matchesFilter(ep) {
    if (activeFilter === "all") return true;
    if (activeFilter.startsWith("category:")) {
      return (ep.category || "platform") === activeFilter.slice("category:".length);
    }
    if (activeFilter.startsWith("backend:")) {
      return ep.backend === activeFilter.slice("backend:".length);
    }
    if (activeFilter.startsWith("source:")) {
      return ep.source.type === activeFilter.slice("source:".length);
    }
    return true;
  }

  function endpointCardHtml(ep, i) {
    const backend = backendById[ep.backend];
    return `
        <article class="endpoint" tabindex="0" role="button" data-idx="${i}" style="animation-delay:${Math.min(i, 12) * 40}ms">
          <div class="endpoint-top">
            <span class="method">${escapeHtml(ep.method)}</span>
            <span class="path">${escapeHtml(ep.path)}</span>
          </div>
          <h3>${escapeHtml(ep.title)}</h3>
          <p class="summary">${escapeHtml(ep.summary)}</p>
          <div class="tags">
            <span class="tag source-${escapeHtml(ep.source.type)}">${escapeHtml(sourceLabel[ep.source.type] || ep.source.type)}</span>
            <span class="tag backend-${escapeHtml(ep.backend)}">${escapeHtml(backend?.language || ep.backend)} · ${escapeHtml(backend?.service || "")}</span>
            ${ep.auth === "apiKey" ? `<span class="tag auth">API-nøgle</span>` : ep.auth ? `<span class="tag auth">${escapeHtml(ep.auth)}</span>` : ""}
          </div>
          <p class="source-detail">${escapeHtml(ep.source.detail)}</p>
        </article>`;
  }

  function renderEndpoints() {
    endpointsBound = catalog.endpoints.filter(matchesFilter);

    const categoryOrder = (catalog.categories || []).map((c) => c.id);
    const groups = new Map();
    for (const ep of endpointsBound) {
      const id = ep.category || "platform";
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(ep);
    }

    const orderedIds = [
      ...categoryOrder.filter((id) => groups.has(id)),
      ...[...groups.keys()].filter((id) => !categoryOrder.includes(id)),
    ];

    // Flat index map for openDemo (data-idx → endpointsBound)
    const indexByEp = new Map(endpointsBound.map((ep, i) => [ep, i]));

    listEl.innerHTML = orderedIds
      .map((catId) => {
        const meta = categoryById[catId] || {
          title: catId,
          description: "",
        };
        const eps = groups.get(catId) || [];
        return `
        <section class="endpoint-category" id="cat-${escapeHtml(catId)}" aria-labelledby="cat-title-${escapeHtml(catId)}">
          <header class="category-head">
            <h3 id="cat-title-${escapeHtml(catId)}">${escapeHtml(meta.title)}</h3>
            ${meta.description ? `<p>${escapeHtml(meta.description)}</p>` : ""}
            <span class="category-count">${eps.length} endpoint${eps.length === 1 ? "" : "s"}</span>
          </header>
          <div class="category-endpoints">
            ${eps.map((ep) => endpointCardHtml(ep, indexByEp.get(ep))).join("")}
          </div>
        </section>`;
      })
      .join("");

    listEl.querySelectorAll(".endpoint").forEach((el) => {
      const open = () => openDemo(endpointsBound[Number(el.dataset.idx)]);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open();
        }
      });
    });
  }

  renderAuthBar();
  renderBackends();
  renderFilters();
  renderEndpoints();
})();
