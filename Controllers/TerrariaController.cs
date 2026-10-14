using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Attributes;
using OpgaverAPI.Context;
using OpgaverAPI.Models;
using OpgaverAPI.Services;

namespace OpgaverAPI.Controllers
{
    /// <summary>
    /// Lokalt Terraria-datasæt (items, recipes, bosses).
    /// Tekstdata fra Terraria Wiki (CC BY-NC-SA) — ingen spilbilleder hostes.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class TerrariaController : ControllerBase
    {
        private readonly AppDBContext _db;
        private readonly TerrariaSeedService _seed;

        public TerrariaController(AppDBContext db, TerrariaSeedService seed)
        {
            _db = db;
            _seed = seed;
        }

        /// <summary>Overblik + licens/attribution.</summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary()
        {
            return Ok(new
            {
                items = await _db.TerrariaItems.CountAsync(),
                recipes = await _db.TerrariaRecipes.CountAsync(),
                npcs = await _db.TerrariaNpcs.CountAsync(),
                bosses = await _db.TerrariaNpcs.CountAsync(n => n.IsBoss),
                source = "https://terraria.wiki.gg (via community JSON-dump)",
                license = "CC BY-NC-SA — fan-data til undervisning, ikke affiliated med Re-Logic",
                images = "Ingen spilassets hostes. Brug wikiUrl til attribution/link.",
                endpoints = new[]
                {
                    "/api/Terraria/items",
                    "/api/Terraria/items/weapons",
                    "/api/Terraria/items/armor",
                    "/api/Terraria/recipes",
                    "/api/Terraria/bosses"
                }
            });
        }

        /// <summary>Re-seed fra wiki-dump. Header: X-Seed-Key.</summary>
        [RequireSeedKey]
        [HttpPost("seed")]
        public async Task<IActionResult> Seed([FromQuery] bool replace = true, CancellationToken ct = default)
        {
            var r = await _seed.SeedFromDumpAsync(replace, ct);
            return Ok(new { r.Items, r.Recipes, r.Npcs, r.Bosses, replace });
        }

        // ── Items ───────────────────────────────────────────────────

        /// <summary>
        /// Items. Query: name, category, damageType, q, craftable, limit, offset.
        /// category: weapon|armor|accessory|tool|vanity|material|other
        /// </summary>
        [HttpGet("items")]
        public async Task<ActionResult<IEnumerable<TerrariaItem>>> GetItems(
            [FromQuery] string? name,
            [FromQuery] string? category,
            [FromQuery] string? damageType,
            [FromQuery] string? q,
            [FromQuery] bool? craftable,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 500, ref offset);
            var query = _db.TerrariaItems.AsQueryable();
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(i => i.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(category))
                query = query.Where(i => i.Category.ToLower() == category.ToLower());
            if (!string.IsNullOrWhiteSpace(damageType))
                query = query.Where(i => i.DamageType.ToLower().Contains(damageType.ToLower()));
            if (craftable == true)
                query = query.Where(i => i.HasRecipe);
            if (craftable == false)
                query = query.Where(i => !i.HasRecipe);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(i =>
                    i.Name.ToLower().Contains(t) || i.Type.ToLower().Contains(t) || i.Tooltip.ToLower().Contains(t));
            }

