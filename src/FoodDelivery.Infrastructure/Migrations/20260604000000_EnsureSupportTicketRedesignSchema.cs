using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Siguron skemën e tiketave edhe kur <see cref="SupportTicketRedesign"/> dështoi gjysmë
/// ose kolonat u shtuan manualisht pa FK me NO ACTION.
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260604000000_EnsureSupportTicketRedesignSchema")]
public class EnsureSupportTicketRedesignSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(SupportTicketRedesignSql.Up);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
