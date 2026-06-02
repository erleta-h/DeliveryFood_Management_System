using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260423140000_AddUserMustChangePassword")]
public class AddUserMustChangePassword : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
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
        migrationBuilder.DropColumn(
            name: "MustChangePassword",
            table: "Users");
    }
}
