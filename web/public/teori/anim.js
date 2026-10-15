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

  function boot() {
    document.querySelectorAll("[data-http-sim]").forEach(initHttpSim);
    document.querySelectorAll("[data-hosting-anim]").forEach(initHosting);
    document.querySelectorAll("[data-spa-anim]").forEach(initSpa);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
