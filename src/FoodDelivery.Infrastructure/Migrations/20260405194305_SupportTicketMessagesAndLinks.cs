using System;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>Krijon tabelat e tiketave të support-it (PascalCase, si pjesa tjetër e skemës).</summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260405194305_SupportTicketMessagesAndLinks")]
public partial class SupportTicketMessagesAndLinks : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SupportTickets",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                UserId = table.Column<long>(type: "bigint", nullable: false),
                Subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                Status = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                AdminNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                OrderId = table.Column<long>(type: "bigint", nullable: true),
                RestaurantId = table.Column<long>(type: "bigint", nullable: true),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SupportTickets", x => x.Id);
                table.ForeignKey(
                    name: "FK_SupportTickets_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SupportTickets_Orders_OrderId",
                    column: x => x.OrderId,
                    principalTable: "Orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_SupportTickets_Restaurants_RestaurantId",
                    column: x => x.RestaurantId,
                    principalTable: "Restaurants",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateTable(
            name: "SupportTicketMessages",
            columns: table => new
            {
                Id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                SupportTicketId = table.Column<long>(type: "bigint", nullable: false),
                AuthorUserId = table.Column<long>(type: "bigint", nullable: false),
                Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                IsStaffReply = table.Column<bool>(type: "bit", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SupportTicketMessages", x => x.Id);
                table.ForeignKey(
                    name: "FK_SupportTicketMessages_SupportTickets_SupportTicketId",
                    column: x => x.SupportTicketId,
                    principalTable: "SupportTickets",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_SupportTicketMessages_Users_AuthorUserId",
                    column: x => x.AuthorUserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_SupportTickets_CreatedAt",
            table: "SupportTickets",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTickets_OrderId",
            table: "SupportTickets",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTickets_RestaurantId",
            table: "SupportTickets",
            column: "RestaurantId");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTickets_UserId",
            table: "SupportTickets",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTicketMessages_CreatedAt",
            table: "SupportTicketMessages",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTicketMessages_SupportTicketId",
            table: "SupportTicketMessages",
            column: "SupportTicketId");

        migrationBuilder.CreateIndex(
            name: "IX_SupportTicketMessages_AuthorUserId",
            table: "SupportTicketMessages",
            column: "AuthorUserId");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "SupportTicketMessages");
        migrationBuilder.DropTable(name: "SupportTickets");
    }
}
