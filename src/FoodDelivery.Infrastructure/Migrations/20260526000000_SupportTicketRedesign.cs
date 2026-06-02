using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260526000000_SupportTicketRedesign")]
public partial class SupportTicketRedesign : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(SupportTicketRedesignSql.Up);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SupportTicketAudits");

        migrationBuilder.DropForeignKey(name: "FK_SupportTickets_Users_DriverId", table: "SupportTickets");
        migrationBuilder.DropForeignKey(name: "FK_SupportTickets_Users_AssignedToUserId", table: "SupportTickets");

        migrationBuilder.DropIndex(name: "IX_SupportTickets_Status", table: "SupportTickets");
        migrationBuilder.DropIndex(name: "IX_SupportTickets_Category", table: "SupportTickets");
        migrationBuilder.DropIndex(name: "IX_SupportTickets_Priority", table: "SupportTickets");
        migrationBuilder.DropIndex(name: "IX_SupportTickets_DriverId", table: "SupportTickets");
        migrationBuilder.DropIndex(name: "IX_SupportTickets_AssignedToUserId", table: "SupportTickets");

        migrationBuilder.Sql("UPDATE [SupportTickets] SET [Status] = 1 WHERE [Status] = 3");

        migrationBuilder.DropColumn(name: "Category", table: "SupportTickets");
        migrationBuilder.DropColumn(name: "Priority", table: "SupportTickets");
        migrationBuilder.DropColumn(name: "DriverId", table: "SupportTickets");
        migrationBuilder.DropColumn(name: "AssignedToUserId", table: "SupportTickets");
        migrationBuilder.DropColumn(name: "ResolvedAt", table: "SupportTickets");
    }
}

/// <summary>SQL idempotent për skemën e tiketave — përdoret nga migrimet EF.</summary>
internal static class SupportTicketRedesignSql
{
    internal const string Up = """
        IF OBJECT_ID(N'dbo.SupportTickets', N'U') IS NULL
            RETURN;

        IF COL_LENGTH(N'dbo.SupportTickets', N'Category') IS NULL
            ALTER TABLE [SupportTickets] ADD [Category] INT NOT NULL CONSTRAINT DF_SupportTickets_Category DEFAULT(6);

        IF COL_LENGTH(N'dbo.SupportTickets', N'Priority') IS NULL
            ALTER TABLE [SupportTickets] ADD [Priority] INT NOT NULL CONSTRAINT DF_SupportTickets_Priority DEFAULT(1);

        IF COL_LENGTH(N'dbo.SupportTickets', N'DriverId') IS NULL
            ALTER TABLE [SupportTickets] ADD [DriverId] BIGINT NULL;

        IF COL_LENGTH(N'dbo.SupportTickets', N'AssignedToUserId') IS NULL
            ALTER TABLE [SupportTickets] ADD [AssignedToUserId] BIGINT NULL;

        IF COL_LENGTH(N'dbo.SupportTickets', N'ResolvedAt') IS NULL
            ALTER TABLE [SupportTickets] ADD [ResolvedAt] DATETIME2 NULL;

        UPDATE [SupportTickets] SET [Status] = 3 WHERE [Status] = 1;

        IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'SupportTicketAudits')
        BEGIN
            CREATE TABLE [SupportTicketAudits] (
                [Id] BIGINT IDENTITY(1,1) NOT NULL,
                [SupportTicketId] BIGINT NOT NULL,
                [ActorUserId] BIGINT NOT NULL,
                [Action] NVARCHAR(200) NOT NULL,
                [CreatedAt] DATETIME2 NOT NULL,
                CONSTRAINT [PK_SupportTicketAudits] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_SupportTicketAudits_SupportTickets_SupportTicketId]
                    FOREIGN KEY ([SupportTicketId]) REFERENCES [SupportTickets]([Id]) ON DELETE CASCADE,
                CONSTRAINT [FK_SupportTicketAudits_Users_ActorUserId]
                    FOREIGN KEY ([ActorUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION
            );
        END;

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTicketAudits_SupportTicketId' AND object_id = OBJECT_ID(N'SupportTicketAudits'))
            CREATE INDEX [IX_SupportTicketAudits_SupportTicketId] ON [SupportTicketAudits]([SupportTicketId]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTicketAudits_CreatedAt' AND object_id = OBJECT_ID(N'SupportTicketAudits'))
            CREATE INDEX [IX_SupportTicketAudits_CreatedAt] ON [SupportTicketAudits]([CreatedAt]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTickets_Status' AND object_id = OBJECT_ID(N'SupportTickets'))
            CREATE INDEX [IX_SupportTickets_Status] ON [SupportTickets]([Status]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTickets_Category' AND object_id = OBJECT_ID(N'SupportTickets'))
            CREATE INDEX [IX_SupportTickets_Category] ON [SupportTickets]([Category]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTickets_Priority' AND object_id = OBJECT_ID(N'SupportTickets'))
            CREATE INDEX [IX_SupportTickets_Priority] ON [SupportTickets]([Priority]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTickets_DriverId' AND object_id = OBJECT_ID(N'SupportTickets'))
            CREATE INDEX [IX_SupportTickets_DriverId] ON [SupportTickets]([DriverId]);

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupportTickets_AssignedToUserId' AND object_id = OBJECT_ID(N'SupportTickets'))
            CREATE INDEX [IX_SupportTickets_AssignedToUserId] ON [SupportTickets]([AssignedToUserId]);

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SupportTickets_Users_DriverId')
            ALTER TABLE [SupportTickets] ADD CONSTRAINT [FK_SupportTickets_Users_DriverId]
                FOREIGN KEY ([DriverId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SupportTickets_Users_AssignedToUserId')
            ALTER TABLE [SupportTickets] ADD CONSTRAINT [FK_SupportTickets_Users_AssignedToUserId]
                FOREIGN KEY ([AssignedToUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
        """;
}
