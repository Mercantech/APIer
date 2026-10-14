using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class OpgaverController : ControllerBase
    {
        private readonly ILogger<OpgaverController> _logger;
        private static int _dieselCallCount = 0;
        private static int _miles95CallCount = 0;
        private static int _bilbasenCallCount = 0;
        private static int _wordleCallCount = 0;
        private static int _countriesCallCount = 0;

        public OpgaverController(ILogger<OpgaverController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Henter data om dieselpriser.
        /// </summary>
        /// <returns>JSON data med dieselpriser.</returns>
        [HttpGet("Diesel")]
        public IActionResult GetDiesel()
        {
            _dieselCallCount++;
            var userAgent = Request.Headers["User-Agent"].ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Diesel endpoint called by IP: {IpAddress}, User-Agent: {UserAgent}. Total calls: {CallCount}", 
                ipAddress, userAgent, _dieselCallCount);

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "diesel.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }
        /// <summary>
        /// Henter data om Miles95 benzinpriser.
        /// </summary>
        /// <returns>JSON data med Miles95 priser.</returns>
        [HttpGet("Miles95")]
        public IActionResult GetMiles95()
        {
            _miles95CallCount++;
            var userAgent = Request.Headers["User-Agent"].ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Miles95 endpoint called by IP: {IpAddress}, User-Agent: {UserAgent}. Total calls: {CallCount}", 
                ipAddress, userAgent, _miles95CallCount);

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "miles95.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }
        /// <summary>
        /// Henter data fra Bilbasen.
        /// </summary>
        /// <returns>JSON data fra Bilbasen.</returns>
        [HttpGet("Bilbasen")]
        public IActionResult GetBilbasen()
        {
            _bilbasenCallCount++;
            var userAgent = Request.Headers["User-Agent"].ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Bilbasen endpoint called by IP: {IpAddress}, User-Agent: {UserAgent}. Total calls: {CallCount}", 
                ipAddress, userAgent, _bilbasenCallCount);

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "bilbasen.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }
        /// <summary>
        /// Henter en liste af Wordle-ord.
        /// </summary>
        /// <returns>JSON data med Wordle-ord.</returns>
        [HttpGet("Wordle")]
        public IActionResult GetWordleWords()
        {
            _wordleCallCount++;
            var userAgent = Request.Headers["User-Agent"].ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Wordle endpoint called by IP: {IpAddress}, User-Agent: {UserAgent}. Total calls: {CallCount}", 
                ipAddress, userAgent, _wordleCallCount);

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "wordle.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }
        /// <summary>
        /// Henter rå lande-data.
        /// </summary>
        /// <returns>JSON data med landeinformation.</returns>
        [HttpGet("CountriesRAW")]
        public IActionResult GetCountries()
        {
            _countriesCallCount++;
            var userAgent = Request.Headers["User-Agent"].ToString();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("CountriesRAW endpoint called by IP: {IpAddress}, User-Agent: {UserAgent}. Total calls: {CallCount}", 
                ipAddress, userAgent, _countriesCallCount);

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "JSON", "countries.json");
            var jsonData = System.IO.File.ReadAllText(filePath);
            return Content(jsonData, "application/json");
        }
        /// <summary>
        /// Henter statistik over API-kald til de forskellige endpoints i denne controller.
        /// </summary>
        /// <returns>Et JSON-objekt med antallet af kald for hvert endpoint.</returns>
        [HttpGet("Stats")]
        public IActionResult GetStats()
        {
            var stats = new
            {
                DieselCalls = _dieselCallCount,
                Miles95Calls = _miles95CallCount,
                BilbasenCalls = _bilbasenCallCount,
                WordleCalls = _wordleCallCount,
                CountriesCalls = _countriesCallCount
            };

            return Ok(stats);
        }
    }
}
