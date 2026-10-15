(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, prefersReduced ? 0 : ms));
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  /* ——— Client ↔ Server HTTP simulator ——— */
  function initHttpSim(root) {
    const scenarios = {
      get: {
        method: "GET",
        path: "/go/pokemon?limit=3",
        reqLabel: "GET",
        resLabel: "200 OK",
        ok: true,
        body: '[{"name":"bulbasaur"},{"name":"ivysaur"},{"name":"venusaur"}]',
      },
      post: {
        method: "POST",
        path: "/api/keys",
        reqLabel: "POST",
        resLabel: "201 Created",
        ok: true,
        body: '{"id":"…","hint":"gem nøglen nu"}',
      },
      fail: {
        method: "GET",
        path: "/LeagueOfLegends/Champions",
        reqLabel: "GET",
        resLabel: "401",
        ok: false,
        body: '{"error":"Mangler X-Api-Key"}',
      },
    };

    let busy = false;
    let mode = "get";

    const stage = root.querySelector(".cs-stage");
    const client = root.querySelector('[data-role="client"]');
    const server = root.querySelector('[data-role="server"]');
    const wire = root.querySelector(".cs-wire");
    const packet = root.querySelector(".cs-packet");
    const logEl = root.querySelector(".cs-log");
    const playBtn = root.querySelector('[data-action="play"]');
    const vertical = () => window.matchMedia("(max-width: 640px)").matches;

    root.querySelectorAll("[data-scenario]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (busy) return;
        mode = btn.dataset.scenario;
        root.querySelectorAll("[data-scenario]").forEach((b) => b.classList.toggle("active", b === btn));
        logEl.innerHTML = `<span class="tok-dim"># Vælg «Afspil» for at sende ${escapeHtml(scenarios[mode].method)} ${escapeHtml(scenarios[mode].path)}</span>`;
      });
    });

    async function fly(fromPct, toPct, label, kind) {
      packet.textContent = label;
      packet.className = `cs-packet ${kind}`;
      if (vertical()) {
        packet.style.left = "50%";
        packet.style.top = `${fromPct}%`;
        packet.style.opacity = "1";
        packet.classList.add("fly");
        await sleep(30);
        packet.style.top = `${toPct}%`;
      } else {
        packet.style.top = "50%";
        packet.style.left = `${fromPct}%`;
        packet.style.opacity = "1";
        packet.classList.add("fly");
        await sleep(30);
        packet.style.left = `${toPct}%`;
      }
      await sleep(prefersReduced ? 50 : 1100);
    }

    async function play() {
      if (busy) return;
      busy = true;
      playBtn.disabled = true;
      const s = scenarios[mode];
      client.classList.remove("active");
      server.classList.remove("active");
      packet.className = "cs-packet";
      packet.style.opacity = "0";

      logEl.innerHTML = `<span class="tok-dim"># Klient forbereder request…</span>`;
      client.classList.add("active");
      await sleep(400);

      logEl.innerHTML = `<span class="tok-method">${escapeHtml(s.method)}</span> ${escapeHtml(s.path)}\n<span class="tok-dim">Host: api-opgaver.mercantec.tech</span>${
        mode === "fail" ? `\n<span class="tok-dim"># ingen X-Api-Key</span>` : ""
      }`;
      await fly(vertical() ? 8 : 8, vertical() ? 92 : 92, s.reqLabel, "req");

      client.classList.remove("active");
      server.classList.add("active");
      logEl.innerHTML += `\n<span class="tok-dim"># Server behandler…</span>`;
      await sleep(500);

      const resKind = s.ok ? "res" : "err";
      const statusClass = s.ok ? "tok-ok" : "tok-err";
      await fly(vertical() ? 92 : 92, vertical() ? 8 : 8, s.resLabel, resKind);

      server.classList.remove("active");
      client.classList.add("active");
      logEl.innerHTML = `<span class="${statusClass}">HTTP/1.1 ${escapeHtml(s.resLabel)}</span>\ncontent-type: application/json\n\n${escapeHtml(s.body)}`;
      await sleep(600);
      client.classList.remove("active");
      packet.style.opacity = "0";
      packet.classList.remove("fly");
      busy = false;
      playBtn.disabled = false;
    }

    playBtn.addEventListener("click", play);
    // Keep packet on wire for layout
    void stage;
    void wire;
  }

  /* ——— Hosting mode animation ——— */
  function initHosting(root) {
    const caption = root.querySelector(".host-caption");
    const canvas = root.querySelector(".host-canvas");
    const flow = root.querySelector(".host-flow");
    const captions = {
      server:
        "Blazor Server: hvert klik sendes til serveren over SignalR. UI-logikken bor på serveren — lille download, kræver forbindelse.",
      wasm: "Blazor WASM: først downloades .NET + app til browseren. Bagefter kører UI lokalt — API-kald er separate HTTP-requests.",
    };

    let timer = null;
    let mode = "server";

    function clearDots() {
      flow.querySelectorAll(".host-dot").forEach((d) => d.remove());
    }

    function pulse(from, to, color) {
      if (prefersReduced) return;
      const dot = document.createElement("span");
      dot.className = "host-dot";
      dot.style.background = color;
      dot.style.boxShadow = `0 0 12px ${color}`;
      flow.appendChild(dot);
      const start = from;
      const end = to;
      let t0 = null;
      const dur = 900;
      function frame(ts) {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const ease = 1 - Math.pow(1 - p, 3);
        dot.style.left = `${start + (end - start) * ease}%`;
        dot.style.opacity = p < 0.1 ? p * 10 : p > 0.85 ? (1 - p) * 6.5 : 1;
        if (p < 1) requestAnimationFrame(frame);
        else dot.remove();
      }
      requestAnimationFrame(frame);
    }

    function runLoop() {
      clearInterval(timer);
      clearDots();
      if (mode === "server") {
        // continuous chatter client <-> server
        timer = setInterval(() => {
          pulse(12, 88, "#3dd6c6");
          setTimeout(() => pulse(88, 12, "#60a5fa"), 450);
        }, prefersReduced ? 99999 : 1400);
        if (!prefersReduced) {
          pulse(12, 88, "#3dd6c6");
          setTimeout(() => pulse(88, 12, "#60a5fa"), 450);
        }
      } else {
        // one big download, then small local pulses
        pulse(88, 12, "#a78bfa");
        setTimeout(() => {
          if (mode !== "wasm") return;
          timer = setInterval(() => {
            pulse(18, 35, "#60a5fa");
          }, prefersReduced ? 99999 : 1100);
        }, 1000);
      }
    }

    root.querySelectorAll("[data-host]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.host;
        root.querySelectorAll("[data-host]").forEach((b) => b.classList.toggle("active", b === btn));
        canvas.classList.toggle("host-mode-server", mode === "server");
        canvas.classList.toggle("host-mode-wasm", mode === "wasm");
        caption.textContent = captions[mode];
        runLoop();
      });
    });

    canvas.classList.add("host-mode-server");
    caption.textContent = captions.server;
    runLoop();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInterval(timer);
      else runLoop();
    });
  }

  /* ——— SPA routing preview ——— */
  function initSpa(root) {
    const panels = [...root.querySelectorAll(".spa-panel")];
    const tabs = [...root.querySelectorAll("[data-route]")];
    const note = root.querySelector(".spa-note");
    const notes = {
      home: "Samme shell (layout/nav) — kun midterindholdet skifter. Ingen fuld page-reload.",
      pokemon: "Route /pokemon → komponent med @page. HttpClient henter data når siden aktiveres.",
      api: "Route /status → ny «side», stadig samme Blazor-app i hukommelsen.",
    };

    function show(id) {
      tabs.forEach((t) => t.classList.toggle("active", t.dataset.route === id));
      panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === id));
      if (note) note.textContent = notes[id] || "";
    }

    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.route)));
    show("home");
  }

  /* ——— Quiz ——— */
  function initQuiz(root) {
    const correct = Number(root.dataset.correct ?? "0");
    const feedback = root.querySelector(".quiz-feedback");
    const buttons = [...root.querySelectorAll(".quiz-options button")];
    let locked = false;
    const letters = ["A", "B", "C", "D"];

    buttons.forEach((btn, i) => {
      if (!btn.querySelector(".quiz-letter")) {
        const letter = document.createElement("span");
        letter.className = "quiz-letter";
        letter.textContent = letters[i] || String(i + 1);
        btn.prepend(letter);
      }
      btn.addEventListener("click", () => {
        if (locked) return;
        locked = true;
        const ok = i === correct;
        buttons.forEach((b, j) => {
          b.classList.toggle("is-correct", j === correct);
          b.classList.toggle("is-wrong", j === i && !ok);
          b.disabled = true;
        });
        root.classList.add(ok ? "quiz-passed" : "quiz-failed");
        if (feedback) {
          feedback.className = `quiz-feedback ${ok ? "ok" : "bad"}`;
          feedback.textContent = ok
            ? root.dataset.ok || "Korrekt — godt set."
            : root.dataset.bad || "Ikke helt — den grønne mulighed er den rigtige. Læs forklaringen i lektionen igen.";
        }
      });
    });
  }

  /* ——— @bind lab ——— */
  function initBindLab(root) {
    const input = root.querySelector("[data-bind-input]");
    let out = root.querySelector(".bind-preview") || root.querySelector("[data-bind-out]");
    if (!input) return;

    if (!out) {
      out = document.createElement("strong");
      out.className = "bind-preview";
      root.appendChild(out);
    }

    let code = root.querySelector("[data-bind-code]");
    if (!code) {
      code = document.createElement("pre");
      code.className = "bind-code";
      code.setAttribute("data-bind-code", "");
      root.appendChild(code);
    }

    const sync = () => {
      const v = input.value.trim() || "Ash";
      out.textContent = v;
      code.textContent =
        `<input @bind=\"Name\" @bind:event=\"oninput\" />\n` +
        `<p>Hej, <strong>@Name</strong> — klar til Pokémon-søgning?</p>\n\n` +
        `// Name = \"${v.replaceAll('"', '\\"')}\"  ← opdateres ved hvert tastetryk`;
    };
    input.addEventListener("input", sync);
    sync();
  }

  /* ——— Lifecycle stepper ——— */
  function initLifecycle(root) {
    const order = ["init", "params", "render", "event", "dispose"];
    const logs = {
      init: "# OnInitializedAsync()\n# Første load — hent starters via HttpClient.\nmons = await Api.GetStarterAsync();",
      params:
        "# OnParametersSetAsync()\n# Parent/route skiftede Id.\nchamp = await Lol.GetChampionAsync(Id);",
      event:
        "# @onclick handler\npage++;\nawait LoadPage();\n# StateHasChanged kører automatisk efter event.",
      reset: "# Log nulstillet — prøv Afspil livscyklus.",
      render: "# Render\n# BuildRenderTree → DOM opdateres ud fra state.",
      dispose: "# Dispose / IAsyncDisposable\n# Stop timers, unsubscribe events.",
    };
    const log = root.querySelector(".life-log");
    const steps = [...root.querySelectorAll(".life-steps [data-step], .life-steps li")];
    let busy = false;

    function highlight(key) {
      const keyIdx = order.indexOf(key);
      steps.forEach((li) => {
        const id = li.dataset.step || "";
        const idx = order.indexOf(id);
        li.classList.toggle("active", id === key);
        li.classList.toggle("done", idx >= 0 && keyIdx >= 0 && idx < keyIdx);
      });
    }

    function show(key) {
      root.querySelectorAll("[data-life-step]").forEach((b) =>
        b.classList.toggle("active", b.dataset.lifeStep === key)
      );
      highlight(key);
      if (log) log.textContent = logs[key] || `# ${key}`;
    }

    root.querySelectorAll("[data-life-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (busy) return;
        const key = btn.dataset.lifeStep;
        if (key === "reset") {
          if (log) log.innerHTML = `<span class="tok-dim">${escapeHtml(logs.reset)}</span>`;
          steps.forEach((li) => li.classList.remove("active", "done"));
          return;
        }
        show(key);
      });
    });

    // Autoplay control (inject if missing)
    let play = root.querySelector('[data-action="life-play"]');
    if (!play) {
      play = document.createElement("button");
      play.type = "button";
      play.className = "btn primary sm";
      play.dataset.action = "life-play";
      play.textContent = "Afspil livscyklus";
      root.querySelector(".teori-anim-controls")?.appendChild(play);
    }

    play?.addEventListener("click", async () => {
      if (busy) return;
      busy = true;
      play.disabled = true;
      steps.forEach((li) => li.classList.remove("active", "done"));
      for (const key of order) {
        show(key);
        await sleep(900);
      }
      busy = false;
      play.disabled = false;
    });
  }

  /* ——— DI lifetimes ——— */
  function initDiLab(root) {
    let mode = "transient";
    let scopedId = null;
    const singletonId = Math.floor(Math.random() * 900) + 100;
    const log = root.querySelector(".di-log");

    let slots = root.querySelector(".di-slots");
    if (!slots) {
      slots = document.createElement("div");
      slots.className = "di-slots";
      slots.innerHTML = [1, 2, 3]
        .map(
          (n) =>
            `<div class="di-slot" data-slot="${n}"><span class="di-slot-label">Resolve ${n}</span><span class="di-slot-id">—</span></div>`
        )
        .join("");
      log?.before(slots);
    }

    const tip = root.querySelector(".di-tip") || (() => {
      const el = document.createElement("p");
      el.className = "di-tip";
      log?.after(el);
      return el;
    })();

    const tips = {
      transient: "Transient: tre forskellige id’er — ny instans hver resolve. Godt til stateless helpers.",
      scoped: "Scoped: samme id inden for circuit/request. Pas på: del ikke brugerdata som Singleton.",
      singleton: "Singleton: samme id for hele app-livet. Kun til thread-safe, delt read-only state.",
    };

    root.querySelectorAll("[data-di]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.di;
        root.querySelectorAll("[data-di]").forEach((b) => b.classList.toggle("active", b === btn));
        if (log) {
          log.innerHTML = `<span class="tok-dim"># Mode: ${escapeHtml(mode)} — tryk Anmod ×3</span>`;
        }
        slots.querySelectorAll(".di-slot-id").forEach((el) => {
          el.textContent = "—";
          el.classList.remove("same", "diff");
        });
        if (tip) tip.textContent = tips[mode] || "";
      });
    });

    root.querySelector('[data-action="resolve"]')?.addEventListener("click", async () => {
      const ids = [];
      for (let i = 1; i <= 3; i++) {
        let id;
        if (mode === "transient") id = Math.floor(Math.random() * 900) + 100;
        else if (mode === "singleton") id = singletonId;
        else {
          if (scopedId == null) scopedId = Math.floor(Math.random() * 900) + 100;
          id = scopedId;
        }
        ids.push(id);
        const slot = slots.querySelector(`[data-slot="${i}"] .di-slot-id`);
        if (slot) {
          slot.textContent = `#${id}`;
          slot.classList.add("pop");
          await sleep(220);
          slot.classList.remove("pop");
        }
      }
      const allSame = ids.every((x) => x === ids[0]);
      slots.querySelectorAll(".di-slot-id").forEach((el) => {
        el.classList.toggle("same", allSame);
        el.classList.toggle("diff", !allSame);
      });
      if (mode === "scoped") scopedId = null;
      if (log) {
        log.textContent = ids.map((id, i) => `Anmod ${i + 1}: ${mode} → instance #${id}`).join("\n");
      }
      if (tip) tip.textContent = tips[mode] || "";
    });

    if (tip) tip.textContent = tips.transient;
  }

  /* ——— EditForm lab ——— */
  function initFormLab(root) {
    const form = root.querySelector("form");
    const input = root.querySelector('input[name="query"], [data-form-input]');
    const msg = root.querySelector(".form-lab-msg") || root.querySelector(".form-err");
    if (!form && !input) return;

    const submit = (e) => {
      e?.preventDefault?.();
      const v = (input?.value || "").trim();
      const valid = v.length >= 2;
      input?.classList.toggle("is-invalid", !valid);
      if (!msg) return;
      if (!valid) {
        msg.className = (msg.className.includes("form-lab") ? "form-lab-msg" : "form-err") + " bad";
        msg.style.color = "#f47272";
        msg.textContent = "Validation: MinLength(2) — OnInvalidSubmit.";
      } else {
        msg.style.color = "#3dd6c6";
        msg.textContent = `OnValidSubmit → GET /go/pokemon?name=${encodeURIComponent(v)}`;
      }
    };

    form?.addEventListener("submit", submit);
    root.querySelector("[data-form-submit]")?.addEventListener("click", submit);
  }

  /* ——— Async timeline ——— */
  function initAsyncLab(root) {
    const steps = [...root.querySelectorAll("[data-async-step]")];
    const playBtn =
      root.querySelector('[data-action="play"]') || root.querySelector('[data-action="async-play"]');

    async function play() {
      steps.forEach((s) => s.classList.remove("active", "done"));
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add("active");
        if (i > 0) steps[i - 1].classList.add("done");
        await sleep(650);
      }
      steps.forEach((s) => {
        s.classList.remove("active");
        s.classList.add("done");
      });
    }

    playBtn?.addEventListener("click", play);
  }

  /* ——— XSS lab ——— */
  function initXssLab(root) {
    const input = root.querySelector("[data-xss-input]");
    const out = root.querySelector(".xss-output");
    let mode = "encode";

    function render() {
      const v = input?.value || "";
      if (!out) return;
      if (mode === "encode") {
        out.innerHTML = "";
        out.textContent = v;
        out.style.color = "#3dd6c6";
      } else {
        out.style.color = "#f47272";
        out.innerHTML = v; // intentional demo of unsafe HTML
      }
    }

    root.querySelectorAll("[data-xss-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.xssMode;
        root.querySelectorAll("[data-xss-mode]").forEach((b) => b.classList.toggle("active", b === btn));
        render();
      });
    });
    input?.addEventListener("input", render);
    render();
  }

  /* ——— File tree ——— */
  function initFileTree(root) {
    const detail = root.querySelector(".tree-detail");
    const buttons = [...root.querySelectorAll("[data-file], [data-tree]")];
    const info = {
      program: {
        title: "Program.cs",
        body: "Composition root: DI, middleware, MapRazorComponents. Registrér HttpClient til OpgaverAPI her.",
      },
      appsettings: {
        title: "appsettings.json",
        body: "Konfiguration — BaseUrl, logging. Secrets i User Secrets / env, ikke i git.",
      },
      apprazor: {
        title: "Components/App.razor",
        body: "Rod: Router + HeadOutlet. Binder Routes og layouts sammen.",
      },
      routes: {
        title: "Components/Routes.razor",
        body: "Router-konfiguration: found / not-found templates.",
      },
      layout: {
        title: "MainLayout.razor",
        body: "Fælles chrome (nav, footer) omkring @Body — jeres SPA-shell.",
      },
      pages: {
        title: "Components/Pages/",
        body: "Sider med @page \"/sti\". Det er jeres routes mod Pokémon, LoL, osv.",
      },
      wwwroot: {
        title: "wwwroot/",
        body: "Statiske assets: CSS, favicon, billeder. Served direkte.",
      },
      docker: {
        title: "Dockerfile",
        body: "Multi-stage build til Dokploy. Samme vane som OpgaverAPI-web.",
      },
      app: {
        title: "App.razor",
        body: "Rod-komponent for routing.",
      },
      css: {
        title: "CSS",
        body: "Global i wwwroot; scoped som Component.razor.css.",
      },
    };

    function show(key) {
      buttons.forEach((b) => {
        const k = b.dataset.file || b.dataset.tree;
        b.classList.toggle("active", k === key);
      });
      const d = info[key];
      if (detail && d) {
        detail.innerHTML = `<strong>${escapeHtml(d.title)}</strong><p>${escapeHtml(d.body)}</p>`;
      }
    }

    buttons.forEach((b) =>
      b.addEventListener("click", () => show(b.dataset.file || b.dataset.tree))
    );
  }

  /* ——— HTTP status explorer ——— */
  function initStatusLab(root) {
    const detail = root.querySelector(".status-detail");
    const map = {
      "200": {
        title: "200 OK",
        body: "Succes. Deserialisér JSON til DTO — fx List&lt;PokeDto&gt;. Vis listen i UI.",
      },
      "201": {
        title: "201 Created",
        body: "Ressource oprettet (fx API-nøgle). Læs Location/body; gem tip ét sted — ikke i git.",
      },
      "204": {
        title: "204 No Content",
        body: "OK uden body. Brug SendAsync — GetFromJsonAsync fejler på tom body.",
      },
      "401": {
        title: "401 Unauthorized",
        body: "Mangler X-Api-Key eller Bearer. Vis «log ind / opret nøgle» — ikke blind retry.",
      },
      "404": {
        title: "404 Not Found",
        body: "Forkert path eller id. Tjek BaseAddress + relative URL i Network-fanen.",
      },
      "503": {
        title: "503 Service Unavailable",
        body: "Nedetid/gateway. Kort besked + manuel retry. Parse ProblemDetails.title hvis muligt.",
      },
    };

    root.querySelectorAll("[data-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-status]").forEach((b) => b.classList.toggle("active", b === btn));
        const d = map[btn.dataset.status];
        if (detail && d) {
          detail.innerHTML = `<strong>${d.title}</strong><p>${d.body}</p>`;
        }
      });
    });
    root.querySelector('[data-status="200"]')?.click();
  }

  /* ——— PKCE step lab ——— */
  function initPkceLab(root) {
    const steps = [
      {
        t: "1 · PKCE challenge",
        l: "# Generér code_verifier (random)\n# code_challenge = BASE64URL(SHA256(verifier))\n# Gem verifier + state i sessionStorage",
      },
      {
        t: "2 · Authorize",
        l: "# Fuld browser-navigation til\n# auth.mercantec.tech/oauth/authorize\n# ?client_id=…&code_challenge=…&state=…\n# (ikke fetch — redirect)",
      },
      {
        t: "3 · Callback",
        l: "# App modtager ?code=&state=\n# Validér state == sessionStorage\n# Ellers: stop (CSRF)",
      },
      {
        t: "4 · Token",
        l: "# POST /oauth/token\n# code + code_verifier\n# Gem access (+ refresh) i sessionStorage\n# Ryd midlertidig PKCE-state",
      },
      {
        t: "5 · API-kald",
        l: "# Authorization: Bearer <access>\n# Ved 401: ét refresh-forsøg, gem nyt token\n# Logout = ryd lokalt — ikke /signout",
      },
    ];
    const log = root.querySelector(".pkce-log");
    const label = root.querySelector(".pkce-step-label");
    const dots = root.querySelector(".pkce-dots");
    let i = 0;

    function paint() {
      const s = steps[i];
      if (label) label.textContent = s.t;
      if (log) log.textContent = s.l;
      if (dots) {
        dots.querySelectorAll("button").forEach((b, j) => {
          b.classList.toggle("active", j === i);
          b.classList.toggle("done", j < i);
        });
      }
    }

    if (dots && !dots.children.length) {
      steps.forEach((_, j) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", `Trin ${j + 1}`);
        b.addEventListener("click", () => {
          i = j;
          paint();
        });
        dots.appendChild(b);
      });
    }

    root.querySelector('[data-action="pkce-next"]')?.addEventListener("click", () => {
      i = Math.min(i + 1, steps.length - 1);
      paint();
    });
    root.querySelector('[data-action="pkce-prev"]')?.addEventListener("click", () => {
      i = Math.max(i - 1, 0);
      paint();
    });
    root.querySelector('[data-action="pkce-play"]')?.addEventListener("click", async () => {
      for (let j = 0; j < steps.length; j++) {
        i = j;
        paint();
        await sleep(850);
      }
    });
    paint();
  }

  /* ——— EventCallback flow ——— */
  function initEventFlow(root) {
    const log = root.querySelector(".event-flow-log");
    const parent = root.querySelector("[data-flow='parent']");
    const child = root.querySelector("[data-flow='child']");
    const arrow = root.querySelector(".event-flow-arrow");

    async function run() {
      parent?.classList.remove("flash");
      child?.classList.remove("flash");
      if (log) log.textContent = "# Bruger klikker PokemonCard…";
      child?.classList.add("flash");
      await sleep(500);
      if (log) log.textContent = "# child: await Selected.InvokeAsync(Id)";
      if (arrow) {
        arrow.classList.add("pulse");
        arrow.textContent = "EventCallback ↑";
      }
      await sleep(700);
      child?.classList.remove("flash");
      parent?.classList.add("flash");
      if (log) log.textContent = "# parent OnPick(id) → selectedId = id → render detail";
      await sleep(900);
      parent?.classList.remove("flash");
      if (arrow) {
        arrow.classList.remove("pulse");
        arrow.textContent = "parametre ↓";
      }
      if (log) log.textContent = "# Klar — parent ejer state, child er dum UI.";
    }

    root.querySelector('[data-action="flow-play"]')?.addEventListener("click", run);
    child?.addEventListener("click", run);
  }

  /* ——— Query string lab ——— */
  function initQueryLab(root) {
    const input = root.querySelector("[data-query-input]");
    const out = root.querySelector("[data-query-out]");
    const code = root.querySelector("[data-query-code]");

    function sync() {
      const q = (input?.value || "").trim() || "pikachu";
      const url = `/pokemon?name=${encodeURIComponent(q)}`;
      if (out) out.textContent = url;
      if (code) {
        code.textContent =
          `@page "/pokemon"\n` +
          `@inject NavigationManager Nav\n\n` +
          `// Nav.Uri → …${url}\n` +
          `// QueryHelpers.ParseQuery(uri.Query)["name"] → "${q}"\n` +
          `// OnParametersSetAsync: hent /go/pokemon?name=${q}`;
      }
    }

    input?.addEventListener("input", sync);
    sync();
  }

  /* ——— Side TOC layout + scroll-spy ——— */
  function ensureLessonSidebar() {
    document.querySelectorAll(".teori-lesson").forEach((lesson) => {
      const shell = lesson.closest(".demo-shell");
      // unwrap ældre to-kolonne-wrap
      const main = lesson.querySelector(":scope > .teori-lesson-main");
      if (main) {
        while (main.firstChild) lesson.appendChild(main.firstChild);
        main.remove();
      }
      const toc =
        lesson.querySelector(":scope > .teori-toc") ||
        (lesson.previousElementSibling?.classList?.contains("teori-toc")
          ? lesson.previousElementSibling
          : null);
      if (!toc || !shell) return;
      // TOC uden for article — fylder ikke i pensum-kolonnen
      if (toc.parentElement === lesson) {
        shell.insertBefore(toc, lesson);
      }
    });
  }

  function initTocSpy() {
    ensureLessonSidebar();
    const toc = document.querySelector(".teori-toc");
    if (!toc) return;
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    if (!links.length) return;

    const sections = links
      .map((a) => {
        const id = decodeURIComponent(a.getAttribute("href").slice(1));
        const el = document.getElementById(id);
        return el ? { a, el } : null;
      })
      .filter(Boolean);

    function setActive(active) {
      links.forEach((a) => a.classList.toggle("is-active", a === active));
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const hit = sections.find((s) => s.el === visible[0].target);
        if (hit) setActive(hit.a);
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.2, 0.6] }
    );

    sections.forEach(({ el }) => obs.observe(el));
    if (sections[0]) setActive(sections[0].a);
  }

  /* ——— Reveal / flip facts ——— */
  function initReveal(root) {
    root.querySelectorAll("[data-reveal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ——— Scoped vs Singleton two-user battle ——— */
  function initScopeBattle(root) {
    let mode = "scoped";
    const stores = {
      scoped: { a: { name: null, id: 401 }, b: { name: null, id: 402 } },
      singleton: { shared: { name: null, id: 900 } },
    };
    const verdict = root.querySelector("[data-verdict]");

    function storeFor(user) {
      if (mode === "singleton") return stores.singleton.shared;
      return stores.scoped[user];
    }

    function paint() {
      ["a", "b"].forEach((user) => {
        const box = root.querySelector(`[data-user="${user}"]`);
        if (!box) return;
        const s = storeFor(user);
        const pick = box.querySelector("[data-pick]");
        const inst = box.querySelector("[data-inst]");
        if (pick) pick.textContent = s.name ? `Favorit: ${s.name}` : "Favorit: —";
        if (inst) {
          inst.textContent =
            mode === "singleton"
              ? `instance #${s.id} (delt)`
              : `instance #${s.id} (egen)`;
        }
        box.classList.toggle("leaked", mode === "singleton" && !!s.name);
      });

      const a = storeFor("a").name;
      const b = storeFor("b").name;
      if (!verdict) return;
      if (!a && !b) {
        verdict.textContent = "Vælg Pokémon for Elev A eller B.";
        verdict.className = "scope-battle-verdict";
        return;
      }
      if (mode === "scoped") {
        verdict.textContent =
          a && b && a === b
            ? "Scoped: samme favorit-navn — men hver sin instance. A’s Set rører ikke B’s store."
            : "Scoped: Elev A og Elev B har hver sin FavoriteStore. Ingen læk.";
        verdict.className = "scope-battle-verdict ok";
      } else {
        verdict.textContent =
          "Singleton: begge ser samme store. Når den ene vælger, overskrives den andens favorit.";
        verdict.className = "scope-battle-verdict bad";
      }
    }

    root.querySelectorAll("[data-battle-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.battleMode;
        root.querySelectorAll("[data-battle-mode]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        paint();
      });
    });

    root.querySelectorAll("[data-user]").forEach((box) => {
      const user = box.dataset.user;
      box.querySelectorAll("[data-pick-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const s = storeFor(user);
          s.name = btn.dataset.pickName;
          paint();
        });
      });
    });

    root.querySelector('[data-action="battle-reset"]')?.addEventListener("click", () => {
      stores.scoped.a.name = null;
      stores.scoped.b.name = null;
      stores.singleton.shared.name = null;
      paint();
    });

    paint();
  }

  function boot() {
    document.querySelectorAll("[data-http-sim]").forEach(initHttpSim);
    document.querySelectorAll("[data-hosting-anim]").forEach(initHosting);
    document.querySelectorAll("[data-spa-anim]").forEach(initSpa);
    document.querySelectorAll("[data-quiz]").forEach(initQuiz);
    document.querySelectorAll("[data-bind-lab]").forEach(initBindLab);
    document.querySelectorAll("[data-lifecycle]").forEach(initLifecycle);
    document.querySelectorAll("[data-di-lab]").forEach(initDiLab);
    document.querySelectorAll("[data-form-lab]").forEach(initFormLab);
    document.querySelectorAll("[data-async-lab]").forEach(initAsyncLab);
    document.querySelectorAll("[data-xss-lab]").forEach(initXssLab);
    document.querySelectorAll("[data-file-tree]").forEach(initFileTree);
    document.querySelectorAll("[data-status-lab]").forEach(initStatusLab);
    document.querySelectorAll("[data-pkce-lab]").forEach(initPkceLab);
    document.querySelectorAll("[data-event-flow]").forEach(initEventFlow);
    document.querySelectorAll("[data-query-lab]").forEach(initQueryLab);
    document.querySelectorAll("[data-reveal-lab]").forEach(initReveal);
    document.querySelectorAll("[data-scope-battle]").forEach(initScopeBattle);
    initTocSpy();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
