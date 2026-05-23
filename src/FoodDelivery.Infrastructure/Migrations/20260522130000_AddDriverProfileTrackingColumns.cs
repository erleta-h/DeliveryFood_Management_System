using System;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.Infrastructure.Migrations;

/// <summary>Kolonat e GPS / online për <see cref="FoodDelivery.Domain.Entities.DriverProfile" /> — modeli i kishte, skema jo.</summary>
[DbContext(typeof(FoodDeliveryDbContext))]
[Migration("20260522130000_AddDriverProfileTrackingColumns")]
public class AddDriverProfileTrackingColumns : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "OnlineSinceUtc",
            table: "DriverProfiles",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "OnlineTallyDateUtc",
            table: "DriverProfiles",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "OnlineSecondsToday",
            table: "DriverProfiles",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "OffersAcceptedCount",
            table: "DriverProfiles",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "OffersDeclinedCount",
            table: "DriverProfiles",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "OffersTimedOutCount",
            table: "DriverProfiles",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<double>(
            name: "LastLatitude",
            table: "DriverProfiles",
            type: "float",
            nullable: true);

        migrationBuilder.AddColumn<double>(
            name: "LastLongitude",
            table: "DriverProfiles",
            type: "float",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "LastLocationAtUtc",
            table: "DriverProfiles",
            type: "datetime2",
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "LastLocationAtUtc", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "LastLongitude", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "LastLatitude", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OffersTimedOutCount", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OffersDeclinedCount", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OffersAcceptedCount", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OnlineSecondsToday", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OnlineTallyDateUtc", table: "DriverProfiles");
        migrationBuilder.DropColumn(name: "OnlineSinceUtc", table: "DriverProfiles");
    }
}
