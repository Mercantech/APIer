(() => {
  const KEY = "apier-teori-progress-v1";
  const lessons = [
    "/teori/intro-hosting/",
    "/teori/projekt-opsaetning/",
    "/teori/razor-html-css/",
    "/teori/forms-editform/",
    "/teori/komponenter-events/",
    "/teori/di-services/",
    "/teori/livscyklus-state/",
    "/teori/httpclient-api/",
    "/teori/routing-spa/",
    "/teori/layout-ui/",
    "/teori/auth-api-noegler/",
    "/teori/sikkerhed-performance/",
    "/teori/debug-test/",
  ];

  function load() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }

  function save(data) {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  }

  function norm(path) {
    let p = path || "/";
    if (!p.endsWith("/")) p += "/";
    return p;
  }

  function markCurrent() {
    const path = norm(location.pathname);
    if (!lessons.includes(path)) return;
    const data = load();
    if (!data[path]) {
      data[path] = { at: Date.now() };
      save(data);
    }
  }

  function paintHub() {
    const root = document.querySelector("[data-teori-progress]");
    if (!root) return;
    const data = load();
    const done = lessons.filter((l) => data[l]).length;
    const pct = Math.round((done / lessons.length) * 100);
    const bar = root.querySelector("[data-progress-bar]");
    const label = root.querySelector("[data-progress-label]");
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${done} / ${lessons.length} lektioner besøgt`;

    document.querySelectorAll(".teori-path-list a").forEach((a) => {
      try {
        const href = new URL(a.getAttribute("href"), location.origin).pathname;
        const p = norm(href);
        if (data[p]) a.classList.add("is-done");
      } catch {
        /* ignore */
      }
    });
  }

  function paintLessonBar() {
    const bar = document.querySelector("[data-lesson-progress] [data-progress-bar]");
    if (!bar) return;
    const article = document.querySelector(".teori-lesson");
    if (!article) return;

    const onScroll = () => {
      const rect = article.getBoundingClientRect();
      const total = article.scrollHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      bar.style.width = `${pct}%`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  markCurrent();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      paintHub();
      paintLessonBar();
    });
  } else {
    paintHub();
    paintLessonBar();
  }
})();
