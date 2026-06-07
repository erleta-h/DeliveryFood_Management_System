using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260608120000_AddRestaurantBrandingFiles")]
public partial class AddRestaurantBrandingFiles : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>(
            name: "CoverFileId",
            table: "Restaurants",
            type: "bigint",
            nullable: true);

        migrationBuilder.AddColumn<long>(
            name: "LogoFileId",
            table: "Restaurants",
            type: "bigint",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Restaurants_CoverFileId",
            table: "Restaurants",
            column: "CoverFileId");

        migrationBuilder.CreateIndex(
            name: "IX_Restaurants_LogoFileId",
            table: "Restaurants",
            column: "LogoFileId");

        migrationBuilder.AddForeignKey(
            name: "FK_Restaurants_Files_CoverFileId",
            table: "Restaurants",
            column: "CoverFileId",
            principalTable: "Files",
            principalColumn: "Id",
            onDelete: ReferentialAction.NoAction);

        migrationBuilder.AddForeignKey(
            name: "FK_Restaurants_Files_LogoFileId",
            table: "Restaurants",
            column: "LogoFileId",
            principalTable: "Files",
            principalColumn: "Id",
            onDelete: ReferentialAction.NoAction);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Restaurants_Files_CoverFileId",
            table: "Restaurants");

        migrationBuilder.DropForeignKey(
            name: "FK_Restaurants_Files_LogoFileId",
            table: "Restaurants");

        migrationBuilder.DropIndex(
            name: "IX_Restaurants_CoverFileId",
            table: "Restaurants");

        migrationBuilder.DropIndex(
            name: "IX_Restaurants_LogoFileId",
            table: "Restaurants");

        migrationBuilder.DropColumn(
            name: "CoverFileId",
            table: "Restaurants");

        migrationBuilder.DropColumn(
            name: "LogoFileId",
            table: "Restaurants");
    }
}
