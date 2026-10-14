using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpgaverAPI.Services;

namespace OpgaverAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(AuthenticationSchemes = "Mercantec")]
    public class ApiKeysController : ControllerBase
    {
        private readonly ApiKeyService _keys;

        public ApiKeysController(ApiKeyService keys)
        {
            _keys = keys;
        }

        private string? UserSub =>
            User.FindFirstValue("sub")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Liste aktive API-nøgler for den indloggede Mercantec-bruger (kun prefix).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var sub = UserSub;
            if (string.IsNullOrWhiteSpace(sub))
                return Unauthorized("Mangler sub-claim");

            var keys = await _keys.ListForUserAsync(sub, ct);
            return Ok(keys.Select(k => new
            {
                k.Id,
                k.Name,
                k.KeyPrefix,
                k.CreatedAt,
                k.LastUsedAt
            }));
        }

        public record CreateApiKeyRequest(string? Name);

        /// <summary>
        /// Opret API-nøgle. Plaintext returneres kun i dette svar — gem den hemmeligt.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateApiKeyRequest? body, CancellationToken ct)
        {
            var sub = UserSub;
            if (string.IsNullOrWhiteSpace(sub))
                return Unauthorized("Mangler sub-claim");

            var (entity, plaintext) = await _keys.CreateAsync(sub, body?.Name, ct);
            return Ok(new
            {
                entity.Id,
                entity.Name,
                entity.KeyPrefix,
                key = plaintext,
                warning = "Gem nøglen nu. Den vises ikke igen."
            });
        }

        /// <summary>
        /// Tilbagekald egen API-nøgle.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Revoke(string id, CancellationToken ct)
        {
            var sub = UserSub;
            if (string.IsNullOrWhiteSpace(sub))
                return Unauthorized("Mangler sub-claim");

            var ok = await _keys.RevokeAsync(sub, id, ct);
            if (!ok) return NotFound();
            return NoContent();
        }
    }
}
