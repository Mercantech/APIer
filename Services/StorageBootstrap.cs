using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using OpgaverAPI.Context;
using OpgaverAPI.Models;

namespace OpgaverAPI.Services
{
    /// <summary>
    /// Sikrer at Mongo-collection og Postgres-tabeller er klar til data.
    /// </summary>
    public static class StorageBootstrap
    {
        public const string CountriesCollection = "countries";

        public static async Task EnsureAsync(IServiceProvider services, CancellationToken ct = default)
        {
            using var scope = services.CreateScope();
            var sp = scope.ServiceProvider;

            var db = sp.GetRequiredService<AppDBContext>();
            await db.Database.MigrateAsync(ct);

            // Touch tabeller så Migrate + model er synlige/klare.
            _ = db.Champions.Any();
            _ = db.RickAndMortyCharacters.Any();
            _ = db.StarWarsPeople.Any();
            _ = db.TerrariaItems.Any();

            var mongo = sp.GetRequiredService<IMongoDatabase>();
            var countries = mongo.GetCollection<Country>(CountriesCollection);

            var indexes = new[]
            {
                new CreateIndexModel<Country>(
                    Builders<Country>.IndexKeys.Ascending(c => c.Cca3),
                    new CreateIndexOptions { Name = "ix_cca3", Unique = false }),
                new CreateIndexModel<Country>(
                    Builders<Country>.IndexKeys.Ascending("name.common"),
                    new CreateIndexOptions { Name = "ix_name_common" }),
                new CreateIndexModel<Country>(
                    Builders<Country>.IndexKeys.Ascending(c => c.Region),
                    new CreateIndexOptions { Name = "ix_region" })
            };

            await countries.Indexes.CreateManyAsync(indexes, cancellationToken: ct);
        }
    }
}
