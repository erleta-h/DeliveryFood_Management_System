using System;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260522140000_AddDriverApplications")]
public class AddDriverApplications : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DriverApplications",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                CreatedById = table.Column<long>(type: "bigint", nullable: true),
                FirstName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                LastName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                Phone = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                VehicleType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                LicensePlate = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                Status = table.Column<byte>(type: "tinyint", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                UpdatedById = table.Column<long>(type: "bigint", nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DriverApplications", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DriverApplications_CreatedAt",
            table: "DriverApplications",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_DriverApplications_Email",
            table: "DriverApplications",
            column: "Email");

        migrationBuilder.CreateIndex(
            name: "IX_DriverApplications_Status",
            table: "DriverApplications",
            column: "Status");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "DriverApplications");
    }
}
