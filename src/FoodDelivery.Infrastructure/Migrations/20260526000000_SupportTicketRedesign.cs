using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

public partial class SupportTicketRedesign : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // New columns on SupportTickets
        migrationBuilder.AddColumn<int>(name: "Category", table: "SupportTickets", type: "int", nullable: false, defaultValue: 6); // Other
        migrationBuilder.AddColumn<int>(name: "Priority", table: "SupportTickets", type: "int", nullable: false, defaultValue: 1); // Medium
        migrationBuilder.AddColumn<long>(name: "DriverId", table: "SupportTickets", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<long>(name: "AssignedToUserId", table: "SupportTickets", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "ResolvedAt", table: "SupportTickets", type: "datetime2", nullable: true);

        // Migrate old Status=1 (Closed) to new Status=3 (Closed)
        migrationBuilder.Sql("UPDATE [SupportTickets] SET [Status] = 3 WHERE [Status] = 1");

        // Indexes
        migrationBuilder.CreateIndex(name: "IX_SupportTickets_Status", table: "SupportTickets", column: "Status");
        migrationBuilder.CreateIndex(name: "IX_SupportTickets_Category", table: "SupportTickets", column: "Category");
        migrationBuilder.CreateIndex(name: "IX_SupportTickets_Priority", table: "SupportTickets", column: "Priority");
        migrationBuilder.CreateIndex(name: "IX_SupportTickets_DriverId", table: "SupportTickets", column: "DriverId");
        migrationBuilder.CreateIndex(name: "IX_SupportTickets_AssignedToUserId", table: "SupportTickets", column: "AssignedToUserId");

        // FK for DriverId
        migrationBuilder.AddForeignKey(
            name: "FK_SupportTickets_Users_DriverId",
            table: "SupportTickets",
            column: "DriverId",
            principalTable: "Users",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);

        // FK for AssignedToUserId
        migrationBuilder.AddForeignKey(
            name: "FK_SupportTickets_Users_AssignedToUserId",
            table: "SupportTickets",
            column: "AssignedToUserId",
            principalTable: "Users",
            principalColumn: "Id",
            onDelete: ReferentialAction.SetNull);

        // SupportTicketAudits table
        migrationBuilder.CreateTable(
            name: "SupportTicketAudits",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                SupportTicketId = table.Column<long>(type: "bigint", nullable: false),
                ActorUserId = table.Column<long>(type: "bigint", nullable: false),
                Action = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SupportTicketAudits", x => x.Id);
                table.ForeignKey(
                    name: "FK_SupportTicketAudits_SupportTickets_SupportTicketId",
                    column: x => x.SupportTicketId,
                    principalTable: "SupportTickets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SupportTicketAudits_Users_ActorUserId",
                    column: x => x.ActorUserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(name: "IX_SupportTicketAudits_SupportTicketId", table: "SupportTicketAudits", column: "SupportTicketId");
        migrationBuilder.CreateIndex(name: "IX_SupportTicketAudits_CreatedAt", table: "SupportTicketAudits", column: "CreatedAt");
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
