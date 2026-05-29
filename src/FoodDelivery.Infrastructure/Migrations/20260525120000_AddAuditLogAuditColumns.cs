using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260525120000_AddAuditLogAuditColumns")]
public partial class AddAuditLogAuditColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>(
            name: "CreatedById",
            table: "AuditLogs",
            type: "bigint",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "UpdatedAt",
            table: "AuditLogs",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<long>(
            name: "UpdatedById",
            table: "AuditLogs",
            type: "bigint",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_AuditLogs_CreatedById",
            table: "AuditLogs",
            column: "CreatedById");

        migrationBuilder.CreateIndex(
            name: "IX_AuditLogs_UpdatedById",
            table: "AuditLogs",
            column: "UpdatedById");

        migrationBuilder.AddForeignKey(
            name: "FK_AuditLogs_Users_CreatedById",
            table: "AuditLogs",
            column: "CreatedById",
            principalTable: "Users",
            principalColumn: "Id");

        migrationBuilder.AddForeignKey(
            name: "FK_AuditLogs_Users_UpdatedById",
            table: "AuditLogs",
            column: "UpdatedById",
            principalTable: "Users",
            principalColumn: "Id");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_AuditLogs_Users_UpdatedById",
            table: "AuditLogs");

        migrationBuilder.DropForeignKey(
            name: "FK_AuditLogs_Users_CreatedById",
            table: "AuditLogs");

        migrationBuilder.DropIndex(
            name: "IX_AuditLogs_UpdatedById",
            table: "AuditLogs");

        migrationBuilder.DropIndex(
            name: "IX_AuditLogs_CreatedById",
            table: "AuditLogs");

        migrationBuilder.DropColumn(
            name: "UpdatedById",
            table: "AuditLogs");

        migrationBuilder.DropColumn(
            name: "UpdatedAt",
            table: "AuditLogs");

        migrationBuilder.DropColumn(
            name: "CreatedById",
            table: "AuditLogs");
    }
}
