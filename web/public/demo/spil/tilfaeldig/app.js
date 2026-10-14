(() => {
  const GAMES = [
    "hvem","type","evo","omvendtevo","vaegt","hoejde","dex","xp","dobbelttype",
    "craft","mob","kategori","biome","kold","hardness","graver","stack","bred","hoejmob",
    "champ","klasse","resource","range","svaer","magi","rat","angreb","titel",
    "flag","hovedstad","omvendt","nabo","nabotal","befolkning","areal","region","kontinent",
    "landlocked","valuta","fifa","trafik","uge","subregion","nord","syd","oest",
    "ringekode","coat","sprog","tld","demonym","timezone","fn","uafhaengig","alfabet","streak",
    "wordle","anagram","pris","higher","dyrest","bil","model",
    "rmstatus","rmspecies","rmgender",
    "swfilm","swplanet","swship","swfolk",
    "terrboss","terrweapon","terrcraft","terrcat",
  ];

  const status = document.getElementById("status");

  function go() {
    const id = GAMES[Math.floor(Math.random() * GAMES.length)];
    status.textContent = `Sender dig til /demo/spil/${id} …`;
    window.location.href = `/demo/spil/${id}/`;
  }

  document.getElementById("btnGo").addEventListener("click", go);
  setTimeout(go, 600);
})();
