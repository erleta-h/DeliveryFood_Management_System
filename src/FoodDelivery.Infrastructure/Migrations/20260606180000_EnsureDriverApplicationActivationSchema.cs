using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Siguron skemën për aktivizimin e deliver-it dhe audit-in e aplikimeve (idempotent).
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260606180000_EnsureDriverApplicationActivationSchema")]
public class EnsureDriverApplicationActivationSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('dbo.DriverApplications', 'UserId') IS NULL
                ALTER TABLE dbo.DriverApplications ADD UserId BIGINT NULL;
            IF COL_LENGTH('dbo.DriverApplications', 'RejectionReason') IS NULL
                ALTER TABLE dbo.DriverApplications ADD RejectionReason NVARCHAR(500) NULL;
            IF COL_LENGTH('dbo.DriverApplications', 'ApprovedAtUtc') IS NULL
                ALTER TABLE dbo.DriverApplications ADD ApprovedAtUtc DATETIME2 NULL;
            IF COL_LENGTH('dbo.DriverApplications', 'ActivatedAtUtc') IS NULL
                ALTER TABLE dbo.DriverApplications ADD ActivatedAtUtc DATETIME2 NULL;
            IF COL_LENGTH('dbo.DriverApplications', 'ActivationEmailSentAtUtc') IS NULL
                ALTER TABLE dbo.DriverApplications ADD ActivationEmailSentAtUtc DATETIME2 NULL;
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID('dbo.AccountActivationTokens', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AccountActivationTokens (
                    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    UserId BIGINT NOT NULL,
                    TokenHash NVARCHAR(128) NOT NULL,
                    ExpiresAtUtc DATETIME2 NOT NULL,
                    CreatedAtUtc DATETIME2 NOT NULL,
                    UsedAtUtc DATETIME2 NULL,
                    CONSTRAINT FK_AccountActivationTokens_Users_UserId
                        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_AccountActivationTokens_UserId ON dbo.AccountActivationTokens(UserId);
                CREATE INDEX IX_AccountActivationTokens_TokenHash ON dbo.AccountActivationTokens(TokenHash);
            END
            """);

        migrationBuilder.Sql(
            """
            IF OBJECT_ID('dbo.DriverApplicationAudits', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.DriverApplicationAudits (
                    Id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    DriverApplicationId BIGINT NOT NULL,
                    EventType NVARCHAR(64) NOT NULL,
                    Detail NVARCHAR(2000) NULL,
                    CreatedAtUtc DATETIME2 NOT NULL,
                    CreatedByUserId BIGINT NULL,
                    CONSTRAINT FK_DriverApplicationAudits_DriverApplications_DriverApplicationId
                        FOREIGN KEY (DriverApplicationId) REFERENCES dbo.DriverApplications(Id) ON DELETE CASCADE,
                    CONSTRAINT FK_DriverApplicationAudits_Users_CreatedByUserId
                        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id) ON DELETE NO ACTION
                );
                CREATE INDEX IX_DriverApplicationAudits_DriverApplicationId ON dbo.DriverApplicationAudits(DriverApplicationId);
                CREATE INDEX IX_DriverApplicationAudits_CreatedAtUtc ON dbo.DriverApplicationAudits(CreatedAtUtc);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op
    }
}
