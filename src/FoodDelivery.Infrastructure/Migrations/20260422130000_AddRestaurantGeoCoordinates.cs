using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// <c>InitialCreate</c> e kishte tabelën <c>Restaurants</c> pa koordinata; modeli <see cref="FoodDelivery.Domain.Entities.Restaurant" /> i përmban.
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260422130000_AddRestaurantGeoCoordinates")]
public class AddRestaurantGeoCoordinates : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<double>(
            name: "Latitude",
            table: "Restaurants",
            type: "float",
            nullable: true);

        migrationBuilder.AddColumn<double>(
            name: "Longitude",
            table: "Restaurants",
            type: "float",
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Longitude",
            table: "Restaurants");

        migrationBuilder.DropColumn(
            name: "Latitude",
            table: "Restaurants");
    }
}
