using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Henter hele Rick and Morty-datasættet fra den officielle community-API
    /// og gemmer det lokalt i Postgres.
    /// </summary>
    public class RickAndMortySeedService
    {
        public const string HttpClientName = "rickandmorty";
        private const string BaseUrl = "https://rickandmortyapi.com/api";

        private readonly AppDBContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<RickAndMortySeedService> _logger;

        public RickAndMortySeedService(
            AppDBContext db,
            IHttpClientFactory httpClientFactory,
            ILogger<RickAndMortySeedService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<(int Characters, int Locations, int Episodes)> EnsureSeededAsync(
            bool replace = false,
            CancellationToken ct = default)
        {
            if (!replace)
            {
                var chars = await _db.RickAndMortyCharacters.CountAsync(ct);
                var locs = await _db.RickAndMortyLocations.CountAsync(ct);
                var eps = await _db.RickAndMortyEpisodes.CountAsync(ct);
                // Officiel API: 826 / 126 / 51 — accepter næsten-fuld seed
                if (chars >= 800 && locs >= 120 && eps >= 50)
                    return (chars, locs, eps);
                if (chars + locs + eps > 0)
                    _logger.LogInformation(
                        "RickAndMorty ufuldstændig ({Chars}/{Locs}/{Eps}) — re-seeder",
                        chars, locs, eps);
            }

            return await SeedFromOfficialApiAsync(replace: true, ct);
        }

        public async Task<(int Characters, int Locations, int Episodes)> SeedFromOfficialApiAsync(
            bool replace = true,
            CancellationToken ct = default)
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);

            var characters = await FetchAllAsync<ApiCharacter>(client, $"{BaseUrl}/character", ct);
            var locations = await FetchAllAsync<ApiLocation>(client, $"{BaseUrl}/location", ct);
            var episodes = await FetchAllAsync<ApiEpisode>(client, $"{BaseUrl}/episode", ct);

            if (replace)
            {
                _db.RickAndMortyCharacters.RemoveRange(_db.RickAndMortyCharacters);
                _db.RickAndMortyLocations.RemoveRange(_db.RickAndMortyLocations);
                _db.RickAndMortyEpisodes.RemoveRange(_db.RickAndMortyEpisodes);
                await _db.SaveChangesAsync(ct);
            }

            var charEntities = characters.Select(MapCharacter).ToList();
            var locEntities = locations.Select(MapLocation).ToList();
            var epEntities = episodes.Select(MapEpisode).ToList();

            await _db.RickAndMortyCharacters.AddRangeAsync(charEntities, ct);
            await _db.RickAndMortyLocations.AddRangeAsync(locEntities, ct);
            await _db.RickAndMortyEpisodes.AddRangeAsync(epEntities, ct);
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "RickAndMorty seedet: {Chars} characters, {Locs} locations, {Eps} episodes",
                charEntities.Count, locEntities.Count, epEntities.Count);

            return (charEntities.Count, locEntities.Count, epEntities.Count);
        }

        private static async Task<List<T>> FetchAllAsync<T>(
            HttpClient client,
            string firstUrl,
            CancellationToken ct)
        {
            var all = new List<T>();
            string? url = firstUrl;
            var pageIndex = 0;
            while (!string.IsNullOrEmpty(url))
            {
                // Respektér rate limit på rickandmortyapi.com
                if (pageIndex > 0)
                    await Task.Delay(350, ct);

                var page = await GetPageWithRetryAsync<T>(client, url, ct);
                if (page.Results != null)
                    all.AddRange(page.Results);
                url = page.Info?.Next;
                pageIndex++;
            }
            return all;
        }

        private static async Task<ApiPage<T>> GetPageWithRetryAsync<T>(
            HttpClient client,
            string url,
            CancellationToken ct)
        {
            const int maxAttempts = 6;
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                using var response = await client.GetAsync(url, ct);
                if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    var delayMs = Math.Min(10_000, 500 * (1 << attempt));
                    await Task.Delay(delayMs, ct);
                    continue;
                }

                response.EnsureSuccessStatusCode();
                var page = await response.Content.ReadFromJsonAsync<ApiPage<T>>(cancellationToken: ct);
                return page ?? throw new InvalidOperationException($"Tomt svar fra {url}");
            }

            throw new InvalidOperationException($"Rate limit (429) efter {maxAttempts} forsøg: {url}");
        }

        private static RmCharacter MapCharacter(ApiCharacter c) => new()
        {
            ApiId = c.Id,
            Name = c.Name ?? "",
            Status = c.Status ?? "",
            Species = c.Species ?? "",
            Type = c.Type ?? "",
            Gender = c.Gender ?? "",
            Origin = new RmNamedUrl
            {
                Name = c.Origin?.Name ?? "",
                Url = c.Origin?.Url ?? ""
            },
            Location = new RmNamedUrl
            {
                Name = c.Location?.Name ?? "",
                Url = c.Location?.Url ?? ""
            },
            Image = c.Image ?? "",
            Episode = c.Episode ?? new List<string>(),
            Url = c.Url ?? ""
        };

        private static RmLocation MapLocation(ApiLocation l) => new()
        {
            ApiId = l.Id,
            Name = l.Name ?? "",
            Type = l.Type ?? "",
            Dimension = l.Dimension ?? "",
            Residents = l.Residents ?? new List<string>(),
            Url = l.Url ?? ""
        };

        private static RmEpisode MapEpisode(ApiEpisode e) => new()
        {
            ApiId = e.Id,
            Name = e.Name ?? "",
            AirDate = e.AirDate ?? "",
            EpisodeCode = e.Episode ?? "",
            Characters = e.Characters ?? new List<string>(),
            Url = e.Url ?? ""
        };

        private sealed class ApiPage<T>
        {
            [JsonPropertyName("info")]
            public ApiInfo? Info { get; set; }

            [JsonPropertyName("results")]
            public List<T>? Results { get; set; }
        }

        private sealed class ApiInfo
        {
            [JsonPropertyName("next")]
            public string? Next { get; set; }
        }

        private sealed class ApiNamedUrl
        {
            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("url")]
            public string? Url { get; set; }
        }

        private sealed class ApiCharacter
        {
            [JsonPropertyName("id")]
            public int Id { get; set; }

            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("status")]
            public string? Status { get; set; }

            [JsonPropertyName("species")]
            public string? Species { get; set; }

            [JsonPropertyName("type")]
            public string? Type { get; set; }

            [JsonPropertyName("gender")]
            public string? Gender { get; set; }

            [JsonPropertyName("origin")]
            public ApiNamedUrl? Origin { get; set; }

            [JsonPropertyName("location")]
            public ApiNamedUrl? Location { get; set; }

            [JsonPropertyName("image")]
            public string? Image { get; set; }

            [JsonPropertyName("episode")]
            public List<string>? Episode { get; set; }

            [JsonPropertyName("url")]
            public string? Url { get; set; }
        }

        private sealed class ApiLocation
        {
            [JsonPropertyName("id")]
            public int Id { get; set; }

            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("type")]
            public string? Type { get; set; }

            [JsonPropertyName("dimension")]
            public string? Dimension { get; set; }

            [JsonPropertyName("residents")]
            public List<string>? Residents { get; set; }

            [JsonPropertyName("url")]
            public string? Url { get; set; }
        }

        private sealed class ApiEpisode
        {
            [JsonPropertyName("id")]
            public int Id { get; set; }

            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("air_date")]
            public string? AirDate { get; set; }

            [JsonPropertyName("episode")]
            public string? Episode { get; set; }

            [JsonPropertyName("characters")]
            public List<string>? Characters { get; set; }

            [JsonPropertyName("url")]
            public string? Url { get; set; }
        }
    }
}
