(() => {
  function detectLang(text) {
    const t = text.trimStart();
    if (
      t.startsWith("@") ||
      t.includes("@code") ||
      t.includes("@inject") ||
      t.includes("@onclick") ||
      t.includes("@bind") ||
      (t.includes("<") && t.includes("@"))
    ) {
      return "cshtml";
    }
    return "csharp";
  }

  function highlightAll() {
    if (!window.Prism) return;

    document.querySelectorAll("pre.teori-code").forEach((pre) => {
      if (pre.dataset.hl === "1") return;

      let code = pre.querySelector(":scope > code");
      if (!code) {
        code = document.createElement("code");
        code.textContent = pre.textContent;
        pre.replaceChildren(code);
      }

      const lang = pre.dataset.lang || detectLang(code.textContent || "");
      code.className = `language-${lang}`;
      pre.classList.add(`language-${lang}`);
      Prism.highlightElement(code);
      pre.dataset.hl = "1";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlightAll);
  } else {
    highlightAll();
  }
})();
