using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Seed Terraria-tekstdata fra community JSON-dump baseret på Terraria Wiki (CC BY-NC-SA).
    /// Hoste ikke Re-Logic-spilassets — kun tekst + wiki-links.
    /// Kilde: https://github.com/abduznik/terraria-fetcher (genereret fra terraria.wiki.gg Cargo).
    /// </summary>
    public class TerrariaSeedService
    {
        public const string HttpClientName = "terraria";
        private const string ItemsUrl =
            "https://raw.githubusercontent.com/abduznik/terraria-fetcher/main/data/items.json";
        private const string NpcsUrl =
            "https://raw.githubusercontent.com/abduznik/terraria-fetcher/main/data/npcs.json";

        private static readonly Dictionary<string, string> BossStages = new(StringComparer.OrdinalIgnoreCase)
        {
            ["King Slime"] = "Pre-Hardmode",
            ["Eye of Cthulhu"] = "Pre-Hardmode",
            ["Eater of Worlds"] = "Pre-Hardmode",
            ["Brain of Cthulhu"] = "Pre-Hardmode",
            ["Queen Bee"] = "Pre-Hardmode",
            ["Skeletron"] = "Pre-Hardmode",
            ["Deerclops"] = "Pre-Hardmode",
            ["Wall of Flesh"] = "Pre-Hardmode",
            ["Queen Slime"] = "Hardmode",
            ["The Twins"] = "Hardmode",
            ["Retinazer"] = "Hardmode",
            ["Spazmatism"] = "Hardmode",
            ["The Destroyer"] = "Hardmode",
            ["Skeletron Prime"] = "Hardmode",
            ["Plantera"] = "Hardmode",
            ["Golem"] = "Hardmode",
            ["Empress of Light"] = "Hardmode",
            ["Duke Fishron"] = "Hardmode",
            ["Lunatic Cultist"] = "Hardmode",
            ["Moon Lord"] = "Hardmode",
            ["Dark Mage"] = "Event",
            ["Ogre"] = "Event",
            ["Betsy"] = "Event",
            ["Mourning Wood"] = "Event",
            ["Pumpking"] = "Event",
            ["Everscream"] = "Event",
            ["Santa-NK1"] = "Event",
            ["Ice Queen"] = "Event",
            ["Martian Saucer"] = "Event",
            ["Flying Dutchman"] = "Event",
            ["Solar Pillar"] = "Event",
            ["Vortex Pillar"] = "Event",
            ["Nebula Pillar"] = "Event",
            ["Stardust Pillar"] = "Event",
        };

        private readonly AppDBContext _db;
        private readonly IHttpClientFactory _http;
        private readonly ILogger<TerrariaSeedService> _logger;

        public TerrariaSeedService(AppDBContext db, IHttpClientFactory http, ILogger<TerrariaSeedService> logger)
        {
            _db = db;
            _http = http;
            _logger = logger;
        }

        public async Task<(int Items, int Recipes, int Npcs, int Bosses)> EnsureSeededAsync(
            bool replace = false, CancellationToken ct = default)
        {
            if (!replace)
            {
                var items = await _db.TerrariaItems.CountAsync(ct);
                var recipes = await _db.TerrariaRecipes.CountAsync(ct);
                var npcs = await _db.TerrariaNpcs.CountAsync(ct);
                var bosses = await _db.TerrariaNpcs.CountAsync(n => n.IsBoss, ct);
                if (items >= 5000 && recipes >= 1000 && npcs >= 500)
                    return (items, recipes, npcs, bosses);
                if (items + recipes + npcs > 0)
                    _logger.LogInformation(
                        "Terraria ufuldstændig ({Items}/{Recipes}/{Npcs}) — re-seeder",
                        items, recipes, npcs);
            }

            return await SeedFromDumpAsync(replace: true, ct);
        }

        public async Task<(int Items, int Recipes, int Npcs, int Bosses)> SeedFromDumpAsync(
            bool replace = true, CancellationToken ct = default)
        {
            var client = _http.CreateClient(HttpClientName);

            var rawItems = await client.GetFromJsonAsync<List<DumpItem>>(ItemsUrl, ct)
                           ?? throw new InvalidOperationException("Kunne ikke hente Terraria items.json");
            var rawNpcs = await client.GetFromJsonAsync<List<DumpNpc>>(NpcsUrl, ct)
                          ?? throw new InvalidOperationException("Kunne ikke hente Terraria npcs.json");

            if (replace)
            {
                _db.TerrariaRecipes.RemoveRange(_db.TerrariaRecipes);
                _db.TerrariaItems.RemoveRange(_db.TerrariaItems);
                _db.TerrariaNpcs.RemoveRange(_db.TerrariaNpcs);
                await _db.SaveChangesAsync(ct);
            }

            var items = new List<TerrariaItem>();
            var recipes = new List<TerrariaRecipe>();
            var seenItemIds = new HashSet<int>();

            foreach (var raw in rawItems)
            {
                if (!int.TryParse(raw.Id, out var itemId))
                    continue;
                // Wiki-dump kan have flere rækker med samme item-id — behold første
                if (!seenItemIds.Add(itemId))
                    continue;

                var type = raw.Type ?? "";
                var hasRecipe = raw.Recipes is { Count: > 0 };
                items.Add(new TerrariaItem
                {
                    ItemId = itemId,
                    Name = raw.Name ?? "",
                    Type = type,
                    Category = DeriveCategory(type),
                    Tooltip = raw.Tooltip ?? "",
                    Rarity = int.TryParse(raw.Rarity, out var r) ? r : 0,
                    SellValue = raw.SellValue ?? "",
                    Damage = TryInt(raw.Damage),
                    DamageType = raw.DamageType ?? "",
                    Defense = TryInt(raw.Defense),
                    UseTime = raw.UseTime ?? "",
                    CritChance = raw.CritChance ?? "",
                    Knockback = raw.Knockback ?? "",
                    WikiUrl = WikiUrl(raw.Name),
                    HasRecipe = hasRecipe
                });

                if (raw.Recipes == null) continue;
                foreach (var rec in raw.Recipes)
                {
                    recipes.Add(new TerrariaRecipe
                    {
                        ResultItemId = itemId,
                        ResultName = raw.Name ?? "",
                        ResultAmount = rec.Amount > 0 ? rec.Amount : 1,
                        Station = rec.Station ?? "",
                        Ingredients = (rec.Ingredients ?? new())
                            .Select(i => $"{i.Name} x{i.Qty}")
                            .ToList()
                    });
                }
            }

            var seenNpcIds = new HashSet<int>();
            var npcs = new List<TerrariaNpc>();
            foreach (var n in rawNpcs)
            {
                if (!int.TryParse(n.Id, out var npcId))
                    continue;
                if (!seenNpcIds.Add(npcId))
                    continue;
                var name = n.Name ?? "";
                var isBoss = BossStages.ContainsKey(name);
                npcs.Add(new TerrariaNpc
                {
                    NpcId = npcId,
                    Name = name,
                    Life = n.Life ?? "",
                    Defense = n.Defense ?? "",
                    IsBoss = isBoss,
                    Stage = isBoss ? BossStages[name] : "",
                    WikiUrl = WikiUrl(name)
                });
            }

            // Insert i batches for mindre memory pressure
            const int batch = 500;
            for (var i = 0; i < items.Count; i += batch)
            {
                await _db.TerrariaItems.AddRangeAsync(items.Skip(i).Take(batch), ct);
                await _db.SaveChangesAsync(ct);
                _db.ChangeTracker.Clear();
            }

            for (var i = 0; i < recipes.Count; i += batch)
            {
                await _db.TerrariaRecipes.AddRangeAsync(recipes.Skip(i).Take(batch), ct);
                await _db.SaveChangesAsync(ct);
                _db.ChangeTracker.Clear();
            }

            for (var i = 0; i < npcs.Count; i += batch)
            {
                await _db.TerrariaNpcs.AddRangeAsync(npcs.Skip(i).Take(batch), ct);
                await _db.SaveChangesAsync(ct);
                _db.ChangeTracker.Clear();
            }

            var bosses = npcs.Count(n => n.IsBoss);
            _logger.LogInformation(
                "Terraria seedet: {Items} items, {Recipes} recipes, {Npcs} npcs ({Bosses} bosses)",
                items.Count, recipes.Count, npcs.Count, bosses);

            return (items.Count, recipes.Count, npcs.Count, bosses);
        }

        private static string DeriveCategory(string type)
        {
            var t = type.ToLowerInvariant();
            if (t.Contains("weapon")) return "weapon";
            if (t.Contains("armor") || t.Contains("helmet") || t.Contains("breastplate") || t.Contains("greaves"))
                return "armor";
            if (t.Contains("accessory")) return "accessory";
            if (t.Contains("tool") || t.Contains("pickaxe") || t.Contains("axe") || t.Contains("hammer"))
                return "tool";
            if (t.Contains("vanity")) return "vanity";
            if (t.Contains("crafting material") || t.Contains("material")) return "material";
            return "other";
        }

        private static int? TryInt(string? s) =>
            int.TryParse(s, out var n) ? n : null;

        private static string WikiUrl(string? name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "https://terraria.wiki.gg/";
            var slug = Uri.EscapeDataString(name.Replace(' ', '_'));
            return $"https://terraria.wiki.gg/wiki/{slug}";
        }

        private sealed class DumpItem
        {
            [JsonPropertyName("id")] public string? Id { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("type")] public string? Type { get; set; }
            [JsonPropertyName("tooltip")] public string? Tooltip { get; set; }
            [JsonPropertyName("rarity")] public string? Rarity { get; set; }
            [JsonPropertyName("sellValue")] public string? SellValue { get; set; }
            [JsonPropertyName("damage")] public string? Damage { get; set; }
            [JsonPropertyName("damageType")] public string? DamageType { get; set; }
            [JsonPropertyName("defense")] public string? Defense { get; set; }
            [JsonPropertyName("useTime")] public string? UseTime { get; set; }
            [JsonPropertyName("critChance")] public string? CritChance { get; set; }
            [JsonPropertyName("knockback")] public string? Knockback { get; set; }
            [JsonPropertyName("recipes")] public List<DumpRecipe>? Recipes { get; set; }
        }

        private sealed class DumpRecipe
        {
            [JsonPropertyName("station")] public string? Station { get; set; }
            [JsonPropertyName("amount")] public int Amount { get; set; }
            [JsonPropertyName("ingredients")] public List<DumpIngredient>? Ingredients { get; set; }
        }

        private sealed class DumpIngredient
        {
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("qty")] public int Qty { get; set; }
        }

        private sealed class DumpNpc
        {
            [JsonPropertyName("id")] public string? Id { get; set; }
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("life")] public string? Life { get; set; }
            [JsonPropertyName("defense")] public string? Defense { get; set; }
        }
    }
}
