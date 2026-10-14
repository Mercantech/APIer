// PostgreSQL Model for League of Legends API
namespace OpgaverAPI.Models
{
    public class LeagueOfLegends : Common
    {
    }
    public class LolChampion : Common
    {
        public string? Name { get; set; }
        public string? Title { get; set; }
        public List<string>? Classes { get; set; }
        public DateTime ReleaseDate { get; set; }
        public string? ImgUrl { get; set; }
        //public List<string>? SkinImgUrls { get; set; }
        public string? Resource { get; set; } // Mana, Energy, Rage, etc.
        public string? RangeType { get; set; } // Melee, Ranged, etc.
        public string? Origin { get; set; } // Human, Machine, etc.
        public string? Region { get; set; } // Demacia, Noxus, etc.
        public List<string>? Emojis { get; set; }

        public string GetClassTypes()
        {
            return Classes != null ? string.Join(", ", Classes) : string.Empty;
        }

        public override string ToString()
        {
            return $"{Name}, {Title}";
        }
    }
}