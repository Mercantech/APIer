namespace OpgaverAPI.Models
{
    public class Highscore : Common
    {
        public int Score { get; set; }
        public DateTime AchievedAt { get; set; }

        // Foreign keys
        public required string UserId { get; set; }
        public required string GameId { get; set; }

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Game Game { get; set; } = null!;
    }
}