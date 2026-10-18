using Microsoft.AspNetCore.Mvc;
using OpgaverAPI.Services;

namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OpgaverController : ControllerBase
    {
        private readonly ILogger<OpgaverController> _logger;
        private readonly IEndpointStatsService _stats;

        public OpgaverController(ILogger<OpgaverController> logger, IEndpointStatsService stats)
        {
            _logger = logger;
            _stats = stats;
        }

        /// <summary>
        /// Henter data om dieselpriser.
        /// </summary>
        [HttpGet("Diesel")]
        public IActionResult GetDiesel()
        {
            LogCall("Diesel");
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "diesel.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }

        /// <summary>
        /// Henter data om Miles95 benzinpriser.
        /// </summary>
        [HttpGet("Miles95")]
        public IActionResult GetMiles95()
        {
            LogCall("Miles95");
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "miles95.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }

        /// <summary>
        /// Henter data fra Bilbasen.
        /// </summary>
        [HttpGet("Bilbasen")]
        public IActionResult GetBilbasen()
        {
            LogCall("Bilbasen");
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "bilbasen.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }

        /// <summary>
        /// Henter en liste af Wordle-ord.
        /// </summary>
        [HttpGet("Wordle")]
        public IActionResult GetWordleWords()
        {
            LogCall("Wordle");
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "wordle.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }

        /// <summary>
        /// Henter rå lande-data.
        /// </summary>
        [HttpGet("CountriesRAW")]
        public IActionResult GetCountries()
        {
            LogCall("CountriesRAW");
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "countries.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }

        /// <summary>
        /// Hybrid kaldestatistik: live hukommelse + Postgres (overlever deploy).
        /// Bevarer legacy-felter for de gamle Opgaver-JSON-endpoints og returnerer alle tracked routes.
        /// </summary>
        [HttpGet("Stats")]
        public async Task<IActionResult> GetStats(CancellationToken ct)
        {
            // Flush .NET-pending + hent Go/.NET-tal fra Postgres ind i live-snapshot
            await _stats.FlushAsync(ct);
            await _stats.LoadFromDatabaseAsync(ct);
            var snapshot = _stats.GetSnapshot();

            var flat = snapshot.Select(x =>
            {
                var category = EndpointCategoryMap.Resolve(x.Path);
                return new
                {
                    method = x.Method,
                    path = x.Path,
                    calls = x.Calls,
                    lastCalledAt = x.LastCalledAt,
                    category,
                    categoryTitle = EndpointCategoryMap.TitleFor(category)
                };
            }).ToList();

            var categories = EndpointCategoryMap.Categories
                .Select(c =>
                {
                    var eps = flat.Where(e => e.category == c.Id).ToList();
                    return new
                    {
                        id = c.Id,
                        title = c.Title,
                        totalCalls = eps.Sum(e => e.calls),
                        endpointCount = eps.Count,
                        endpoints = eps
                    };
                })
                .Where(c => c.endpointCount > 0 || c.id is not "other")
                .ToList();

            // Vis også «other» hvis der er ukendte routes
            if (flat.Any(e => e.category == "other") && categories.All(c => c.id != "other"))
            {
                var other = flat.Where(e => e.category == "other").ToList();
                categories.Add(new
                {
                    id = "other",
                    title = EndpointCategoryMap.TitleFor("other"),
                    totalCalls = other.Sum(e => e.calls),
                    endpointCount = other.Count,
                    endpoints = other
                });
            }

            return Ok(new
            {
                // Legacy-kompatibilitet (katalog / elev-øvelser)
                DieselCalls = _stats.GetCalls("GET", "/Opgaver/Diesel"),
                Miles95Calls = _stats.GetCalls("GET", "/Opgaver/Miles95"),
                BilbasenCalls = _stats.GetCalls("GET", "/Opgaver/Bilbasen"),
                WordleCalls = _stats.GetCalls("GET", "/Opgaver/Wordle"),
                CountriesCalls = _stats.GetCalls("GET", "/Opgaver/CountriesRAW"),

                // Fuld hybrid-status på tværs af alle kategorier
                totalCalls = flat.Sum(x => x.calls),
                endpointCount = flat.Count,
                categoryCount = categories.Count(c => c.endpointCount > 0),
                source = "memory+postgres",
                categories,
                endpoints = flat
            });
        }

        private void LogCall(string name)
        {
            var userAgent = Request.Headers.UserAgent.ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation(
                "{Endpoint} called by IP: {IpAddress}, User-Agent: {UserAgent}",
                name, ipAddress, userAgent);
        }
    }
}
