using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>
/// Rregullon DB ku <see cref="AddUserMustChangePassword"/> është në histori por kolona mungon
/// (p.sh. pas ALTER manual + DROP, ose INSERT në __EFMigrationsHistory pa kolonë).
/// </summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260603000000_EnsureUserMustChangePasswordColumn")]
public class EnsureUserMustChangePasswordColumn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH('dbo.Users', 'EmailConfirmed') IS NULL
            BEGIN
                ALTER TABLE dbo.Users
                ADD EmailConfirmed bit NOT NULL
                    CONSTRAINT DF_Users_EmailConfirmed DEFAULT(0);
            END

            IF COL_LENGTH('dbo.Users', 'LastLoginAt') IS NULL
            BEGIN
                ALTER TABLE dbo.Users ADD LastLoginAt datetime2 NULL;
            END

            IF COL_LENGTH('dbo.Users', 'MustChangePassword') IS NULL
            BEGIN
                ALTER TABLE dbo.Users
                ADD MustChangePassword bit NOT NULL
                    CONSTRAINT DF_Users_MustChangePassword DEFAULT(0);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No-op: mos e hiq kolonën nëse ekziston nga migrime të tjera ose të dhëna dev.
    }
}
