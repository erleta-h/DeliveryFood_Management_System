using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Kolona audit për RefreshTokens — modeli i priste por InitialCreate i kishte vetëm CreatedAt.
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260523120000_AddRefreshTokenAuditColumns")]
public partial class AddRefreshTokenAuditColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>(
            name: "CreatedById",
            table: "RefreshTokens",
            type: "bigint",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "UpdatedAt",
            table: "RefreshTokens",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<long>(
            name: "UpdatedById",
            table: "RefreshTokens",
            type: "bigint",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_RefreshTokens_CreatedById",
            table: "RefreshTokens",
            column: "CreatedById");

        migrationBuilder.CreateIndex(
            name: "IX_RefreshTokens_UpdatedById",
            table: "RefreshTokens",
            column: "UpdatedById");

        migrationBuilder.AddForeignKey(
            name: "FK_RefreshTokens_Users_CreatedById",
            table: "RefreshTokens",
            column: "CreatedById",
            principalTable: "Users",
            principalColumn: "Id");

        migrationBuilder.AddForeignKey(
            name: "FK_RefreshTokens_Users_UpdatedById",
            table: "RefreshTokens",
            column: "UpdatedById",
            principalTable: "Users",
            principalColumn: "Id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_RefreshTokens_Users_UpdatedById",
            table: "RefreshTokens");

        migrationBuilder.DropForeignKey(
            name: "FK_RefreshTokens_Users_CreatedById",
            table: "RefreshTokens");

        migrationBuilder.DropIndex(
            name: "IX_RefreshTokens_UpdatedById",
            table: "RefreshTokens");

        migrationBuilder.DropIndex(
            name: "IX_RefreshTokens_CreatedById",
            table: "RefreshTokens");

        migrationBuilder.DropColumn(
            name: "UpdatedById",
            table: "RefreshTokens");

        migrationBuilder.DropColumn(
            name: "UpdatedAt",
            table: "RefreshTokens");

        migrationBuilder.DropColumn(
            name: "CreatedById",
            table: "RefreshTokens");
    }
}
