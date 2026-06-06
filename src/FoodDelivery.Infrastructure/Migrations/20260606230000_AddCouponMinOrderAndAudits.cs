using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606230000_AddCouponMinOrderAndAudits")]
public class AddCouponMinOrderAndAudits : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('dbo.Coupons', 'MinOrderAmount') IS NULL
                ALTER TABLE dbo.Coupons ADD MinOrderAmount DECIMAL(18,2) NULL;

            IF OBJECT_ID('dbo.CouponAudits', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.CouponAudits (
                    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    CouponId BIGINT NOT NULL,
                    EventType NVARCHAR(64) NOT NULL,
                    Detail NVARCHAR(2000) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL,
                    CreatedByUserId BIGINT NULL,
                    CONSTRAINT FK_CouponAudits_Coupons_CouponId
                        FOREIGN KEY (CouponId) REFERENCES dbo.Coupons(Id) ON DELETE CASCADE,
                    CONSTRAINT FK_CouponAudits_Users_CreatedByUserId
                        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION
                );
                CREATE INDEX IX_CouponAudits_CouponId ON dbo.CouponAudits(CouponId);
                CREATE INDEX IX_CouponAudits_CreatedAtUtc ON dbo.CouponAudits(CreatedAtUtc);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
