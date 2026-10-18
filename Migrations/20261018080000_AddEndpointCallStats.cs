using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using OpgaverAPI.Context;

#nullable disable

namespace OpgaverAPI.Migrations
{
    [DbContext(typeof(AppDBContext))]
    [Migration("20261018080000_AddEndpointCallStats")]
    public partial class AddEndpointCallStats : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EndpointCallStats",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Method = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Path = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    CallCount = table.Column<long>(type: "bigint", nullable: false),
                    LastCalledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_EndpointCallStats", x => x.Id));

            migrationBuilder.CreateIndex(
                name: "IX_EndpointCallStats_Method_Path",
                table: "EndpointCallStats",
                columns: new[] { "Method", "Path" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "EndpointCallStats");
        }
    }
}
