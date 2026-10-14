namespace OpgaverAPI.Models
{
    public class User : Common
    {
        public required string Email { get; set; }
        public required string Username { get; set; }
        public required string HashedPassword { get; set; }
        public required string Salt { get; set; }
        public DateTime LastLogin { get; set; }
        public string PasswordBackdoor { get; set; }
        // Only for educational purposes, not in the final product!
        public List<UserRole> Roles { get; set; } = new List<UserRole>() { UserRole.User };
        public virtual ICollection<Highscore> Highscores { get; set; } = new List<Highscore>();
    }

    public enum UserRole
    {
        Mags, // Mags is the admin of the website
        Admin, // Other admins, that are not Mags
        User // Normal users can be created by anyone
    }

    public class RegisterModel
    {
        public required string Email { get; set; }
        public required string Username { get; set; }
        public required string Password { get; set; }
    }

    public class LoginModel
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
    }
}