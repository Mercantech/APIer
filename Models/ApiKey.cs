namespace OpgaverAPI.Models
{
    /// <summary>
    /// Per-bruger API-nøgle (Mercantec Auth sub). Plaintext gemmes aldrig — kun hash + prefix.
    /// </summary>
    public class ApiKey
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();

        /// <summary>Mercantec JWT claim "sub" (GUID-streng).</summary>
        public string UserSub { get; set; } = string.Empty;

        public string Name { get; set; } = "default";

        /// <summary>Synlig prefix til UI (fx "apier_Ab12Cd34").</summary>
        public string KeyPrefix { get; set; } = string.Empty;

        /// <summary>SHA-256 hex af fuld nøgle.</summary>
        public string KeyHash { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastUsedAt { get; set; }

        public DateTime? RevokedAt { get; set; }
    }
}
