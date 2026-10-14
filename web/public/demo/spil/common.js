(() => {
  function escapeHtml(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickN(arr, n, exclude) {
    const ex = new Set(exclude || []);
    const pool = shuffle(arr.filter((x) => !ex.has(x)));
    return pool.slice(0, n);
  }

  function normalizeName(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9æøå]/g, "");
  }

  function titleCase(name) {
    return String(name || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function scoreBar(el, { round, score, streak }) {
    el.innerHTML = `
      <span>Runde <strong>${round}</strong></span>
      <span>Point <strong>${score}</strong></span>
      <span>Streak <strong>${streak}</strong></span>`;
  }

  window.SpilCommon = {
    escapeHtml,
    shuffle,
    pick,
    pickN,
    normalizeName,
    titleCase,
    scoreBar,
  };
})();
