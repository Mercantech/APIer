using Newtonsoft.Json;

namespace OpgaverAPI.Models
{
    /// <summary>
    /// Navn + URL-reference (matcher rickandmortyapi.com origin/location-objekter).
    /// </summary>
    public class RmNamedUrl
    {
        public string Name { get; set; } = "";
        public string Url { get; set; } = "";
    }

    /// <summary>
    /// Karakter fra The Rick and Morty API (lokalt hostet i Postgres).
    /// </summary>
    public class RmCharacter : Common
    {
        /// <summary>ID fra rickandmortyapi.com (1–826).</summary>
        public int ApiId { get; set; }
        public string Name { get; set; } = "";
        /// <summary>Alive, Dead eller unknown.</summary>
        public string Status { get; set; } = "";
        public string Species { get; set; } = "";
        public string Type { get; set; } = "";
        /// <summary>Female, Male, Genderless eller unknown.</summary>
        public string Gender { get; set; } = "";
        public RmNamedUrl Origin { get; set; } = new();
        public RmNamedUrl Location { get; set; } = new();
        public string Image { get; set; } = "";
        /// <summary>Episode-URL'er som i den officielle API.</summary>
        public List<string> Episode { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>
    /// Lokation fra The Rick and Morty API.
    /// </summary>
    public class RmLocation : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";
        public string Type { get; set; } = "";
        public string Dimension { get; set; } = "";
        public List<string> Residents { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>
    /// Episode fra The Rick and Morty API.
    /// </summary>
    public class RmEpisode : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";

        [JsonProperty("air_date")]
        public string AirDate { get; set; } = "";

        /// <summary>Episode-kode, fx S01E01.</summary>
        [JsonProperty("episode")]
        public string EpisodeCode { get; set; } = "";

        public List<string> Characters { get; set; } = new();
        public string Url { get; set; } = "";
    }
}
