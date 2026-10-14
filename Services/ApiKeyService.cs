using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    public class ApiKeyService
    {
        public const string HeaderName = "X-Api-Key";
        public const string Prefix = "apier_";

        private readonly AppDBContext _db;

        public ApiKeyService(AppDBContext db)
        {
            _db = db;
        }

        public static string HashKey(string plaintext)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(plaintext));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        public static string GeneratePlaintext()
        {
            var raw = RandomNumberGenerator.GetBytes(32);
            var b64 = Convert.ToBase64String(raw)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
            return Prefix + b64;
        }

        public static string MakePrefix(string plaintext)
        {
            // "apier_" + 8 tegn af den hemmelige del
            var body = plaintext.Length > Prefix.Length
                ? plaintext[Prefix.Length..]
                : plaintext;
            var take = Math.Min(8, body.Length);
            return Prefix + body[..take];
        }

        public async Task<(ApiKey entity, string plaintext)> CreateAsync(
            string userSub,
            string? name,
            CancellationToken ct = default)
        {
            var plaintext = GeneratePlaintext();
            var entity = new ApiKey
            {
                Id = Guid.NewGuid().ToString(),
                UserSub = userSub,
                Name = string.IsNullOrWhiteSpace(name) ? "default" : name.Trim(),
                KeyPrefix = MakePrefix(plaintext),
                KeyHash = HashKey(plaintext),
                CreatedAt = DateTime.UtcNow
            };

            _db.ApiKeys.Add(entity);
            await _db.SaveChangesAsync(ct);
            return (entity, plaintext);
        }

        public Task<List<ApiKey>> ListForUserAsync(string userSub, CancellationToken ct = default)
        {
            return _db.ApiKeys
                .AsNoTracking()
                .Where(k => k.UserSub == userSub && k.RevokedAt == null)
                .OrderByDescending(k => k.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<bool> RevokeAsync(string userSub, string id, CancellationToken ct = default)
        {
            var key = await _db.ApiKeys
                .FirstOrDefaultAsync(k => k.Id == id && k.UserSub == userSub && k.RevokedAt == null, ct);
            if (key == null) return false;

            key.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        public async Task<ApiKey?> ValidateAndTouchAsync(string plaintext, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(plaintext) || !plaintext.StartsWith(Prefix, StringComparison.Ordinal))
                return null;

            var hash = HashKey(plaintext);
            var key = await _db.ApiKeys
                .FirstOrDefaultAsync(k => k.KeyHash == hash && k.RevokedAt == null, ct);
            if (key == null) return null;

            key.LastUsedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return key;
        }
    }
}
