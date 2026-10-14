using Newtonsoft.Json;

namespace OpgaverAPI.Models
{
    /// <summary>Person/character fra SWAPI (lokalt i Postgres).</summary>
    public class SwPerson : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";
        public string Height { get; set; } = "";
        public string Mass { get; set; } = "";

        [JsonProperty("hair_color")]
        public string HairColor { get; set; } = "";

        [JsonProperty("skin_color")]
        public string SkinColor { get; set; } = "";

        [JsonProperty("eye_color")]
        public string EyeColor { get; set; } = "";

        [JsonProperty("birth_year")]
        public string BirthYear { get; set; } = "";

        public string Gender { get; set; } = "";
        public string Homeworld { get; set; } = "";
        public List<string> Films { get; set; } = new();
        public List<string> Species { get; set; } = new();
        public List<string> Vehicles { get; set; } = new();
        public List<string> Starships { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>Planet fra SWAPI.</summary>
    public class SwPlanet : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";

        [JsonProperty("rotation_period")]
        public string RotationPeriod { get; set; } = "";

        [JsonProperty("orbital_period")]
        public string OrbitalPeriod { get; set; } = "";

        public string Diameter { get; set; } = "";
        public string Climate { get; set; } = "";
        public string Gravity { get; set; } = "";
        public string Terrain { get; set; } = "";

        [JsonProperty("surface_water")]
        public string SurfaceWater { get; set; } = "";

        public string Population { get; set; } = "";
        public List<string> Residents { get; set; } = new();
        public List<string> Films { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>Film fra SWAPI.</summary>
    public class SwFilm : Common
    {
        public int ApiId { get; set; }
        public string Title { get; set; } = "";

        [JsonProperty("episode_id")]
        public int EpisodeId { get; set; }

        [JsonProperty("opening_crawl")]
        public string OpeningCrawl { get; set; } = "";

        public string Director { get; set; } = "";
        public string Producer { get; set; } = "";

        [JsonProperty("release_date")]
        public string ReleaseDate { get; set; } = "";

        public List<string> Characters { get; set; } = new();
        public List<string> Planets { get; set; } = new();
        public List<string> Starships { get; set; } = new();
        public List<string> Vehicles { get; set; } = new();
        public List<string> Species { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>Art/species fra SWAPI.</summary>
    public class SwSpecies : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";
        public string Classification { get; set; } = "";
        public string Designation { get; set; } = "";

        [JsonProperty("average_height")]
        public string AverageHeight { get; set; } = "";

        [JsonProperty("skin_colors")]
        public string SkinColors { get; set; } = "";

        [JsonProperty("hair_colors")]
        public string HairColors { get; set; } = "";

        [JsonProperty("eye_colors")]
        public string EyeColors { get; set; } = "";

        [JsonProperty("average_lifespan")]
        public string AverageLifespan { get; set; } = "";

        public string Homeworld { get; set; } = "";
        public string Language { get; set; } = "";
        public List<string> People { get; set; } = new();
        public List<string> Films { get; set; } = new();
        public string Url { get; set; } = "";
    }

    /// <summary>Rumskib fra SWAPI.</summary>
    public class SwStarship : Common
    {
        public int ApiId { get; set; }
        public string Name { get; set; } = "";
        public string Model { get; set; } = "";
        public string Manufacturer { get; set; } = "";

        [JsonProperty("cost_in_credits")]
        public string CostInCredits { get; set; } = "";

        public string Length { get; set; } = "";

        [JsonProperty("max_atmosphering_speed")]
        public string MaxAtmospheringSpeed { get; set; } = "";

        public string Crew { get; set; } = "";
        public string Passengers { get; set; } = "";

        [JsonProperty("cargo_capacity")]
        public string CargoCapacity { get; set; } = "";

        public string Consumables { get; set; } = "";

        [JsonProperty("hyperdrive_rating")]
        public string HyperdriveRating { get; set; } = "";

        [JsonProperty("MGLT")]
        public string Mglt { get; set; } = "";

        [JsonProperty("starship_class")]
        public string StarshipClass { get; set; } = "";

        public List<string> Pilots { get; set; } = new();
        public List<string> Films { get; set; } = new();
        public string Url { get; set; } = "";
    }
}
