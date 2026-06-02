using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>Heq kolonën e gabuar ActorId dhe siguron FK ActorUserId me NO ACTION.</summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260604130000_FixSupportTicketAuditActorUserId")]
public class FixSupportTicketAuditActorUserId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.SupportTicketAudits', N'U') IS NULL
                RETURN;

            IF COL_LENGTH(N'dbo.SupportTicketAudits', N'ActorId') IS NOT NULL
            BEGIN
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SupportTicketAudits_Users_ActorId')
                    ALTER TABLE [SupportTicketAudits] DROP CONSTRAINT [FK_SupportTicketAudits_Users_ActorId];
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTicketAudits_ActorId' AND object_id = OBJECT_ID(N'SupportTicketAudits'))
                    DROP INDEX [IX_SupportTicketAudits_ActorId] ON [SupportTicketAudits];
                ALTER TABLE [SupportTicketAudits] DROP COLUMN [ActorId];
            END

            IF COL_LENGTH(N'dbo.SupportTicketAudits', N'ActorUserId') IS NULL
                ALTER TABLE [SupportTicketAudits] ADD [ActorUserId] BIGINT NOT NULL DEFAULT(1);

            IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SupportTicketAudits_Users_ActorUserId')
                ALTER TABLE [SupportTicketAudits] DROP CONSTRAINT [FK_SupportTicketAudits_Users_ActorUserId];

            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SupportTicketAudits_Users_ActorUserId')
                ALTER TABLE [SupportTicketAudits] ADD CONSTRAINT [FK_SupportTicketAudits_Users_ActorUserId]
                    FOREIGN KEY ([ActorUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
