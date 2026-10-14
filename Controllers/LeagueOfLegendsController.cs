using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Models;
using OpgaverAPI.Context;
using Microsoft.AspNetCore.Authorization;
namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class LeagueOfLegendsController : ControllerBase
    {
        private readonly AppDBContext _context;

        public LeagueOfLegendsController(AppDBContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Henter alle League of Legends champions.
        /// </summary>
        /// <returns>En liste af champions.</returns>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LolChampion>>> GetChampions()
        {
            return await _context.Champions.ToListAsync();
        }

        /// <summary>
        /// Opretter en ny champion. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="champion">Champion-objektet der skal oprettes.</param>
        /// <returns>Den oprettede champion.</returns>
        [Authorize(Roles = "Mags")]
        [HttpPost]
        public async Task<ActionResult<LolChampion>> CreateChampion(LolChampion champion)
        {
            _context.Champions.Add(champion);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetChampion), new { id = champion.Id }, champion);
        }

        /// <summary>
        /// Opdaterer en eksisterende champion. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="id">ID'et på den champion der skal opdateres.</param>
        /// <param name="champion">Det opdaterede champion-objekt.</param>
        /// <returns>Statuskode.</returns>
        [Authorize(Roles = "Mags")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateChampion(string id, LolChampion champion)
        {
            if (id != champion.Id)
            {
                return BadRequest();
            }

            _context.Entry(champion).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ChampionExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        /// <summary>
        /// Sletter en champion. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="id">ID'et på den champion der skal slettes.</param>
        /// <returns>Statuskode.</returns>
        [Authorize(Roles = "Mags")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChampion(string id)
        {
            var champion = await _context.Champions.FindAsync(id);
            if (champion == null)
            {
                return NotFound();
            }

            _context.Champions.Remove(champion);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Henter champions baseret på navn.
        /// </summary>
        /// <param name="name">Søgestrengen for champion-navn.</param>
        /// <returns>En liste af champions der matcher søgningen.</returns>
        [HttpGet("name/{name}")]
        public async Task<ActionResult<IEnumerable<LolChampion>>> GetChampionsByName(string name)
        {
            var champions = await _context.Champions
                .Where(c => c.Name.ToLower().Contains(name.ToLower()))
                .ToListAsync();

            if (!champions.Any())
            {
                return NotFound($"No champions found with name containing '{name}'");
            }

            return champions;
        }

        /// <summary>
        /// Henter champions baseret på klasse.
        /// </summary>
        /// <param name="className">Klassenavnet der skal søges efter.</param>
        /// <returns>En liste af champions i den specificerede klasse.</returns>
        [HttpGet("class/{className}")]
        public async Task<ActionResult<IEnumerable<LolChampion>>> GetChampionsByClass(string className)
        {
            var champions = await _context.Champions
                .Where(c => c.Classes != null && c.Classes.Any(cl => cl.ToLower().Contains(className.ToLower())))
                .ToListAsync();

            if (!champions.Any())
            {
                return NotFound($"No champions found in class '{className}'");
            }

            return champions;
        }

        /// <summary>
        /// Henter en liste over alle unikke champion-klasser.
        /// </summary>
        /// <returns>En liste af klassenavne.</returns>
        [HttpGet("classes")]
        public async Task<ActionResult<IEnumerable<string>>> GetAllClasses()
        {
            var allClasses = await _context.Champions
                .Where(c => c.Classes != null)
                .SelectMany(c => c.Classes)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            if (!allClasses.Any())
            {
                return NotFound("No champion classes found");
            }

            return allClasses;
        }

        /// <summary>
        /// Henter en specifik champion via ID.
        /// </summary>
        /// <param name="id">ID'et på den champion der skal hentes.</param>
        /// <returns>Champion-objektet.</returns>
        [HttpGet("{id}")]
        public async Task<ActionResult<LolChampion>> GetChampion(string id)
        {
            var champion = await _context.Champions.FindAsync(id);
            if (champion == null)
            {
                return NotFound();
            }
            return champion;
        }

        private bool ChampionExists(string id)
        {
            return _context.Champions.Any(e => e.Id == id);
        }
    }
}