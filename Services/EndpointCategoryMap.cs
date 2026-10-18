namespace OpgaverAPI.Services
{
    /// <summary>
    /// Mapper route-paths til katalog-kategorier (samme id'er som web/public/data.js).
    /// Nye prefixes tilføjes her — fremtidige endpoints i samme namespace tracks automatisk.
    /// </summary>
    public static class EndpointCategoryMap
    {
        public sealed record CategoryInfo(string Id, string Title);

        public static readonly IReadOnlyList<CategoryInfo> Categories =
        [
            new("opgaver", "Opgaver (JSON)"),
            new("countries", "Countries"),
            new("pokemon", "Pokémon"),
            new("minecraft", "Minecraft"),
            new("lol", "League of Legends"),
            new("rickandmorty", "Rick and Morty"),
            new("starwars", "Star Wars"),
            new("terraria", "Terraria"),
            new("platform", "Platform & status"),
            new("other", "Øvrige"),
        ];

        private static readonly (string Prefix, string CategoryId)[] PrefixRules =
        [
            ("/Opgaver/", "opgaver"),
            ("/api/Countries", "countries"),
            ("/go/pokemon", "pokemon"),
            ("/go/minecraft", "minecraft"),
            ("/LeagueOfLegends", "lol"),
            ("/api/RickAndMorty", "rickandmorty"),
            ("/api/StarWars", "starwars"),
            ("/api/Terraria", "terraria"),
            ("/api/Status", "platform"),
            ("/api/Users", "platform"),
            ("/api/Game", "platform"),
            ("/api/StudentQuiz", "platform"),
            ("/api/ApiKeys", "platform"),
            ("/go/health", "platform"),
            ("/go/seed", "platform"),
            ("/go/", "platform"),
            ("/go", "platform"),
            ("/swagger", "platform"),
        ];

        public static string Resolve(string path)
        {
            path = EndpointStatsService.NormalizePath(path);
            foreach (var (prefix, id) in PrefixRules)
            {
                if (path.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    return id;
                // Exact match without trailing slash variants
                if (prefix.EndsWith('/') &&
                    path.Equals(prefix.TrimEnd('/'), StringComparison.OrdinalIgnoreCase))
                    return id;
            }

            return "other";
        }

        public static string TitleFor(string categoryId) =>
            Categories.FirstOrDefault(c => c.Id == categoryId)?.Title ?? categoryId;
    }
}
