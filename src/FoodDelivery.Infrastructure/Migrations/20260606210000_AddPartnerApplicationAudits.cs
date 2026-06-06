using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606210000_AddPartnerApplicationAudits")]
public class AddPartnerApplicationAudits : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF OBJECT_ID('dbo.PartnerApplicationAudits', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.PartnerApplicationAudits (
                    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    PartnerApplicationId BIGINT NOT NULL,
                    EventType NVARCHAR(64) NOT NULL,
                    Detail NVARCHAR(2000) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL,
                    CreatedByUserId BIGINT NULL,
                    CONSTRAINT FK_PartnerApplicationAudits_RestaurantPartnerApplications_PartnerApplicationId
                        FOREIGN KEY (PartnerApplicationId) REFERENCES dbo.RestaurantPartnerApplications(Id) ON DELETE CASCADE,
                    CONSTRAINT FK_PartnerApplicationAudits_Users_CreatedByUserId
                        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION
                );
                CREATE INDEX IX_PartnerApplicationAudits_PartnerApplicationId ON dbo.PartnerApplicationAudits(PartnerApplicationId);
                CREATE INDEX IX_PartnerApplicationAudits_CreatedAtUtc ON dbo.PartnerApplicationAudits(CreatedAtUtc);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
