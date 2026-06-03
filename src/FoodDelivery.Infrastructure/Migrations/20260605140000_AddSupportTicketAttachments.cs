using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260605140000_AddSupportTicketAttachments")]
public partial class AddSupportTicketAttachments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'SupportTicketAttachments')
            BEGIN
                CREATE TABLE [SupportTicketAttachments] (
                    [Id] BIGINT IDENTITY(1,1) NOT NULL,
                    [SupportTicketId] BIGINT NOT NULL,
                    [MessageId] BIGINT NULL,
                    [StoredFileId] BIGINT NOT NULL,
                    [UploadedByUserId] BIGINT NOT NULL,
                    [CreatedAt] DATETIME2 NOT NULL,
                    CONSTRAINT [PK_SupportTicketAttachments] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_SupportTicketAttachments_SupportTickets_SupportTicketId]
                        FOREIGN KEY ([SupportTicketId]) REFERENCES [SupportTickets]([Id]) ON DELETE CASCADE,
                    CONSTRAINT [FK_SupportTicketAttachments_SupportTicketMessages_MessageId]
                        FOREIGN KEY ([MessageId]) REFERENCES [SupportTicketMessages]([Id]) ON DELETE NO ACTION,
                    CONSTRAINT [FK_SupportTicketAttachments_StoredFiles_StoredFileId]
                        FOREIGN KEY ([StoredFileId]) REFERENCES [Files]([Id]) ON DELETE NO ACTION,
                    CONSTRAINT [FK_SupportTicketAttachments_Users_UploadedByUserId]
                        FOREIGN KEY ([UploadedByUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION
                );
                CREATE INDEX [IX_SupportTicketAttachments_SupportTicketId] ON [SupportTicketAttachments]([SupportTicketId]);
                CREATE INDEX [IX_SupportTicketAttachments_MessageId] ON [SupportTicketAttachments]([MessageId]);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SupportTicketAttachments");
    }
}
