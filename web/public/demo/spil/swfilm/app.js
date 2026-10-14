(() => {
  const { escapeHtml, shuffle, pick, pickN, runChoiceQuiz } = window.SpilCommon;
  runChoiceQuiz({
    statusEl: document.getElementById("status"),
    stageEl: document.getElementById("stage"),
    scoreEl: document.getElementById("score"),
    boot: async () => {
      const films = await fetch("/api/StarWars/films").then((r) => r.json());
      return { films, status: `${films.length} film` };
    },
    getRound: (ctx) => {
      const f = pick(ctx.films);
      const wrong = pickN(
        ctx.films.filter((x) => x.apiId !== f.apiId),
        3
      );
      return {
        prompt: `Hvilken film er <strong>Episode ${f.episode_id}</strong>?`,
        options: shuffle([f, ...wrong]).map((x) => ({
          id: String(x.apiId),
          label: escapeHtml(x.title),
        })),
        correctId: String(f.apiId),
        revealOk: `Episode ${f.episode_id}: ${f.title}`,
        revealBad: `Episode ${f.episode_id} er ${f.title}`,
      };
    },
  });
})();
