using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606220000_AddDeliveryZones")]
public class AddDeliveryZones : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF OBJECT_ID('dbo.DeliveryZones', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.DeliveryZones (
                    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    Name NVARCHAR(200) NOT NULL,
                    City NVARCHAR(120) NOT NULL,
                    DeliveryFee DECIMAL(18,2) NOT NULL,
                    MinOrderAmount DECIMAL(18,2) NOT NULL,
                    EstimatedDeliveryMinutes INT NOT NULL,
                    Description NVARCHAR(1000) NULL,
                    IsActive BIT NOT NULL CONSTRAINT DF_DeliveryZones_IsActive DEFAULT 1,
                    SortOrder INT NOT NULL CONSTRAINT DF_DeliveryZones_SortOrder DEFAULT 0,
                    CreatedAt DATETIME2 NOT NULL,
                    UpdatedAt DATETIME2 NULL
                );
                CREATE INDEX IX_DeliveryZones_City ON dbo.DeliveryZones(City);
                CREATE INDEX IX_DeliveryZones_IsActive ON dbo.DeliveryZones(IsActive);
            END

            IF COL_LENGTH('dbo.Restaurants', 'DeliveryZoneId') IS NULL
                ALTER TABLE dbo.Restaurants ADD DeliveryZoneId BIGINT NULL;

            IF COL_LENGTH('dbo.Restaurants', 'OverrideDeliveryFee') IS NULL
                ALTER TABLE dbo.Restaurants ADD OverrideDeliveryFee DECIMAL(18,2) NULL;

            IF COL_LENGTH('dbo.Restaurants', 'OverrideMinOrderAmount') IS NULL
                ALTER TABLE dbo.Restaurants ADD OverrideMinOrderAmount DECIMAL(18,2) NULL;

            IF COL_LENGTH('dbo.Restaurants', 'OverrideEstimatedDeliveryMinutes') IS NULL
                ALTER TABLE dbo.Restaurants ADD OverrideEstimatedDeliveryMinutes INT NULL;

            IF NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys
                WHERE name = 'FK_Restaurants_DeliveryZones_DeliveryZoneId')
            BEGIN
                ALTER TABLE dbo.Restaurants ADD CONSTRAINT FK_Restaurants_DeliveryZones_DeliveryZoneId
                    FOREIGN KEY (DeliveryZoneId) REFERENCES dbo.DeliveryZones(Id) ON DELETE SET NULL;
            END

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Restaurants_DeliveryZoneId' AND object_id = OBJECT_ID('dbo.Restaurants'))
                CREATE INDEX IX_Restaurants_DeliveryZoneId ON dbo.Restaurants(DeliveryZoneId);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
