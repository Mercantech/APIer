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
        public DbSet<ApiKey> ApiKeys { get; set; }
        public DbSet<RmCharacter> RickAndMortyCharacters { get; set; }
        public DbSet<RmLocation> RickAndMortyLocations { get; set; }
        public DbSet<RmEpisode> RickAndMortyEpisodes { get; set; }
        public DbSet<SwPerson> StarWarsPeople { get; set; }
        public DbSet<SwPlanet> StarWarsPlanets { get; set; }
        public DbSet<SwFilm> StarWarsFilms { get; set; }
        public DbSet<SwSpecies> StarWarsSpecies { get; set; }
        public DbSet<SwStarship> StarWarsStarships { get; set; }
        public DbSet<TerrariaItem> TerrariaItems { get; set; }
        public DbSet<TerrariaRecipe> TerrariaRecipes { get; set; }
        public DbSet<TerrariaNpc> TerrariaNpcs { get; set; }

        public AppDBContext(DbContextOptions<AppDBContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ApiKey>(e =>
            {
                e.HasIndex(x => x.KeyHash).IsUnique();
                e.HasIndex(x => x.UserSub);
            });

            modelBuilder.Entity<RmCharacter>(e =>
            {
                e.ToTable("RickAndMortyCharacters");
                e.HasIndex(x => x.ApiId).IsUnique();
                e.HasIndex(x => x.Status);
                e.HasIndex(x => x.Species);
                e.OwnsOne(x => x.Origin);
                e.OwnsOne(x => x.Location);
            });

            modelBuilder.Entity<RmLocation>(e =>
            {
                e.ToTable("RickAndMortyLocations");
                e.HasIndex(x => x.ApiId).IsUnique();
                e.HasIndex(x => x.Dimension);
            });

            modelBuilder.Entity<RmEpisode>(e =>
            {
                e.ToTable("RickAndMortyEpisodes");
                e.HasIndex(x => x.ApiId).IsUnique();
                e.HasIndex(x => x.EpisodeCode);
            });

            modelBuilder.Entity<SwPerson>(e =>
            {
                e.ToTable("StarWarsPeople");
                e.HasIndex(x => x.ApiId).IsUnique();
            });
            modelBuilder.Entity<SwPlanet>(e =>
            {
                e.ToTable("StarWarsPlanets");
                e.HasIndex(x => x.ApiId).IsUnique();
            });
            modelBuilder.Entity<SwFilm>(e =>
            {
                e.ToTable("StarWarsFilms");
                e.HasIndex(x => x.ApiId).IsUnique();
                e.HasIndex(x => x.EpisodeId);
            });
            modelBuilder.Entity<SwSpecies>(e =>
            {
                e.ToTable("StarWarsSpecies");
                e.HasIndex(x => x.ApiId).IsUnique();
            });
            modelBuilder.Entity<SwStarship>(e =>
            {
                e.ToTable("StarWarsStarships");
                e.HasIndex(x => x.ApiId).IsUnique();
            });

            modelBuilder.Entity<TerrariaItem>(e =>
            {
                e.ToTable("TerrariaItems");
                e.HasIndex(x => x.ItemId).IsUnique();
                e.HasIndex(x => x.Category);
                e.HasIndex(x => x.Name);
            });
            modelBuilder.Entity<TerrariaRecipe>(e =>
            {
                e.ToTable("TerrariaRecipes");
                e.HasIndex(x => x.ResultItemId);
                e.HasIndex(x => x.Station);
            });
            modelBuilder.Entity<TerrariaNpc>(e =>
            {
                e.ToTable("TerrariaNpcs");
                e.HasIndex(x => x.NpcId);
                e.HasIndex(x => x.IsBoss);
            });
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
