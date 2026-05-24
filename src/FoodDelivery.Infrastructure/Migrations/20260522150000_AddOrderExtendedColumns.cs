using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Kolona të porosisë që ishin në modelin C# por mungonin në SQL (shkaktonte HTTP 500 te POST /api/orders).
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260522150000_AddOrderExtendedColumns")]
public class AddOrderExtendedColumns : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "CustomerHiddenAt",
            table: "Orders",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "EstimatedPrepMinutes",
            table: "Orders",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<decimal>(
            name: "PlatformFeeAmount",
            table: "Orders",
            type: "decimal(18,2)",
            nullable: false,
            defaultValue: 0m);

        migrationBuilder.AddColumn<decimal>(
            name: "PlatformFeePercentApplied",
            table: "Orders",
            type: "decimal(18,2)",
            nullable: false,
            defaultValue: 0m);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "PlatformFeePercentApplied", table: "Orders");
        migrationBuilder.DropColumn(name: "PlatformFeeAmount", table: "Orders");
        migrationBuilder.DropColumn(name: "EstimatedPrepMinutes", table: "Orders");
        migrationBuilder.DropColumn(name: "CustomerHiddenAt", table: "Orders");
    }
}
