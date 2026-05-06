using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Kolonat u shtuan në model por mungonin nga InitialCreate — përputhje me <see cref="FoodDelivery.Domain.Entities.User"/>.
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260422120000_AddUserEmailConfirmedAndLastLogin")]
public class AddUserEmailConfirmedAndLastLogin : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "EmailConfirmed",
            table: "Users",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTime>(
            name: "LastLoginAt",
            table: "Users",
            type: "datetime2",
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "LastLoginAt",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "EmailConfirmed",
            table: "Users");
    }
}
