using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using OpgaverAPI.Context;

#nullable disable

namespace OpgaverAPI.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDBContext))]
    [Migration("20261014140000_AddRickAndMorty")]
    public partial class AddRickAndMorty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RickAndMortyCharacters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Species = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Gender = table.Column<string>(type: "text", nullable: false),
                    Origin_Name = table.Column<string>(type: "text", nullable: false),
                    Origin_Url = table.Column<string>(type: "text", nullable: false),
                    Location_Name = table.Column<string>(type: "text", nullable: false),
                    Location_Url = table.Column<string>(type: "text", nullable: false),
                    Image = table.Column<string>(type: "text", nullable: false),
                    Episode = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RickAndMortyCharacters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RickAndMortyEpisodes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    AirDate = table.Column<string>(type: "text", nullable: false),
                    EpisodeCode = table.Column<string>(type: "text", nullable: false),
                    Characters = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RickAndMortyEpisodes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RickAndMortyLocations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    ApiId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Dimension = table.Column<string>(type: "text", nullable: false),
                    Residents = table.Column<List<string>>(type: "text[]", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RickAndMortyLocations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyCharacters_ApiId",
                table: "RickAndMortyCharacters",
                column: "ApiId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyCharacters_Species",
                table: "RickAndMortyCharacters",
                column: "Species");

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyCharacters_Status",
                table: "RickAndMortyCharacters",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyEpisodes_ApiId",
                table: "RickAndMortyEpisodes",
                column: "ApiId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyEpisodes_EpisodeCode",
                table: "RickAndMortyEpisodes",
                column: "EpisodeCode");

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyLocations_ApiId",
                table: "RickAndMortyLocations",
                column: "ApiId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RickAndMortyLocations_Dimension",
                table: "RickAndMortyLocations",
                column: "Dimension");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RickAndMortyCharacters");
            migrationBuilder.DropTable(name: "RickAndMortyEpisodes");
            migrationBuilder.DropTable(name: "RickAndMortyLocations");
        }
    }
}
