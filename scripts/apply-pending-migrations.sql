-- Kolona audit RefreshTokens (20260523120000_AddRefreshTokenAuditColumns)
IF COL_LENGTH('RefreshTokens', 'CreatedById') IS NULL
BEGIN
    ALTER TABLE [RefreshTokens] ADD [CreatedById] bigint NULL;
    ALTER TABLE [RefreshTokens] ADD [UpdatedAt] datetime2 NULL;
    ALTER TABLE [RefreshTokens] ADD [UpdatedById] bigint NULL;
    CREATE INDEX [IX_RefreshTokens_CreatedById] ON [RefreshTokens] ([CreatedById]);
    CREATE INDEX [IX_RefreshTokens_UpdatedById] ON [RefreshTokens] ([UpdatedById]);
    ALTER TABLE [RefreshTokens] ADD CONSTRAINT [FK_RefreshTokens_Users_CreatedById]
        FOREIGN KEY ([CreatedById]) REFERENCES [Users] ([Id]);
    ALTER TABLE [RefreshTokens] ADD CONSTRAINT [FK_RefreshTokens_Users_UpdatedById]
        FOREIGN KEY ([UpdatedById]) REFERENCES [Users] ([Id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260523120000_AddRefreshTokenAuditColumns')
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260523120000_AddRefreshTokenAuditColumns', N'8.0.11');
GO

-- Kolona dispatch Deliveries (20260523130000_AddDeliveryDispatchColumns)
IF COL_LENGTH('Deliveries', 'OfferedAtUtc') IS NULL
BEGIN
    ALTER TABLE [Deliveries] ADD [OfferedAtUtc] datetime2 NULL;
    ALTER TABLE [Deliveries] ADD [AcceptedAtUtc] datetime2 NULL;
    ALTER TABLE [Deliveries] ADD [ArrivedAtRestaurantUtc] datetime2 NULL;
    ALTER TABLE [Deliveries] ADD [AutoDispatchExcludedDriverIdsJson] nvarchar(max) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260523130000_AddDeliveryDispatchColumns')
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260523130000_AddDeliveryDispatchColumns', N'8.0.11');
GO

-- Kolona audit AuditLogs (20260525120000_AddAuditLogAuditColumns)
IF COL_LENGTH('AuditLogs', 'CreatedById') IS NULL
BEGIN
    ALTER TABLE [AuditLogs] ADD [CreatedById] bigint NULL;
    ALTER TABLE [AuditLogs] ADD [UpdatedAt] datetime2 NULL;
    ALTER TABLE [AuditLogs] ADD [UpdatedById] bigint NULL;
    CREATE INDEX [IX_AuditLogs_CreatedById] ON [AuditLogs] ([CreatedById]);
    CREATE INDEX [IX_AuditLogs_UpdatedById] ON [AuditLogs] ([UpdatedById]);
    ALTER TABLE [AuditLogs] ADD CONSTRAINT [FK_AuditLogs_Users_CreatedById]
        FOREIGN KEY ([CreatedById]) REFERENCES [Users] ([Id]);
    ALTER TABLE [AuditLogs] ADD CONSTRAINT [FK_AuditLogs_Users_UpdatedById]
        FOREIGN KEY ([UpdatedById]) REFERENCES [Users] ([Id]);
END
GO

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260525120000_AddAuditLogAuditColumns')
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260525120000_AddAuditLogAuditColumns', N'8.0.11');
GO
