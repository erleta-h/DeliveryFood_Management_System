using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606240000_AddReviewModerationStatus")]
public class AddReviewModerationStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('dbo.Reviews', 'Status') IS NULL
                ALTER TABLE dbo.Reviews ADD Status INT NOT NULL CONSTRAINT DF_Reviews_Status DEFAULT(0);

            IF COL_LENGTH('dbo.Reviews', 'ReportCount') IS NULL
                ALTER TABLE dbo.Reviews ADD ReportCount INT NOT NULL CONSTRAINT DF_Reviews_ReportCount DEFAULT(0);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('dbo.Reviews', 'ReportCount') IS NOT NULL
                ALTER TABLE dbo.Reviews DROP CONSTRAINT IF EXISTS DF_Reviews_ReportCount;
            IF COL_LENGTH('dbo.Reviews', 'ReportCount') IS NOT NULL
                ALTER TABLE dbo.Reviews DROP COLUMN ReportCount;

            IF COL_LENGTH('dbo.Reviews', 'Status') IS NOT NULL
                ALTER TABLE dbo.Reviews DROP CONSTRAINT IF EXISTS DF_Reviews_Status;
            IF COL_LENGTH('dbo.Reviews', 'Status') IS NOT NULL
                ALTER TABLE dbo.Reviews DROP COLUMN Status;
            """);
    }
}
