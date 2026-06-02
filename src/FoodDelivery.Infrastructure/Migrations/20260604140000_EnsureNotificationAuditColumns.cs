using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>Kolonat CreatedById / UpdatedAt / UpdatedById për Notifications (POST support reply).</summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260604140000_EnsureNotificationAuditColumns")]
public class EnsureNotificationAuditColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
                RETURN;

            IF COL_LENGTH(N'dbo.Notifications', N'CreatedById') IS NULL
                ALTER TABLE [Notifications] ADD [CreatedById] BIGINT NULL;

            IF COL_LENGTH(N'dbo.Notifications', N'UpdatedAt') IS NULL
                ALTER TABLE [Notifications] ADD [UpdatedAt] DATETIME2 NULL;

            IF COL_LENGTH(N'dbo.Notifications', N'UpdatedById') IS NULL
                ALTER TABLE [Notifications] ADD [UpdatedById] BIGINT NULL;

            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Notifications_Users_CreatedById')
                ALTER TABLE [Notifications] ADD CONSTRAINT [FK_Notifications_Users_CreatedById]
                    FOREIGN KEY ([CreatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Notifications_Users_UpdatedById')
                ALTER TABLE [Notifications] ADD CONSTRAINT [FK_Notifications_Users_UpdatedById]
                    FOREIGN KEY ([UpdatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
