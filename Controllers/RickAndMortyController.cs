using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Attributes;
using OpgaverAPI.Context;
using OpgaverAPI.Models;
using OpgaverAPI.Services;

namespace OpgaverAPI.Controllers
{
    /// <summary>
    /// Lokalt hostet Rick and Morty-datasæt (characters, locations, episodes)
    /// seedet fra https://rickandmortyapi.com/
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RickAndMortyController : ControllerBase
    {
        private readonly AppDBContext _db;
        private readonly RickAndMortySeedService _seed;

        public RickAndMortyController(AppDBContext db, RickAndMortySeedService seed)
        {
            _db = db;
            _seed = seed;
        }

        /// <summary>
        /// Overblik: antal characters, locations og episodes.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            return Ok(new
            {
                characters = await _db.RickAndMortyCharacters.CountAsync(),
                locations = await _db.RickAndMortyLocations.CountAsync(),
                episodes = await _db.RickAndMortyEpisodes.CountAsync(),
                source = "https://rickandmortyapi.com/",
                endpoints = new[]
                {
                    "/api/RickAndMorty/characters",
                    "/api/RickAndMorty/locations",
                    "/api/RickAndMorty/episodes"
                }
            });
        }

        /// <summary>
        /// Seed/re-seed fra den officielle API. Header: X-Seed-Key.
        /// </summary>
        [RequireSeedKey]
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromQuery] bool replace = true, CancellationToken ct = default)
        {
            var (characters, locations, episodes) =
                await _seed.SeedFromOfficialApiAsync(replace, ct);
            return Ok(new { characters, locations, episodes, replace });
        }

        // ── Characters ──────────────────────────────────────────────

        /// <summary>
        /// Alle characters. Query: name, status, species, type, gender, q, limit, offset.
        /// </summary>
        [HttpGet("characters")]
        public async Task<ActionResult<IEnumerable<RmCharacter>>> GetCharacters(
            [FromQuery] string? name,
            [FromQuery] string? status,
            [FromQuery] string? species,
            [FromQuery] string? type,
            [FromQuery] string? gender,
            [FromQuery] string? q,
            [FromQuery] int limit = 826,
            [FromQuery] int offset = 0)
        {
            if (limit < 1) limit = 1;
            if (limit > 1000) limit = 1000;
            if (offset < 0) offset = 0;

            var query = _db.RickAndMortyCharacters.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(c => c.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(c => c.Status.ToLower() == status.ToLower());
            if (!string.IsNullOrWhiteSpace(species))
                query = query.Where(c => c.Species.ToLower().Contains(species.ToLower()));
            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(c => c.Type.ToLower().Contains(type.ToLower()));
            if (!string.IsNullOrWhiteSpace(gender))
                query = query.Where(c => c.Gender.ToLower() == gender.ToLower());
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    c.Species.ToLower().Contains(term) ||
                    c.Type.ToLower().Contains(term));
            }

            var list = await query
                .OrderBy(c => c.ApiId)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            return list;
        }

        /// <summary>
        /// Én character via officielt id (ApiId), fx 1 = Rick Sanchez.
        /// </summary>
        [HttpGet("characters/{id:int}")]
        public async Task<ActionResult<RmCharacter>> GetCharacter(int id)
        {
            var character = await _db.RickAndMortyCharacters
                .FirstOrDefaultAsync(c => c.ApiId == id);
            if (character == null)
                return NotFound();
            return character;
        }

        /// <summary>
        /// Characters efter status (Alive, Dead, unknown).
        /// </summary>
        [HttpGet("characters/status/{status}")]
        public async Task<ActionResult<IEnumerable<RmCharacter>>> GetCharactersByStatus(string status)
        {
            var list = await _db.RickAndMortyCharacters
                .Where(c => c.Status.ToLower() == status.ToLower())
                .OrderBy(c => c.ApiId)
                .ToListAsync();
            if (list.Count == 0)
                return NotFound($"Ingen characters med status '{status}'");
            return list;
        }

        /// <summary>
        /// Characters efter species (fx Human, Alien).
        /// </summary>
        [HttpGet("characters/species/{species}")]
        public async Task<ActionResult<IEnumerable<RmCharacter>>> GetCharactersBySpecies(string species)
        {
            var list = await _db.RickAndMortyCharacters
                .Where(c => c.Species.ToLower().Contains(species.ToLower()))
                .OrderBy(c => c.ApiId)
                .ToListAsync();
            if (list.Count == 0)
                return NotFound($"Ingen characters med species '{species}'");
            return list;
        }

        /// <summary>
        /// Unikke species.
        /// </summary>
        [HttpGet("characters/species")]
        public async Task<ActionResult<IEnumerable<string>>> GetSpecies()
        {
            return await _db.RickAndMortyCharacters
                .Select(c => c.Species)
                .Where(s => s != "")
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();
        }

        /// <summary>
        /// Unikke status-værdier.
        /// </summary>
        [HttpGet("characters/statuses")]
        public async Task<ActionResult<IEnumerable<string>>> GetStatuses()
        {
            return await _db.RickAndMortyCharacters
                .Select(c => c.Status)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();
        }

        // ── Locations ───────────────────────────────────────────────

        /// <summary>
        /// Alle locations. Query: name, type, dimension, q, limit, offset.
        /// </summary>
        [HttpGet("locations")]
        public async Task<ActionResult<IEnumerable<RmLocation>>> GetLocations(
            [FromQuery] string? name,
            [FromQuery] string? type,
            [FromQuery] string? dimension,
            [FromQuery] string? q,
            [FromQuery] int limit = 200,
            [FromQuery] int offset = 0)
        {
            if (limit < 1) limit = 1;
            if (limit > 500) limit = 500;
            if (offset < 0) offset = 0;

            var query = _db.RickAndMortyLocations.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(l => l.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(type))
                query = query.Where(l => l.Type.ToLower().Contains(type.ToLower()));
            if (!string.IsNullOrWhiteSpace(dimension))
                query = query.Where(l => l.Dimension.ToLower().Contains(dimension.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.ToLower();
                query = query.Where(l =>
                    l.Name.ToLower().Contains(term) ||
                    l.Type.ToLower().Contains(term) ||
                    l.Dimension.ToLower().Contains(term));
            }

            return await query
                .OrderBy(l => l.ApiId)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();
        }

        /// <summary>
        /// Én location via officielt id.
        /// </summary>
        [HttpGet("locations/{id:int}")]
        public async Task<ActionResult<RmLocation>> GetLocation(int id)
        {
            var location = await _db.RickAndMortyLocations
                .FirstOrDefaultAsync(l => l.ApiId == id);
            if (location == null)
                return NotFound();
            return location;
        }

        /// <summary>
        /// Locations efter dimension.
        /// </summary>
        [HttpGet("locations/dimension/{dimension}")]
        public async Task<ActionResult<IEnumerable<RmLocation>>> GetLocationsByDimension(string dimension)
        {
            var list = await _db.RickAndMortyLocations
                .Where(l => l.Dimension.ToLower().Contains(dimension.ToLower()))
                .OrderBy(l => l.ApiId)
                .ToListAsync();
            if (list.Count == 0)
                return NotFound($"Ingen locations i dimension '{dimension}'");
            return list;
        }

        /// <summary>
        /// Unikke dimensioner.
        /// </summary>
        [HttpGet("locations/dimensions")]
        public async Task<ActionResult<IEnumerable<string>>> GetDimensions()
        {
            return await _db.RickAndMortyLocations
                .Select(l => l.Dimension)
                .Where(d => d != "")
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();
        }

        // ── Episodes ────────────────────────────────────────────────

        /// <summary>
        /// Alle episodes. Query: name, episode (kode), q, limit, offset.
        /// </summary>
        [HttpGet("episodes")]
        public async Task<ActionResult<IEnumerable<RmEpisode>>> GetEpisodes(
            [FromQuery] string? name,
            [FromQuery] string? episode,
            [FromQuery] string? q,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            if (limit < 1) limit = 1;
            if (limit > 200) limit = 200;
            if (offset < 0) offset = 0;

            var query = _db.RickAndMortyEpisodes.AsQueryable();

            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(e => e.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(episode))
                query = query.Where(e => e.EpisodeCode.ToLower().Contains(episode.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.ToLower();
                query = query.Where(e =>
                    e.Name.ToLower().Contains(term) ||
                    e.EpisodeCode.ToLower().Contains(term));
            }

            return await query
                .OrderBy(e => e.ApiId)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();
        }

        /// <summary>
        /// Én episode via officielt id.
        /// </summary>
        [HttpGet("episodes/{id:int}")]
        public async Task<ActionResult<RmEpisode>> GetEpisode(int id)
        {
            var episode = await _db.RickAndMortyEpisodes
                .FirstOrDefaultAsync(e => e.ApiId == id);
            if (episode == null)
                return NotFound();
            return episode;
        }

        /// <summary>
        /// Episodes i en sæson (fx 1 → S01E…).
        /// </summary>
        [HttpGet("episodes/season/{season:int}")]
        public async Task<ActionResult<IEnumerable<RmEpisode>>> GetEpisodesBySeason(int season)
        {
            if (season < 1 || season > 9)
                return BadRequest("Sæson skal være 1–9");

            var prefix = $"S{season:D2}";
            var list = await _db.RickAndMortyEpisodes
                .Where(e => e.EpisodeCode.StartsWith(prefix))
                .OrderBy(e => e.ApiId)
                .ToListAsync();
            if (list.Count == 0)
                return NotFound($"Ingen episodes i sæson {season}");
            return list;
        }
    }
}
