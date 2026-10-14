using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Seed Star Wars-datasæt fra SWAPI (swapi.info — fulde JSON-arrays, ingen rate limit).
    /// </summary>
    public class StarWarsSeedService
    {
        public const string HttpClientName = "swapi";
        private const string BaseUrl = "https://swapi.info/api";

        private readonly AppDBContext _db;
        private readonly IHttpClientFactory _http;
        private readonly ILogger<StarWarsSeedService> _logger;

        public StarWarsSeedService(AppDBContext db, IHttpClientFactory http, ILogger<StarWarsSeedService> logger)
        {
            _db = db;
            _http = http;
            _logger = logger;
        }

        public async Task<(int People, int Planets, int Films, int Species, int Starships)> EnsureSeededAsync(
            bool replace = false, CancellationToken ct = default)
        {
            if (!replace)
            {
                var people = await _db.StarWarsPeople.CountAsync(ct);
                var planets = await _db.StarWarsPlanets.CountAsync(ct);
                var films = await _db.StarWarsFilms.CountAsync(ct);
                var species = await _db.StarWarsSpecies.CountAsync(ct);
                var ships = await _db.StarWarsStarships.CountAsync(ct);
                if (people >= 80 && planets >= 50 && films >= 6 && species >= 30 && ships >= 30)
                    return (people, planets, films, species, ships);
            }

            return await SeedFromApiAsync(replace: true, ct);
        }

        public async Task<(int People, int Planets, int Films, int Species, int Starships)> SeedFromApiAsync(
            bool replace = true, CancellationToken ct = default)
        {
            var client = _http.CreateClient(HttpClientName);

            var people = await FetchListAsync<ApiPerson>(client, $"{BaseUrl}/people", ct);
            var planets = await FetchListAsync<ApiPlanet>(client, $"{BaseUrl}/planets", ct);
            var films = await FetchListAsync<ApiFilm>(client, $"{BaseUrl}/films", ct);
            var species = await FetchListAsync<ApiSpecies>(client, $"{BaseUrl}/species", ct);
            var starships = await FetchListAsync<ApiStarship>(client, $"{BaseUrl}/starships", ct);

            if (replace)
            {
                _db.StarWarsPeople.RemoveRange(_db.StarWarsPeople);
                _db.StarWarsPlanets.RemoveRange(_db.StarWarsPlanets);
                _db.StarWarsFilms.RemoveRange(_db.StarWarsFilms);
                _db.StarWarsSpecies.RemoveRange(_db.StarWarsSpecies);
                _db.StarWarsStarships.RemoveRange(_db.StarWarsStarships);
                await _db.SaveChangesAsync(ct);
            }

            await _db.StarWarsPeople.AddRangeAsync(people.Select(MapPerson), ct);
            await _db.StarWarsPlanets.AddRangeAsync(planets.Select(MapPlanet), ct);
            await _db.StarWarsFilms.AddRangeAsync(films.Select(MapFilm), ct);
            await _db.StarWarsSpecies.AddRangeAsync(species.Select(MapSpecies), ct);
            await _db.StarWarsStarships.AddRangeAsync(starships.Select(MapStarship), ct);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "StarWars seedet: {People} people, {Planets} planets, {Films} films, {Species} species, {Ships} starships",
                people.Count, planets.Count, films.Count, species.Count, starships.Count);

            return (people.Count, planets.Count, films.Count, species.Count, starships.Count);
        }

        private static async Task<List<T>> FetchListAsync<T>(HttpClient client, string url, CancellationToken ct)
        {
            using var response = await client.GetAsync(url, ct);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            // swapi.info: rå array. swapi.dev: { results: [...] } (evt. pagineret).
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                return JsonSerializer.Deserialize<List<T>>(doc.RootElement.GetRawText(), JsonOpts())
                       ?? new List<T>();
            }

            var all = new List<T>();
            var next = url;
            while (!string.IsNullOrEmpty(next))
            {
                var page = await client.GetFromJsonAsync<ApiPage<T>>(next, ct)
                           ?? throw new InvalidOperationException($"Tomt SWAPI-svar: {next}");
                if (page.Results != null)
                    all.AddRange(page.Results);
                next = page.Next;
                if (!string.IsNullOrEmpty(next))
                    await Task.Delay(200, ct);
            }
            return all;
        }

        private static JsonSerializerOptions JsonOpts() => new()
        {
            PropertyNameCaseInsensitive = true
        };

        private static int IdFromUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return 0;
            var part = url.TrimEnd('/').Split('/').LastOrDefault();
            return int.TryParse(part, out var id) ? id : 0;
        }

        private static SwPerson MapPerson(ApiPerson p) => new()
        {
            ApiId = IdFromUrl(p.Url),
            Name = p.Name ?? "",
            Height = p.Height ?? "",
            Mass = p.Mass ?? "",
            HairColor = p.HairColor ?? "",
            SkinColor = p.SkinColor ?? "",
            EyeColor = p.EyeColor ?? "",
            BirthYear = p.BirthYear ?? "",
            Gender = p.Gender ?? "",
            Homeworld = p.Homeworld ?? "",
            Films = p.Films ?? new(),
            Species = p.Species ?? new(),
            Vehicles = p.Vehicles ?? new(),
            Starships = p.Starships ?? new(),
            Url = p.Url ?? ""
        };

        private static SwPlanet MapPlanet(ApiPlanet p) => new()
        {
            ApiId = IdFromUrl(p.Url),
            Name = p.Name ?? "",
            RotationPeriod = p.RotationPeriod ?? "",
            OrbitalPeriod = p.OrbitalPeriod ?? "",
            Diameter = p.Diameter ?? "",
            Climate = p.Climate ?? "",
            Gravity = p.Gravity ?? "",
            Terrain = p.Terrain ?? "",
            SurfaceWater = p.SurfaceWater ?? "",
            Population = p.Population ?? "",
            Residents = p.Residents ?? new(),
            Films = p.Films ?? new(),
            Url = p.Url ?? ""
        };

        private static SwFilm MapFilm(ApiFilm f) => new()
        {
            ApiId = IdFromUrl(f.Url),
            Title = f.Title ?? "",
            EpisodeId = f.EpisodeId,
            OpeningCrawl = f.OpeningCrawl ?? "",
            Director = f.Director ?? "",
            Producer = f.Producer ?? "",
            ReleaseDate = f.ReleaseDate ?? "",
            Characters = f.Characters ?? new(),
            Planets = f.Planets ?? new(),
            Starships = f.Starships ?? new(),
            Vehicles = f.Vehicles ?? new(),
            Species = f.Species ?? new(),
            Url = f.Url ?? ""
        };

        private static SwSpecies MapSpecies(ApiSpecies s) => new()
        {
            ApiId = IdFromUrl(s.Url),
            Name = s.Name ?? "",
            Classification = s.Classification ?? "",
            Designation = s.Designation ?? "",
            AverageHeight = s.AverageHeight ?? "",
            SkinColors = s.SkinColors ?? "",
            HairColors = s.HairColors ?? "",
            EyeColors = s.EyeColors ?? "",
            AverageLifespan = s.AverageLifespan ?? "",
            Homeworld = s.Homeworld ?? "",
            Language = s.Language ?? "",
            People = s.People ?? new(),
            Films = s.Films ?? new(),
            Url = s.Url ?? ""
        };

        private static SwStarship MapStarship(ApiStarship s) => new()
        {
            ApiId = IdFromUrl(s.Url),
            Name = s.Name ?? "",
            Model = s.Model ?? "",
            Manufacturer = s.Manufacturer ?? "",
            CostInCredits = s.CostInCredits ?? "",
            Length = s.Length ?? "",
            MaxAtmospheringSpeed = s.MaxAtmospheringSpeed ?? "",
            Crew = s.Crew ?? "",
            Passengers = s.Passengers ?? "",
            CargoCapacity = s.CargoCapacity ?? "",
            Consumables = s.Consumables ?? "",
            HyperdriveRating = s.HyperdriveRating ?? "",
            Mglt = s.Mglt ?? "",
            StarshipClass = s.StarshipClass ?? "",
            Pilots = s.Pilots ?? new(),
            Films = s.Films ?? new(),
            Url = s.Url ?? ""
        };

        private sealed class ApiPage<T>
        {
            [JsonPropertyName("next")]
            public string? Next { get; set; }

            [JsonPropertyName("results")]
            public List<T>? Results { get; set; }
        }

        private sealed class ApiPerson
        {
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("height")] public string? Height { get; set; }
            [JsonPropertyName("mass")] public string? Mass { get; set; }
            [JsonPropertyName("hair_color")] public string? HairColor { get; set; }
            [JsonPropertyName("skin_color")] public string? SkinColor { get; set; }
            [JsonPropertyName("eye_color")] public string? EyeColor { get; set; }
            [JsonPropertyName("birth_year")] public string? BirthYear { get; set; }
            [JsonPropertyName("gender")] public string? Gender { get; set; }
            [JsonPropertyName("homeworld")] public string? Homeworld { get; set; }
            [JsonPropertyName("films")] public List<string>? Films { get; set; }
            [JsonPropertyName("species")] public List<string>? Species { get; set; }
            [JsonPropertyName("vehicles")] public List<string>? Vehicles { get; set; }
            [JsonPropertyName("starships")] public List<string>? Starships { get; set; }
            [JsonPropertyName("url")] public string? Url { get; set; }
        }

        private sealed class ApiPlanet
        {
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("rotation_period")] public string? RotationPeriod { get; set; }
            [JsonPropertyName("orbital_period")] public string? OrbitalPeriod { get; set; }
            [JsonPropertyName("diameter")] public string? Diameter { get; set; }
            [JsonPropertyName("climate")] public string? Climate { get; set; }
            [JsonPropertyName("gravity")] public string? Gravity { get; set; }
            [JsonPropertyName("terrain")] public string? Terrain { get; set; }
            [JsonPropertyName("surface_water")] public string? SurfaceWater { get; set; }
            [JsonPropertyName("population")] public string? Population { get; set; }
            [JsonPropertyName("residents")] public List<string>? Residents { get; set; }
            [JsonPropertyName("films")] public List<string>? Films { get; set; }
            [JsonPropertyName("url")] public string? Url { get; set; }
        }

        private sealed class ApiFilm
        {
            [JsonPropertyName("title")] public string? Title { get; set; }
            [JsonPropertyName("episode_id")] public int EpisodeId { get; set; }
            [JsonPropertyName("opening_crawl")] public string? OpeningCrawl { get; set; }
            [JsonPropertyName("director")] public string? Director { get; set; }
            [JsonPropertyName("producer")] public string? Producer { get; set; }
            [JsonPropertyName("release_date")] public string? ReleaseDate { get; set; }
            [JsonPropertyName("characters")] public List<string>? Characters { get; set; }
            [JsonPropertyName("planets")] public List<string>? Planets { get; set; }
            [JsonPropertyName("starships")] public List<string>? Starships { get; set; }
            [JsonPropertyName("vehicles")] public List<string>? Vehicles { get; set; }
            [JsonPropertyName("species")] public List<string>? Species { get; set; }
            [JsonPropertyName("url")] public string? Url { get; set; }
        }

        private sealed class ApiSpecies
        {
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("classification")] public string? Classification { get; set; }
            [JsonPropertyName("designation")] public string? Designation { get; set; }
            [JsonPropertyName("average_height")] public string? AverageHeight { get; set; }
            [JsonPropertyName("skin_colors")] public string? SkinColors { get; set; }
            [JsonPropertyName("hair_colors")] public string? HairColors { get; set; }
            [JsonPropertyName("eye_colors")] public string? EyeColors { get; set; }
            [JsonPropertyName("average_lifespan")] public string? AverageLifespan { get; set; }
            [JsonPropertyName("homeworld")] public string? Homeworld { get; set; }
            [JsonPropertyName("language")] public string? Language { get; set; }
            [JsonPropertyName("people")] public List<string>? People { get; set; }
            [JsonPropertyName("films")] public List<string>? Films { get; set; }
            [JsonPropertyName("url")] public string? Url { get; set; }
        }

        private sealed class ApiStarship
        {
            [JsonPropertyName("name")] public string? Name { get; set; }
            [JsonPropertyName("model")] public string? Model { get; set; }
            [JsonPropertyName("manufacturer")] public string? Manufacturer { get; set; }
            [JsonPropertyName("cost_in_credits")] public string? CostInCredits { get; set; }
            [JsonPropertyName("length")] public string? Length { get; set; }
            [JsonPropertyName("max_atmosphering_speed")] public string? MaxAtmospheringSpeed { get; set; }
            [JsonPropertyName("crew")] public string? Crew { get; set; }
            [JsonPropertyName("passengers")] public string? Passengers { get; set; }
            [JsonPropertyName("cargo_capacity")] public string? CargoCapacity { get; set; }
            [JsonPropertyName("consumables")] public string? Consumables { get; set; }
            [JsonPropertyName("hyperdrive_rating")] public string? HyperdriveRating { get; set; }
            [JsonPropertyName("MGLT")] public string? Mglt { get; set; }
            [JsonPropertyName("starship_class")] public string? StarshipClass { get; set; }
            [JsonPropertyName("pilots")] public List<string>? Pilots { get; set; }
            [JsonPropertyName("films")] public List<string>? Films { get; set; }
            [JsonPropertyName("url")] public string? Url { get; set; }
        }
    }
}
