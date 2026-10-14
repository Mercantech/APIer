using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using MongoDB.Bson;
using OpgaverAPI.Models;
using Microsoft.AspNetCore.Authorization;
namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CountriesController : ControllerBase
    {
        private readonly IMongoDatabase _database;
        private readonly IMongoCollection<Country> _countries;

        public CountriesController(IMongoDatabase database)
        {
            _database = database;
            _countries = database.GetCollection<Country>("countries");
            Console.WriteLine($"Connected to collection: {_countries.CollectionNamespace}"); // Debug log
        }

        /// <summary>
        /// Henter alle lande.
        /// </summary>
        /// <returns>En liste over alle lande.</returns>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                Console.WriteLine("Attempting to fetch all countries"); // Debug log
                var countries = await _countries.Find(_ => true).ToListAsync();
                Console.WriteLine($"Found {countries.Count} countries"); // Debug log
                return Ok(countries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Henter et specifikt land via ID.
        /// </summary>
        /// <param name="id">Landets ID.</param>
        /// <returns>Landets data.</returns>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var country = await _countries.Find(c => c.Id == id).FirstOrDefaultAsync();
            if (country == null)
                return NotFound();
            return Ok(country);
        }

        /// <summary>
        /// Henter et specifikt land via dets almindelige navn (common name).
        /// </summary>
        /// <param name="commonName">Landets almindelige navn.</param>
        /// <returns>Landets data.</returns>
        [HttpGet("name/{commonName}")]
        public async Task<IActionResult> GetByCommonName(string commonName)
        {
            try
            {
                Console.WriteLine($"Searching for country: {commonName}"); // Debug log
                var filter = Builders<Country>.Filter.Eq("name.common", commonName);
                var country = await _countries.Find(filter).FirstOrDefaultAsync();
                Console.WriteLine($"Found country: {country?.Name.Common ?? "Not found"}"); // Debug log
                if (country == null)
                    return NotFound();
                return Ok(country);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Henter alle lande i en specifik region.
        /// </summary>
        /// <param name="region">Regionens navn.</param>
        /// <returns>En liste over lande i den angivne region.</returns>
        [HttpGet("region/{region}")]
        public async Task<IActionResult> GetByRegion(string region)
        {
            var filter = Builders<Country>.Filter.Eq(x => x.Region, region);
            var countries = await _countries.Find(filter).ToListAsync();
            return Ok(countries);
        }

        /// <summary>
        /// Henter en simplificeret liste over lande, der kun indeholder navn, flag, cca3 og alternative stavemåder.
        /// </summary>
        /// <returns>En liste af simplificerede landeobjekter.</returns>
        [HttpGet("simplified")]
        public async Task<IActionResult> GetSimplifiedCountries()
        {
            try
            {
                var projection = Builders<Country>.Projection
                    .Exclude("_id")
                    .Include(x => x.Name.Common)
                    .Include(x => x.Flags.Png)
                    .Include(x => x.Flags.Svg)
                    .Include(x => x.Flags.Alt)
                    .Include(x => x.Cca3)
                    .Include(x => x.AltSpellings);

                var countries = await _countries
                    .Find(FilterDefinition<Country>.Empty)
                    .Project<SimplifiedCountry>(projection)
                    .ToListAsync();

                return Ok(countries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Filtrerer lande baseret på en række kriterier.
        /// </summary>
        /// <param name="region">Filtrer efter region.</param>
        /// <param name="subregion">Filtrer efter subregion.</param>
        /// <param name="landlocked">Filtrer efter om landet er landlocked.</param>
        /// <param name="language">Filtrer efter sprog.</param>
        /// <param name="minPopulation">Filtrer efter minimum befolkningstal.</param>
        /// <param name="maxPopulation">Filtrer efter maksimum befolkningstal.</param>
        /// <param name="unMember">Filtrer efter FN-medlemskab.</param>
        /// <returns>En liste over lande der matcher filterkriterierne.</returns>
        [HttpGet("filter")]
        public async Task<IActionResult> FilterCountries(
            [FromQuery] string? region,
            [FromQuery] string? subregion,
            [FromQuery] bool? landlocked,
            [FromQuery] string? language,
            [FromQuery] int? minPopulation,
            [FromQuery] int? maxPopulation,
            [FromQuery] bool? unMember)
        {
            try
            {
                var builder = Builders<Country>.Filter;
                var filter = builder.Empty;

                if (!string.IsNullOrEmpty(region))
                    filter &= builder.Eq(x => x.Region, region);

                if (!string.IsNullOrEmpty(subregion))
                    filter &= builder.Eq(x => x.Subregion, subregion);

                if (landlocked.HasValue)
                    filter &= builder.Eq(x => x.Landlocked, landlocked.Value);

                if (!string.IsNullOrEmpty(language))
                    filter &= builder.AnyEq("languages", language);

                if (minPopulation.HasValue)
                    filter &= builder.Gte(x => x.Population, minPopulation.Value);

                if (maxPopulation.HasValue)
                    filter &= builder.Lte(x => x.Population, maxPopulation.Value);

                if (unMember.HasValue)
                    filter &= builder.Eq(x => x.UnMember, unMember.Value);

                var countries = await _countries.Find(filter).ToListAsync();
                Console.WriteLine($"Found {countries.Count} countries"); // Debug log
                return Ok(countries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in FilterCountries: {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Opdaterer et land ud fra dets almindelige navn. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="commonName">Landets almindelige navn.</param>
        /// <param name="updateDto">Data til opdatering.</param>
        /// <returns>Det opdaterede land.</returns>
        [Authorize(Roles = "Mags")]
        [HttpPut("name/{commonName}")]
        public async Task<IActionResult> UpdateByCommonName(string commonName, [FromBody] CountryUpdateDto updateDto)
        {
            try
            {
                Console.WriteLine($"Attempting to update country: {commonName}"); // Debug log

                var filter = Builders<Country>.Filter.Eq("name.common", commonName);
                var country = await _countries.Find(filter).FirstOrDefaultAsync();

                if (country == null)
                {
                    Console.WriteLine($"Country not found: {commonName}"); // Debug log
                    return NotFound($"Country with common name '{commonName}' not found");
                }

                // Opdater kun de felter der er inkluderet i DTO'en
                country.Name = updateDto.Name;
                country.Population = updateDto.Population;
                country.Region = updateDto.Region;
                country.Subregion = updateDto.Subregion;
                country.Languages = updateDto.Languages;
                country.UnMember = updateDto.UnMember;
                country.Capital = updateDto.Capital;
                country.Maps = updateDto.Maps;
                country.Flags = updateDto.Flags;
                country.Landlocked = updateDto.Landlocked;
                country.Borders = updateDto.Borders;
                country.Area = updateDto.Area;

                var updateResult = await _countries.ReplaceOneAsync(filter, country);

                Console.WriteLine($"Successfully updated country: {commonName}"); // Debug log
                return Ok(country);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating country: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Tilføjer Mapillary billed-ID'er til et land. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="commonName">Landets almindelige navn.</param>
        /// <param name="addmapillaryDTO">Objekt indeholdende en liste af Mapillary ID'er.</param>
        /// <returns>Det opdaterede land.</returns>
        [Authorize(Roles = "Mags")]
        [HttpPut("mapillary")]
        public async Task<IActionResult> AddMapillary(string commonName, [FromBody] AddmapillaryDTO addmapillaryDTO)
        {
            try
            {
                Console.WriteLine($"Attempting to add Mapillary images to country: {commonName}"); // Debug log

                var filter = Builders<Country>.Filter.Eq("name.common", commonName);
                var country = await _countries.Find(filter).FirstOrDefaultAsync();

                if (country == null)
                {
                    Console.WriteLine($"Country not found: {commonName}"); // Debug log
                    return NotFound($"Country with common name '{commonName}' not found");
                }

                // Initialiser Mapillary array hvis det ikke findes
                if (country.Maps == null)
                    country.Maps = new Maps();
                if (country.Maps.Mapillary == null)
                    country.Maps.Mapillary = new string[] { };

                // Opret en HashSet med eksisterende IDs for effektiv søgning
                var existingIds = new HashSet<string>(country.Maps.Mapillary);
                var newIds = addmapillaryDTO.Mapillary.Where(id => !existingIds.Contains(id));

                // Kombiner eksisterende og nye IDs
                country.Maps.Mapillary = country.Maps.Mapillary.Concat(newIds).ToArray();

                await _countries.ReplaceOneAsync(filter, country);

                Console.WriteLine($"Successfully added {newIds.Count()} new Mapillary images to {commonName}"); // Debug log
                return Ok(country);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding Mapillary images: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Henter alle lande, der har mindst ét Mapillary billede tilknyttet.
        /// </summary>
        /// <returns>En liste af lande med Mapillary data.</returns>
        [HttpGet("with-mapillary")]
        public async Task<IActionResult> GetCountriesWithMapillary()
        {
            try
            {
                Console.WriteLine("Attempting to fetch countries with Mapillary images"); // Debug log

                var filter = Builders<Country>.Filter.And(
                    Builders<Country>.Filter.Exists("maps.mapillary"),
                    Builders<Country>.Filter.Ne("maps.mapillary", BsonNull.Value),
                    Builders<Country>.Filter.Ne("maps.mapillary", new BsonArray())
                );

                var countries = await _countries.Find(filter).ToListAsync();

                Console.WriteLine($"Found {countries.Count} countries with Mapillary images"); // Debug log

                if (!countries.Any())
                {
                    return Ok("No countries with Mapillary images found.");
                }

                return Ok(countries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching countries with Mapillary: {ex.Message}"); // Debug log
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Henter lande der grænser op til et specifikt land.
        /// </summary>
        /// <param name="commonName">Det almindelige navn på landet, hvis naboer skal findes.</param>
        /// <returns>En liste af nabolande.</returns>
        [HttpGet("borders/{commonName}")]
        public async Task<IActionResult> GetBorderingCountries(string commonName)
        {
            try
            {
                var countryFilter = Builders<Country>.Filter.Eq("name.common", commonName);
                var country = await _countries.Find(countryFilter).FirstOrDefaultAsync();

                if (country == null)
                    return NotFound($"Country with name '{commonName}' not found.");

                if (country.Borders == null || !country.Borders.Any())
                    return Ok(new List<Country>()); // Returner en tom liste, hvis der ikke er nogen grænser

                var borderingCountriesFilter = Builders<Country>.Filter.In("cca3", country.Borders);
                var borderingCountries = await _countries.Find(borderingCountriesFilter).ToListAsync();

                return Ok(borderingCountries);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetBorderingCountries: {ex.Message}");
                return StatusCode(500, ex.Message);
            }
        }
    }
}