namespace OpgaverAPI.Models
{
    /// <summary>
    /// Persistent kaldtæller pr. HTTP-metode + route-template.
    /// Live-tal holdes i hukommelse og flushes periodisk hertil.
    /// </summary>
    public class EndpointCallStat
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Method { get; set; } = "";
        public string Path { get; set; } = "";
        public long CallCount { get; set; }
        public DateTime? LastCalledAt { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
