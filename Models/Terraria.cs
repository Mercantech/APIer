namespace OpgaverAPI.Models
{
    /// <summary>
    /// Terraria-item (tekstdata fra Terraria Wiki, CC BY-NC-SA).
    /// Ingen spil-assets/billeder hostes — kun wikiUrl til attribution.
    /// </summary>
    public class TerrariaItem : Common
    {
        public int ItemId { get; set; }
        public string Name { get; set; } = "";
        /// <summary>Rå type-streng fra wiki, fx "weapon, crafting material".</summary>
        public string Type { get; set; } = "";
        /// <summary>Afledt kategori: weapon, armor, accessory, tool, vanity, material, other.</summary>
        public string Category { get; set; } = "";
        public string Tooltip { get; set; } = "";
        public int Rarity { get; set; }
        public string SellValue { get; set; } = "";
        public int? Damage { get; set; }
        public string DamageType { get; set; } = "";
        public int? Defense { get; set; }
        public string UseTime { get; set; } = "";
        public string CritChance { get; set; } = "";
        public string Knockback { get; set; } = "";
        public string WikiUrl { get; set; } = "";
        public bool HasRecipe { get; set; }
    }

    /// <summary>Crafting-opskrift (resultat + station + ingredienser).</summary>
    public class TerrariaRecipe : Common
    {
        public int ResultItemId { get; set; }
        public string ResultName { get; set; } = "";
        public int ResultAmount { get; set; } = 1;
        public string Station { get; set; } = "";
        /// <summary>Ingredienser som "Copper Bar x7".</summary>
        public List<string> Ingredients { get; set; } = new();
    }

    /// <summary>NPC/boss (tekstdata). IsBoss markerer progression-relevante bosses.</summary>
    public class TerrariaNpc : Common
    {
        public int NpcId { get; set; }
        public string Name { get; set; } = "";
        public string Life { get; set; } = "";
        public string Defense { get; set; } = "";
        public bool IsBoss { get; set; }
        /// <summary>Pre-Hardmode, Hardmode, Event eller tom.</summary>
        public string Stage { get; set; } = "";
        public string WikiUrl { get; set; } = "";
    }
}
