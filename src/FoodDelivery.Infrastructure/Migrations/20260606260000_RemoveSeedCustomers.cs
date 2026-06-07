using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606260000_RemoveSeedCustomers")]
public class RemoveSeedCustomers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            -- Klientët demo nga RestaurantReviewsSeeder (reviewer.seed*@fooddelivery.local)
            DECLARE @SeedUsers TABLE (Id BIGINT PRIMARY KEY);
            INSERT INTO @SeedUsers (Id)
            SELECT Id FROM dbo.Users WHERE Email LIKE 'reviewer.seed%@fooddelivery.local';

            IF NOT EXISTS (SELECT 1 FROM @SeedUsers)
                RETURN;

            -- Vlerësimet e autorëve demo
            DELETE rev
            FROM dbo.Reviews rev
            INNER JOIN @SeedUsers su ON su.Id = rev.AuthorUserId;

            -- Porositë e mbetura të klientëve demo (nëse ka)
            DELETE os
            FROM dbo.OrderStatusHistory os
            INNER JOIN dbo.Orders o ON o.Id = os.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE oc
            FROM dbo.OrderCoupons oc
            INNER JOIN dbo.Orders o ON o.Id = oc.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE pay
            FROM dbo.Payments pay
            INNER JOIN dbo.Orders o ON o.Id = pay.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE d
            FROM dbo.Deliveries d
            INNER JOIN dbo.Orders o ON o.Id = d.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE rev
            FROM dbo.Reviews rev
            INNER JOIN dbo.Orders o ON o.Id = rev.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE oi
            FROM dbo.OrderItems oi
            INNER JOIN dbo.Orders o ON o.Id = oi.OrderId
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            DELETE o
            FROM dbo.Orders o
            INNER JOIN @SeedUsers su ON su.Id = o.UserId;

            -- Shporta
            DELETE ci
            FROM dbo.CartItems ci
            INNER JOIN dbo.ShoppingCarts sc ON sc.Id = ci.ShoppingCartId
            INNER JOIN @SeedUsers su ON su.Id = sc.UserId;

            DELETE sc
            FROM dbo.ShoppingCarts sc
            INNER JOIN @SeedUsers su ON su.Id = sc.UserId;

            DELETE fr
            FROM dbo.FavoriteRestaurants fr
            INNER JOIN @SeedUsers su ON su.Id = fr.UserId;

            -- Mesazhe/audit ku klienti demo ishte autor (FK Restrict)
            DELETE stm
            FROM dbo.SupportTicketMessages stm
            INNER JOIN @SeedUsers su ON su.Id = stm.AuthorUserId;

            DELETE sta
            FROM dbo.SupportTicketAttachments sta
            INNER JOIN @SeedUsers su ON su.Id = sta.UploadedByUserId;

            DELETE stau
            FROM dbo.SupportTicketAudits stau
            INNER JOIN @SeedUsers su ON su.Id = stau.ActorUserId;

            DELETE st
            FROM dbo.SupportTickets st
            INNER JOIN @SeedUsers su ON su.Id = st.UserId;

            DELETE ur
            FROM dbo.UserRoles ur
            INNER JOIN @SeedUsers su ON su.Id = ur.UserId;

            DELETE ca
            FROM dbo.CustomerAddresses ca
            INNER JOIN @SeedUsers su ON su.Id = ca.UserId;

            UPDATE dbo.AuditLogs SET UserId = NULL WHERE UserId IN (SELECT Id FROM @SeedUsers);

            UPDATE dbo.Users SET CreatedById = NULL WHERE CreatedById IN (SELECT Id FROM @SeedUsers);
            UPDATE dbo.Users SET UpdatedById = NULL WHERE UpdatedById IN (SELECT Id FROM @SeedUsers);

            DELETE u
            FROM dbo.Users u
            INNER JOIN @SeedUsers su ON su.Id = u.Id;

            -- Rifresko statistikat e restorantit pas heqjes së vlerësimeve demo
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
        // Klientët demo nuk rikthehen automatikisht.
    }
}
