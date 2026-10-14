using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Attributes;
using OpgaverAPI.Context;
using OpgaverAPI.Models;
using OpgaverAPI.Services;

namespace OpgaverAPI.Controllers
{
    /// <summary>
    /// Lokalt Star Wars-encyklopædi seedet fra SWAPI (planeter, personer, film, arter, rumskibe).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class StarWarsController : ControllerBase
    {
        private readonly AppDBContext _db;
        private readonly StarWarsSeedService _seed;

        public StarWarsController(AppDBContext db, StarWarsSeedService seed)
        {
            _db = db;
            _seed = seed;
        }

        /// <summary>Overblik over seedet datasæt.</summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            return Ok(new
            {
                people = await _db.StarWarsPeople.CountAsync(),
                planets = await _db.StarWarsPlanets.CountAsync(),
                films = await _db.StarWarsFilms.CountAsync(),
                species = await _db.StarWarsSpecies.CountAsync(),
                starships = await _db.StarWarsStarships.CountAsync(),
                source = "https://swapi.info/ (SWAPI)",
                endpoints = new[]
                {
                    "/api/StarWars/people",
                    "/api/StarWars/planets",
                    "/api/StarWars/films",
                    "/api/StarWars/species",
                    "/api/StarWars/starships"
                }
            });
        }

        /// <summary>Re-seed fra SWAPI. Header: X-Seed-Key.</summary>
        [RequireSeedKey]
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromQuery] bool replace = true, CancellationToken ct = default)
        {
            var r = await _seed.SeedFromApiAsync(replace, ct);
            return Ok(new { r.People, r.Planets, r.Films, r.Species, r.Starships, replace });
        }

        // ── People ──────────────────────────────────────────────────

        /// <summary>Personer. Query: name, gender, q, limit, offset.</summary>
        [HttpGet("people")]
        public async Task<ActionResult<IEnumerable<SwPerson>>> GetPeople(
            [FromQuery] string? name, [FromQuery] string? gender, [FromQuery] string? q,
            [FromQuery] int limit = 100, [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 200, ref offset);
            var query = _db.StarWarsPeople.AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(p => p.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(gender))
                query = query.Where(p => p.Gender.ToLower() == gender.ToLower());
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(t) || p.BirthYear.ToLower().Contains(t));
            }
            return await query.OrderBy(p => p.ApiId).Skip(offset).Take(limit).ToListAsync();
        }

        [HttpGet("people/{id:int}")]
        public async Task<ActionResult<SwPerson>> GetPerson(int id)
        {
            var p = await _db.StarWarsPeople.FirstOrDefaultAsync(x => x.ApiId == id);
            return p == null ? NotFound() : p;
        }

        // ── Planets ─────────────────────────────────────────────────

        /// <summary>Planeter. Query: name, climate, terrain, q, limit, offset.</summary>
        [HttpGet("planets")]
        public async Task<ActionResult<IEnumerable<SwPlanet>>> GetPlanets(
            [FromQuery] string? name, [FromQuery] string? climate, [FromQuery] string? terrain,
            [FromQuery] string? q, [FromQuery] int limit = 100, [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 200, ref offset);
            var query = _db.StarWarsPlanets.AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(p => p.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(climate))
                query = query.Where(p => p.Climate.ToLower().Contains(climate.ToLower()));
            if (!string.IsNullOrWhiteSpace(terrain))
                query = query.Where(p => p.Terrain.ToLower().Contains(terrain.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(p =>
                    p.Name.ToLower().Contains(t) || p.Climate.ToLower().Contains(t) || p.Terrain.ToLower().Contains(t));
            }
            return await query.OrderBy(p => p.ApiId).Skip(offset).Take(limit).ToListAsync();
        }

        [HttpGet("planets/{id:int}")]
        public async Task<ActionResult<SwPlanet>> GetPlanet(int id)
        {
            var p = await _db.StarWarsPlanets.FirstOrDefaultAsync(x => x.ApiId == id);
            return p == null ? NotFound() : p;
        }

        // ── Films ───────────────────────────────────────────────────

        /// <summary>Film. Query: title, q.</summary>
        [HttpGet("films")]
        public async Task<ActionResult<IEnumerable<SwFilm>>> GetFilms(
            [FromQuery] string? title, [FromQuery] string? q)
        {
            var query = _db.StarWarsFilms.AsQueryable();
            if (!string.IsNullOrWhiteSpace(title))
                query = query.Where(f => f.Title.ToLower().Contains(title.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(f => f.Title.ToLower().Contains(t) || f.Director.ToLower().Contains(t));
            }
            return await query.OrderBy(f => f.EpisodeId).ToListAsync();
        }

        [HttpGet("films/{id:int}")]
        public async Task<ActionResult<SwFilm>> GetFilm(int id)
        {
            var f = await _db.StarWarsFilms.FirstOrDefaultAsync(x => x.ApiId == id);
            return f == null ? NotFound() : f;
        }

        [HttpGet("films/episode/{episodeId:int}")]
        public async Task<ActionResult<SwFilm>> GetFilmByEpisode(int episodeId)
        {
            var f = await _db.StarWarsFilms.FirstOrDefaultAsync(x => x.EpisodeId == episodeId);
            return f == null ? NotFound() : f;
        }

        // ── Species ─────────────────────────────────────────────────

        /// <summary>Arter. Query: name, classification, q, limit, offset.</summary>
        [HttpGet("species")]
        public async Task<ActionResult<IEnumerable<SwSpecies>>> GetSpecies(
            [FromQuery] string? name, [FromQuery] string? classification, [FromQuery] string? q,
            [FromQuery] int limit = 100, [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 200, ref offset);
            var query = _db.StarWarsSpecies.AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(s => s.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(classification))
                query = query.Where(s => s.Classification.ToLower().Contains(classification.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(t) || s.Classification.ToLower().Contains(t) || s.Language.ToLower().Contains(t));
            }
            return await query.OrderBy(s => s.ApiId).Skip(offset).Take(limit).ToListAsync();
        }

        [HttpGet("species/{id:int}")]
        public async Task<ActionResult<SwSpecies>> GetSpeciesById(int id)
        {
            var s = await _db.StarWarsSpecies.FirstOrDefaultAsync(x => x.ApiId == id);
            return s == null ? NotFound() : s;
        }

        // ── Starships ───────────────────────────────────────────────

        /// <summary>Rumskibe. Query: name, starshipClass, manufacturer, q, limit, offset.</summary>
        [HttpGet("starships")]
        public async Task<ActionResult<IEnumerable<SwStarship>>> GetStarships(
            [FromQuery] string? name, [FromQuery] string? starshipClass, [FromQuery] string? manufacturer,
            [FromQuery] string? q, [FromQuery] int limit = 100, [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 200, ref offset);
            var query = _db.StarWarsStarships.AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(s => s.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(starshipClass))
                query = query.Where(s => s.StarshipClass.ToLower().Contains(starshipClass.ToLower()));
            if (!string.IsNullOrWhiteSpace(manufacturer))
                query = query.Where(s => s.Manufacturer.ToLower().Contains(manufacturer.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(t) || s.Model.ToLower().Contains(t) || s.StarshipClass.ToLower().Contains(t));
            }
            return await query.OrderBy(s => s.ApiId).Skip(offset).Take(limit).ToListAsync();
        }

        [HttpGet("starships/{id:int}")]
        public async Task<ActionResult<SwStarship>> GetStarship(int id)
        {
            var s = await _db.StarWarsStarships.FirstOrDefaultAsync(x => x.ApiId == id);
            return s == null ? NotFound() : s;
        }

        private static void Clamp(ref int limit, int max, ref int offset)
        {
            if (limit < 1) limit = 1;
            if (limit > max) limit = max;
            if (offset < 0) offset = 0;
        }
    }
}
