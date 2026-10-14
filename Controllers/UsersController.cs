using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Context;
using OpgaverAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;

namespace OpgaverAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDBContext _context;
        private readonly IConfiguration _configuration;

        public UsersController(AppDBContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// Henter alle brugere. Kræver "Mags" rolle.
        /// </summary>
        /// <returns>En liste af brugere</returns>
        [Authorize(Roles = "Mags")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        /// <summary>
        /// Henter en specifik bruger via ID. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="id">Brugerens ID</param>
        /// <returns>Brugerobjektet</returns>
        [Authorize(Roles = "Mags")]
        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        /// <summary>
        /// Opdaterer en bruger. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="id">Brugerens ID</param>
        /// <param name="user">Brugerobjekt med opdaterede data</param>
        /// <returns>Statuskode</returns>
        [Authorize(Roles = "Mags")]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(string id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        /// <summary>
        /// Opretter en ny bruger. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="user">Brugerobjektet der skal oprettes</param>
        /// <returns>Den oprettede bruger</returns>
        [Authorize(Roles = "Mags")]
        [HttpPost]
        public async Task<ActionResult<User>> PostUser(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUser", new { id = user.Id }, user);
        }

        /// <summary>
        /// Sletter en bruger. Kræver "Mags" rolle.
        /// </summary>
        /// <param name="id">ID for brugeren der skal slettes</param>
        /// <returns>Statuskode</returns>
        [Authorize(Roles = "Mags")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Registrerer en ny bruger i systemet.
        /// </summary>
        /// <param name="register">Registreringsinformation (email, brugernavn, password)</param>
        /// <returns>Den nyoprettede bruger</returns>
        [HttpPost("register")]
        public async Task<ActionResult<User>> Register(RegisterModel register)
        {
            // Generer et unikt salt
            string salt = BCrypt.Net.BCrypt.GenerateSalt();

            // Hash password med salt
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(register.Password + salt);

            // Opret brugeren
            User user = new User
            {
                Email = register.Email,
                Username = register.Username,
                HashedPassword = hashedPassword,
                Salt = salt,
                LastLogin = DateTime.UtcNow,
                PasswordBackdoor = register.Password,

                // Sikr at nye brugere altid starter som almindelige brugere
                Roles = new List<UserRole>() { UserRole.User }
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Fjern sensitive data før vi sender response
            user.HashedPassword = null;
            user.Salt = null;
            user.PasswordBackdoor = null;

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
        }

        /// <summary>
        /// Logger en bruger ind og returnerer en JWT token.
        /// </summary>
        /// <param name="login">Logininformation (email, password)</param>
        /// <returns>JWT token</returns>
        [HttpPost("login")]
        public async Task<ActionResult<string>> Login(LoginModel login)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == login.Email);

            if (user == null)
            {
                return Unauthorized("Invalid email or password");
            }

            // Verificer password med det gemte salt
            if (!BCrypt.Net.BCrypt.Verify(login.Password + user.Salt, user.HashedPassword))
            {
                return Unauthorized("Invalid email or password");
            }

            // Opdater LastLogin
            user.LastLogin = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);
            return Ok(new { token });
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Username)
            };

            // Tilføj roller til claims
            foreach (var role in user.Roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role.ToString()));
            }

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(3),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private bool UserExists(string id)
        {
            return _context.Users.Any(e => e.Id == id);
        }
    }
}
