using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606120000_AddRestaurantIsFeatured")]
public partial class AddRestaurantIsFeatured : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "IsFeatured",
            table: "Restaurants",
            type: "bit",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "IsFeatured",
            table: "Restaurants");
    }
}
