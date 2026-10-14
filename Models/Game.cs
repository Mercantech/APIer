namespace OpgaverAPI.Models
{
    public class Game : Common
    {
        public required string Name { get; set; }
        public string? Description { get; set; }

        // Navigation property
        public virtual ICollection<Highscore> Highscores { get; set; } = new List<Highscore>();
    }
}