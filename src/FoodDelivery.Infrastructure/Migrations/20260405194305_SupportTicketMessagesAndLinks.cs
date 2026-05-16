using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SupportTicketMessagesAndLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "order_id",
                table: "support_tickets",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "restaurant_id",
                table: "support_tickets",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "support_ticket_messages",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    support_ticket_id = table.Column<long>(type: "bigint", nullable: false),
                    author_user_id = table.Column<long>(type: "bigint", nullable: false),
                    body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    is_staff_reply = table.Column<bool>(type: "bit", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_support_ticket_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_support_ticket_messages_support_tickets_support_ticket_id",
                        column: x => x.support_ticket_id,
                        principalTable: "support_tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_support_ticket_messages_users_author_user_id",
                        column: x => x.author_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_support_ticket_messages_created_at",
                table: "support_ticket_messages",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_support_ticket_messages_support_ticket_id",
                table: "support_ticket_messages",
                column: "support_ticket_id");

            migrationBuilder.CreateIndex(
                name: "ix_support_tickets_order_id",
                table: "support_tickets",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_support_tickets_restaurant_id",
                table: "support_tickets",
                column: "restaurant_id");

            migrationBuilder.AddForeignKey(
                name: "fk_support_tickets_orders_order_id",
                table: "support_tickets",
                column: "order_id",
                principalTable: "orders",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_support_tickets_restaurants_restaurant_id",
                table: "support_tickets",
                column: "restaurant_id",
                principalTable: "restaurants",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_support_tickets_orders_order_id",
                table: "support_tickets");

            migrationBuilder.DropForeignKey(
                name: "fk_support_tickets_restaurants_restaurant_id",
                table: "support_tickets");

            migrationBuilder.DropTable(
                name: "support_ticket_messages");

            migrationBuilder.DropIndex(
                name: "ix_support_tickets_order_id",
                table: "support_tickets");

            migrationBuilder.DropIndex(
                name: "ix_support_tickets_restaurant_id",
                table: "support_tickets");

            migrationBuilder.DropColumn(
                name: "order_id",
                table: "support_tickets");

            migrationBuilder.DropColumn(
                name: "restaurant_id",
                table: "support_tickets");
        }
    }
}
