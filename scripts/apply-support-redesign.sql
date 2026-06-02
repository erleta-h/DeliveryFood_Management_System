-- Support Ticket Redesign (idempotent) — i njëjti SQL si migrimet EF
-- Ekzekuto në FoodDeliveryDb_Dev nëse AutoMigrate dështon.

IF OBJECT_ID(N'dbo.SupportTickets', N'U') IS NULL
BEGIN
    PRINT 'Tabela SupportTickets mungon — ekzekuto migrimet bazë së pari.';
    RETURN;
END;

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

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260526000000_SupportTicketRedesign')
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260526000000_SupportTicketRedesign', N'8.0.11');

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260604000000_EnsureSupportTicketRedesignSchema')
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260604000000_EnsureSupportTicketRedesignSchema', N'8.0.11');

PRINT 'Support ticket redesign u aplikua me sukses.';
