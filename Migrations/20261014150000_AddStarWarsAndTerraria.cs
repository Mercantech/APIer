using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using OpgaverAPI.Context;

#nullable disable

namespace OpgaverAPI.Migrations
{
    [DbContext(typeof(AppDBContext))]
    [Migration("20261014150000_AddStarWarsAndTerraria")]
    public partial class AddStarWarsAndTerraria : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StarWarsPeople",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Height = table.Column<string>(type: "text", nullable: false),
                    Mass = table.Column<string>(type: "text", nullable: false),
                    HairColor = table.Column<string>(type: "text", nullable: false),
                    SkinColor = table.Column<string>(type: "text", nullable: false),
                    EyeColor = table.Column<string>(type: "text", nullable: false),
                    BirthYear = table.Column<string>(type: "text", nullable: false),
                    Gender = table.Column<string>(type: "text", nullable: false),
                    Homeworld = table.Column<string>(type: "text", nullable: false),
                    Films = table.Column<List<string>>(type: "text[]", nullable: false),
                    Species = table.Column<List<string>>(type: "text[]", nullable: false),
                    Vehicles = table.Column<List<string>>(type: "text[]", nullable: false),
                    Starships = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_StarWarsPeople", x => x.Id));

            migrationBuilder.CreateTable(
                name: "StarWarsPlanets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    RotationPeriod = table.Column<string>(type: "text", nullable: false),
                    OrbitalPeriod = table.Column<string>(type: "text", nullable: false),
                    Diameter = table.Column<string>(type: "text", nullable: false),
                    Climate = table.Column<string>(type: "text", nullable: false),
                    Gravity = table.Column<string>(type: "text", nullable: false),
                    Terrain = table.Column<string>(type: "text", nullable: false),
                    SurfaceWater = table.Column<string>(type: "text", nullable: false),
                    Population = table.Column<string>(type: "text", nullable: false),
                    Residents = table.Column<List<string>>(type: "text[]", nullable: false),
                    Films = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_StarWarsPlanets", x => x.Id));

            migrationBuilder.CreateTable(
                name: "StarWarsFilms",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    EpisodeId = table.Column<int>(type: "integer", nullable: false),
                    OpeningCrawl = table.Column<string>(type: "text", nullable: false),
                    Director = table.Column<string>(type: "text", nullable: false),
                    Producer = table.Column<string>(type: "text", nullable: false),
                    ReleaseDate = table.Column<string>(type: "text", nullable: false),
                    Characters = table.Column<List<string>>(type: "text[]", nullable: false),
                    Planets = table.Column<List<string>>(type: "text[]", nullable: false),
                    Starships = table.Column<List<string>>(type: "text[]", nullable: false),
                    Vehicles = table.Column<List<string>>(type: "text[]", nullable: false),
                    Species = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_StarWarsFilms", x => x.Id));

            migrationBuilder.CreateTable(
                name: "StarWarsSpecies",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Classification = table.Column<string>(type: "text", nullable: false),
                    Designation = table.Column<string>(type: "text", nullable: false),
                    AverageHeight = table.Column<string>(type: "text", nullable: false),
                    SkinColors = table.Column<string>(type: "text", nullable: false),
                    HairColors = table.Column<string>(type: "text", nullable: false),
                    EyeColors = table.Column<string>(type: "text", nullable: false),
                    AverageLifespan = table.Column<string>(type: "text", nullable: false),
                    Homeworld = table.Column<string>(type: "text", nullable: false),
                    Language = table.Column<string>(type: "text", nullable: false),
                    People = table.Column<List<string>>(type: "text[]", nullable: false),
                    Films = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_StarWarsSpecies", x => x.Id));

            migrationBuilder.CreateTable(
                name: "StarWarsStarships",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "text", nullable: false),
                    Manufacturer = table.Column<string>(type: "text", nullable: false),
                    CostInCredits = table.Column<string>(type: "text", nullable: false),
                    Length = table.Column<string>(type: "text", nullable: false),
                    MaxAtmospheringSpeed = table.Column<string>(type: "text", nullable: false),
                    Crew = table.Column<string>(type: "text", nullable: false),
                    Passengers = table.Column<string>(type: "text", nullable: false),
                    CargoCapacity = table.Column<string>(type: "text", nullable: false),
                    Consumables = table.Column<string>(type: "text", nullable: false),
                    HyperdriveRating = table.Column<string>(type: "text", nullable: false),
                    Mglt = table.Column<string>(type: "text", nullable: false),
                    StarshipClass = table.Column<string>(type: "text", nullable: false),
                    Pilots = table.Column<List<string>>(type: "text[]", nullable: false),
                    Films = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_StarWarsStarships", x => x.Id));

            migrationBuilder.CreateTable(
                name: "TerrariaItems",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ItemId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Tooltip = table.Column<string>(type: "text", nullable: false),
                    Rarity = table.Column<int>(type: "integer", nullable: false),
                    SellValue = table.Column<string>(type: "text", nullable: false),
                    Damage = table.Column<int>(type: "integer", nullable: true),
                    DamageType = table.Column<string>(type: "text", nullable: false),
                    Defense = table.Column<int>(type: "integer", nullable: true),
                    UseTime = table.Column<string>(type: "text", nullable: false),
                    CritChance = table.Column<string>(type: "text", nullable: false),
                    Knockback = table.Column<string>(type: "text", nullable: false),
                    WikiUrl = table.Column<string>(type: "text", nullable: false),
                    HasRecipe = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_TerrariaItems", x => x.Id));

            migrationBuilder.CreateTable(
                name: "TerrariaRecipes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ResultItemId = table.Column<int>(type: "integer", nullable: false),
                    ResultName = table.Column<string>(type: "text", nullable: false),
                    ResultAmount = table.Column<int>(type: "integer", nullable: false),
                    Station = table.Column<string>(type: "text", nullable: false),
                    Ingredients = table.Column<List<string>>(type: "text[]", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_TerrariaRecipes", x => x.Id));

            migrationBuilder.CreateTable(
                name: "TerrariaNpcs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    NpcId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Life = table.Column<string>(type: "text", nullable: false),
                    Defense = table.Column<string>(type: "text", nullable: false),
                    IsBoss = table.Column<bool>(type: "boolean", nullable: false),
                    Stage = table.Column<string>(type: "text", nullable: false),
                    WikiUrl = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_TerrariaNpcs", x => x.Id));

            migrationBuilder.CreateIndex(name: "IX_StarWarsPeople_ApiId", table: "StarWarsPeople", column: "ApiId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_StarWarsPlanets_ApiId", table: "StarWarsPlanets", column: "ApiId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_StarWarsFilms_ApiId", table: "StarWarsFilms", column: "ApiId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_StarWarsFilms_EpisodeId", table: "StarWarsFilms", column: "EpisodeId");
            migrationBuilder.CreateIndex(name: "IX_StarWarsSpecies_ApiId", table: "StarWarsSpecies", column: "ApiId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_StarWarsStarships_ApiId", table: "StarWarsStarships", column: "ApiId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_TerrariaItems_ItemId", table: "TerrariaItems", column: "ItemId", unique: true);
            migrationBuilder.CreateIndex(name: "IX_TerrariaItems_Category", table: "TerrariaItems", column: "Category");
            migrationBuilder.CreateIndex(name: "IX_TerrariaItems_Name", table: "TerrariaItems", column: "Name");
            migrationBuilder.CreateIndex(name: "IX_TerrariaRecipes_ResultItemId", table: "TerrariaRecipes", column: "ResultItemId");
            migrationBuilder.CreateIndex(name: "IX_TerrariaRecipes_Station", table: "TerrariaRecipes", column: "Station");
            migrationBuilder.CreateIndex(name: "IX_TerrariaNpcs_NpcId", table: "TerrariaNpcs", column: "NpcId");
            migrationBuilder.CreateIndex(name: "IX_TerrariaNpcs_IsBoss", table: "TerrariaNpcs", column: "IsBoss");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "StarWarsPeople");
            migrationBuilder.DropTable(name: "StarWarsPlanets");
            migrationBuilder.DropTable(name: "StarWarsFilms");
            migrationBuilder.DropTable(name: "StarWarsSpecies");
            migrationBuilder.DropTable(name: "StarWarsStarships");
            migrationBuilder.DropTable(name: "TerrariaItems");
            migrationBuilder.DropTable(name: "TerrariaRecipes");
            migrationBuilder.DropTable(name: "TerrariaNpcs");
        }
    }
}
