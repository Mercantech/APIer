using Microsoft.EntityFrameworkCore;
using OpgaverAPI.Models;

namespace OpgaverAPI.Context
{
    public class AppDBContext : DbContext
    {
        public DbSet<User> Users { get; set; }
        public DbSet<LolChampion> Champions { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<Highscore> Highscores { get; set; }


        public AppDBContext(DbContextOptions<AppDBContext> options)
            : base(options)
        {
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker
                .Entries()
                .Where(e => e.Entity is Common && (
                    e.State == EntityState.Added ||
                    e.State == EntityState.Modified));

            foreach (var entityEntry in entries)
            {
                var entity = (Common)entityEntry.Entity;

                if (entityEntry.State == EntityState.Added)
                {
                    entity.Id = Guid.NewGuid().ToString();
                    entity.CreatedAt = DateTime.UtcNow;
                }

                entity.UpdatedAt = DateTime.UtcNow;
            }

            return base.SaveChangesAsync(cancellationToken);
        }
    }
}
