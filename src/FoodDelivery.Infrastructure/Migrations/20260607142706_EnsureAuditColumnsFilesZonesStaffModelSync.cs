using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>Kolonat audit për Files, DeliveryZones dhe RestaurantStaff (idempotent — nuk prish DB ekzistuese).</summary>
public partial class EnsureAuditColumnsFilesZonesStaffModelSync : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Batch 1: shto kolonat (pa referenca të kompilimit të kolonave të reja).
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.Files', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.Files', N'CreatedById') IS NULL
                    ALTER TABLE [Files] ADD [CreatedById] BIGINT NULL;

                IF COL_LENGTH(N'dbo.Files', N'UpdatedAt') IS NULL
                    ALTER TABLE [Files] ADD [UpdatedAt] DATETIME2 NULL;

                IF COL_LENGTH(N'dbo.Files', N'UpdatedById') IS NULL
                    ALTER TABLE [Files] ADD [UpdatedById] BIGINT NULL;
            END

            IF OBJECT_ID(N'dbo.DeliveryZones', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.DeliveryZones', N'CreatedById') IS NULL
                    ALTER TABLE [DeliveryZones] ADD [CreatedById] BIGINT NULL;

                IF COL_LENGTH(N'dbo.DeliveryZones', N'UpdatedById') IS NULL
                    ALTER TABLE [DeliveryZones] ADD [UpdatedById] BIGINT NULL;
            END

            IF OBJECT_ID(N'dbo.RestaurantStaff', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.RestaurantStaff', N'CreatedById') IS NULL
                    ALTER TABLE [RestaurantStaff] ADD [CreatedById] BIGINT NULL;

                IF COL_LENGTH(N'dbo.RestaurantStaff', N'UpdatedAt') IS NULL
                    ALTER TABLE [RestaurantStaff] ADD [UpdatedAt] DATETIME2 NULL;

                IF COL_LENGTH(N'dbo.RestaurantStaff', N'UpdatedById') IS NULL
                    ALTER TABLE [RestaurantStaff] ADD [UpdatedById] BIGINT NULL;
            END
            """);

        // Batch 2: backfill Files.CreatedById (pas ADD — SQL Server nuk kompilon kolonat e reja në batch të njëjtë).
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.Files', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.Files', N'CreatedById') IS NOT NULL
            BEGIN
                UPDATE [Files]
                SET [CreatedById] = [UploadedBy]
                WHERE [CreatedById] IS NULL;
            END
            """);

        // Batch 3: indekse dhe FK për Files.
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.Files', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.Files', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Files_CreatedById' AND object_id = OBJECT_ID(N'dbo.Files'))
                    CREATE INDEX [IX_Files_CreatedById] ON [Files]([CreatedById]);

                IF COL_LENGTH(N'dbo.Files', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Files_UpdatedById' AND object_id = OBJECT_ID(N'dbo.Files'))
                    CREATE INDEX [IX_Files_UpdatedById] ON [Files]([UpdatedById]);

                IF COL_LENGTH(N'dbo.Files', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Files_Users_CreatedById')
                    ALTER TABLE [Files] ADD CONSTRAINT [FK_Files_Users_CreatedById]
                        FOREIGN KEY ([CreatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

                IF COL_LENGTH(N'dbo.Files', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Files_Users_UpdatedById')
                    ALTER TABLE [Files] ADD CONSTRAINT [FK_Files_Users_UpdatedById]
                        FOREIGN KEY ([UpdatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
            END
            """);

        // Batch 4: indekse dhe FK për DeliveryZones.
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.DeliveryZones', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.DeliveryZones', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DeliveryZones_CreatedById' AND object_id = OBJECT_ID(N'dbo.DeliveryZones'))
                    CREATE INDEX [IX_DeliveryZones_CreatedById] ON [DeliveryZones]([CreatedById]);

                IF COL_LENGTH(N'dbo.DeliveryZones', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DeliveryZones_UpdatedById' AND object_id = OBJECT_ID(N'dbo.DeliveryZones'))
                    CREATE INDEX [IX_DeliveryZones_UpdatedById] ON [DeliveryZones]([UpdatedById]);

                IF COL_LENGTH(N'dbo.DeliveryZones', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DeliveryZones_Users_CreatedById')
                    ALTER TABLE [DeliveryZones] ADD CONSTRAINT [FK_DeliveryZones_Users_CreatedById]
                        FOREIGN KEY ([CreatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

                IF COL_LENGTH(N'dbo.DeliveryZones', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DeliveryZones_Users_UpdatedById')
                    ALTER TABLE [DeliveryZones] ADD CONSTRAINT [FK_DeliveryZones_Users_UpdatedById]
                        FOREIGN KEY ([UpdatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
            END
            """);

        // Batch 5: indekse dhe FK për RestaurantStaff.
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'dbo.RestaurantStaff', N'U') IS NOT NULL
            BEGIN
                IF COL_LENGTH(N'dbo.RestaurantStaff', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RestaurantStaff_CreatedById' AND object_id = OBJECT_ID(N'dbo.RestaurantStaff'))
                    CREATE INDEX [IX_RestaurantStaff_CreatedById] ON [RestaurantStaff]([CreatedById]);

                IF COL_LENGTH(N'dbo.RestaurantStaff', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RestaurantStaff_UpdatedById' AND object_id = OBJECT_ID(N'dbo.RestaurantStaff'))
                    CREATE INDEX [IX_RestaurantStaff_UpdatedById] ON [RestaurantStaff]([UpdatedById]);

                IF COL_LENGTH(N'dbo.RestaurantStaff', N'CreatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RestaurantStaff_Users_CreatedById')
                    ALTER TABLE [RestaurantStaff] ADD CONSTRAINT [FK_RestaurantStaff_Users_CreatedById]
                        FOREIGN KEY ([CreatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

                IF COL_LENGTH(N'dbo.RestaurantStaff', N'UpdatedById') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RestaurantStaff_Users_UpdatedById')
                    ALTER TABLE [RestaurantStaff] ADD CONSTRAINT [FK_RestaurantStaff_Users_UpdatedById]
                        FOREIGN KEY ([UpdatedById]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op — kolonat ekzistuese nuk hiqen për të mos prishur të dhëna.
    }
}
