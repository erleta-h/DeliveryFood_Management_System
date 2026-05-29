using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Kolona për auto-dispatch / fazat e dërgesës — modeli i priste, InitialCreate i kishte vetëm Status/PickedUpAt/DeliveredAt.
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260523130000_AddDeliveryDispatchColumns")]
public partial class AddDeliveryDispatchColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "OfferedAtUtc",
            table: "Deliveries",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "AcceptedAtUtc",
            table: "Deliveries",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "ArrivedAtRestaurantUtc",
            table: "Deliveries",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AutoDispatchExcludedDriverIdsJson",
            table: "Deliveries",
            type: "nvarchar(max)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "AutoDispatchExcludedDriverIdsJson", table: "Deliveries");
        migrationBuilder.DropColumn(name: "ArrivedAtRestaurantUtc", table: "Deliveries");
        migrationBuilder.DropColumn(name: "AcceptedAtUtc", table: "Deliveries");
        migrationBuilder.DropColumn(name: "OfferedAtUtc", table: "Deliveries");
    }
}
