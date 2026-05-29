-- Support Ticket Redesign Migration
-- Run after deploying the new code

-- Add new columns to SupportTickets
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('SupportTickets') AND name = 'Category')
    ALTER TABLE [SupportTickets] ADD [Category] INT NOT NULL DEFAULT 6;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('SupportTickets') AND name = 'Priority')
    ALTER TABLE [SupportTickets] ADD [Priority] INT NOT NULL DEFAULT 1;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('SupportTickets') AND name = 'DriverId')
    ALTER TABLE [SupportTickets] ADD [DriverId] BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('SupportTickets') AND name = 'AssignedToUserId')
    ALTER TABLE [SupportTickets] ADD [AssignedToUserId] BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('SupportTickets') AND name = 'ResolvedAt')
    ALTER TABLE [SupportTickets] ADD [ResolvedAt] DATETIME2 NULL;

-- Migrate old Status=1 (Closed) to new Status=3 (Closed)
UPDATE [SupportTickets] SET [Status] = 3 WHERE [Status] = 1;

-- Create SupportTicketAudits table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SupportTicketAudits')
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
    CREATE INDEX [IX_SupportTicketAudits_SupportTicketId] ON [SupportTicketAudits]([SupportTicketId]);
    CREATE INDEX [IX_SupportTicketAudits_CreatedAt] ON [SupportTicketAudits]([CreatedAt]);
END;

-- Indexes on new SupportTickets columns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SupportTickets_Status' AND object_id = OBJECT_ID('SupportTickets'))
    CREATE INDEX [IX_SupportTickets_Status] ON [SupportTickets]([Status]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SupportTickets_Category' AND object_id = OBJECT_ID('SupportTickets'))
    CREATE INDEX [IX_SupportTickets_Category] ON [SupportTickets]([Category]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SupportTickets_Priority' AND object_id = OBJECT_ID('SupportTickets'))
    CREATE INDEX [IX_SupportTickets_Priority] ON [SupportTickets]([Priority]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SupportTickets_DriverId' AND object_id = OBJECT_ID('SupportTickets'))
    CREATE INDEX [IX_SupportTickets_DriverId] ON [SupportTickets]([DriverId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SupportTickets_AssignedToUserId' AND object_id = OBJECT_ID('SupportTickets'))
    CREATE INDEX [IX_SupportTickets_AssignedToUserId] ON [SupportTickets]([AssignedToUserId]);

-- FK for DriverId (NO ACTION to avoid cascade cycles)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SupportTickets_Users_DriverId')
    ALTER TABLE [SupportTickets] ADD CONSTRAINT [FK_SupportTickets_Users_DriverId]
        FOREIGN KEY ([DriverId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

-- FK for AssignedToUserId (NO ACTION to avoid cascade cycles)
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SupportTickets_Users_AssignedToUserId')
    ALTER TABLE [SupportTickets] ADD CONSTRAINT [FK_SupportTickets_Users_AssignedToUserId]
        FOREIGN KEY ([AssignedToUserId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION;

PRINT 'Support ticket redesign migration completed successfully.';