            return await query.OrderBy(i => i.ItemId).Skip(offset).Take(limit).ToListAsync();
        }

        [HttpGet("items/{id:int}")]
        public async Task<ActionResult<object>> GetItem(int id)
        {
            var item = await _db.TerrariaItems.FirstOrDefaultAsync(i => i.ItemId == id);
            if (item == null) return NotFound();
            var recipes = await _db.TerrariaRecipes
                .Where(r => r.ResultItemId == id)
                .ToListAsync();
            return Ok(new { item, recipes });
        }

        [HttpGet("items/weapons")]
        public Task<ActionResult<IEnumerable<TerrariaItem>>> GetWeapons(
            [FromQuery] string? damageType, [FromQuery] string? q,
            [FromQuery] int limit = 100, [FromQuery] int offset = 0)
            => GetItems(null, "weapon", damageType, q, null, limit, offset);

        [HttpGet("items/armor")]
        public Task<ActionResult<IEnumerable<TerrariaItem>>> GetArmor(
            [FromQuery] string? q, [FromQuery] int limit = 100, [FromQuery] int offset = 0)
            => GetItems(null, "armor", null, q, null, limit, offset);

        /// <summary>Unikke item-kategorier.</summary>
        [HttpGet("items/categories")]
        public async Task<ActionResult<IEnumerable<string>>> GetCategories()
        {
            return await _db.TerrariaItems
                .Select(i => i.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();
        }

        // ── Recipes ─────────────────────────────────────────────────

        /// <summary>Crafting-opskrifter. Query: result, station, ingredient, q, limit, offset.</summary>
        [HttpGet("recipes")]
        public async Task<ActionResult<IEnumerable<TerrariaRecipe>>> GetRecipes(
            [FromQuery] string? result,
            [FromQuery] string? station,
            [FromQuery] string? ingredient,
            [FromQuery] string? q,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 500, ref offset);
            var query = _db.TerrariaRecipes.AsQueryable();
            if (!string.IsNullOrWhiteSpace(result))
                query = query.Where(r => r.ResultName.ToLower().Contains(result.ToLower()));
            if (!string.IsNullOrWhiteSpace(station))
                query = query.Where(r => r.Station.ToLower().Contains(station.ToLower()));
            if (!string.IsNullOrWhiteSpace(ingredient))
            {
                var ing = ingredient.ToLower();
                query = query.Where(r => r.Ingredients.Any(i => i.ToLower().Contains(ing)));
            }
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(r =>
                    r.ResultName.ToLower().Contains(t) ||
                    r.Station.ToLower().Contains(t) ||
                    r.Ingredients.Any(i => i.ToLower().Contains(t)));
            }

            return await query.OrderBy(r => r.ResultName).Skip(offset).Take(limit).ToListAsync();
        }

        /// <summary>Unikke crafting stations.</summary>
        [HttpGet("recipes/stations")]
        public async Task<ActionResult<IEnumerable<string>>> GetStations()
        {
            return await _db.TerrariaRecipes
                .Select(r => r.Station)
                .Where(s => s != "")
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();
        }

        // ── Bosses / NPCs ────────────────────────────────────────────

        /// <summary>Bosses til progression-tracker. Query: stage (Pre-Hardmode|Hardmode|Event), q.</summary>
        [HttpGet("bosses")]
        public async Task<ActionResult<IEnumerable<TerrariaNpc>>> GetBosses(
            [FromQuery] string? stage, [FromQuery] string? q)
        {
            var query = _db.TerrariaNpcs.Where(n => n.IsBoss);
            if (!string.IsNullOrWhiteSpace(stage))
                query = query.Where(n => n.Stage.ToLower() == stage.ToLower());
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(n => n.Name.ToLower().Contains(t));
            }
            return await query.OrderBy(n => n.Stage).ThenBy(n => n.Name).ToListAsync();
        }

        [HttpGet("bosses/{id:int}")]
        public async Task<ActionResult<TerrariaNpc>> GetBoss(int id)
        {
            var n = await _db.TerrariaNpcs.FirstOrDefaultAsync(x => x.NpcId == id && x.IsBoss);
            return n == null ? NotFound() : n;
        }

        /// <summary>Alle NPCs (inkl. enemies). Query: name, bossOnly, q, limit, offset.</summary>
        [HttpGet("npcs")]
        public async Task<ActionResult<IEnumerable<TerrariaNpc>>> GetNpcs(
            [FromQuery] string? name,
            [FromQuery] bool bossOnly = false,
            [FromQuery] string? q = null,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            Clamp(ref limit, 500, ref offset);
            var query = _db.TerrariaNpcs.AsQueryable();
            if (bossOnly) query = query.Where(n => n.IsBoss);
            if (!string.IsNullOrWhiteSpace(name))
                query = query.Where(n => n.Name.ToLower().Contains(name.ToLower()));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.ToLower();
                query = query.Where(n => n.Name.ToLower().Contains(t));
            }
            return await query.OrderBy(n => n.NpcId).Skip(offset).Take(limit).ToListAsync();
        }

        private static void Clamp(ref int limit, int max, ref int offset)
        {
            if (limit < 1) limit = 1;
            if (limit > max) limit = max;
            if (offset < 0) offset = 0;
        }
    }
}
