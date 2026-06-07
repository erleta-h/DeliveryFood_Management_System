using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606250000_RemoveSeedReviews")]
public class RemoveSeedReviews : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            -- Vlerësimet demo (porosi FD-SEED-* nga RestaurantReviewsSeeder)
            DELETE rev
            FROM dbo.Reviews rev
            INNER JOIN dbo.Orders o ON o.Id = rev.OrderId
            WHERE o.OrderNumber LIKE 'FD-SEED-%';

            DELETE FROM dbo.Orders WHERE OrderNumber LIKE 'FD-SEED-%';

            -- Rifresko mesataren dhe numrin e vlerësimeve publik të restorantit
            UPDATE r SET
                ReviewCount = ISNULL(stats.Cnt, 0),
                AverageRating = ISNULL(stats.AvgRating, 0)
            FROM dbo.Restaurants r
            OUTER APPLY (
                SELECT
                    COUNT(*) AS Cnt,
                    ROUND(AVG(CAST(rev.Rating AS DECIMAL(18, 4))), 1) AS AvgRating
                FROM dbo.Reviews rev
                WHERE rev.RestaurantId = r.Id
                  AND rev.Subject = 0
                  AND rev.Status = 0
            ) stats;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Seed data nuk rikthehet automatikisht.
    }
}
