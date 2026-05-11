using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminReportsService : IAdminReportsService
{
    private readonly IUnitOfWork _uow;

    public AdminReportsService(IUnitOfWork uow) => _uow = uow;

    public async Task<OperationsReportDto> GetOperationsReportAsync(
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default)
    {
        var oq = _uow.Repository<Order, long>().Query.AsNoTracking();
        if (fromUtc is { } f)
            oq = oq.Where(x => x.PlacedAt >= f);
        if (toUtc is { } t)
            oq = oq.Where(x => x.PlacedAt <= t);

        var orderCount = await oq.CountAsync(cancellationToken);
        var orderSum = await oq.SumAsync(x => x.Total, cancellationToken);

        var activeRestaurants = await _uow.Repository<Restaurant, long>().Query.AsNoTracking()
            .CountAsync(r => r.IsActive && r.IsApproved, cancellationToken);

        var customerRoleId = await _uow.Repository<Role, long>().Query.AsNoTracking()
            .Where(r => r.Name == DbSeeder.CustomerRoleName)
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var customerUsers = customerRoleId == 0
            ? 0
            : await _uow.Repository<UserRole, long>().Query.AsNoTracking()
                .CountAsync(ur => ur.RoleId == customerRoleId, cancellationToken);

        const int openTicket = 0;
        var openTickets = await _uow.Repository<SupportTicket, long>().Query.AsNoTracking()
            .CountAsync(t => t.Status == openTicket, cancellationToken);

        var activeCoupons = await _uow.Repository<Coupon, long>().Query.AsNoTracking()
            .CountAsync(c => c.IsActive, cancellationToken);

        return new OperationsReportDto(
            fromUtc,
            toUtc,
            orderCount,
            orderSum,
            activeRestaurants,
            customerUsers,
            openTickets,
            activeCoupons);
    }

    public async Task<(byte[] bytes, string contentType, string fileName)> ExportOperationsReportAsync(
        string format,
        DateTime? fromUtc,
        DateTime? toUtc,
        CancellationToken cancellationToken = default)
    {
        var report = await GetOperationsReportAsync(fromUtc, toUtc, cancellationToken);
        var f = format.Trim().ToLowerInvariant();
        var stamp = $"operations_report_{DateTime.UtcNow:yyyyMMdd_HHmmss}";

        if (f == "json")
        {
            var json = JsonSerializer.Serialize(
                report,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true });
            return (Encoding.UTF8.GetBytes(json), "application/json; charset=utf-8", stamp + ".json");
        }

        if (f == "csv")
        {
            var sb = new StringBuilder();
            sb.AppendLine(
                "fromUtc,toUtc,orderCount,orderTotalSum,activeRestaurantCount,customerRoleUserCount,openSupportTickets,activeCoupons");
            sb.AppendLine(string.Join(',',
                report.FromUtc?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
                report.ToUtc?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty,
                report.OrderCount,
                report.OrderTotalSum.ToString(CultureInfo.InvariantCulture),
                report.ActiveRestaurantCount,
                report.CustomerRoleUserCount,
                report.OpenSupportTickets,
                report.CouponCountActive));
            return (Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", stamp + ".csv");
        }

        if (f == "xlsx")
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Report");
            ws.Cell(1, 1).Value = "FromUtc";
            ws.Cell(1, 2).Value = "ToUtc";
            ws.Cell(1, 3).Value = "OrderCount";
            ws.Cell(1, 4).Value = "OrderTotalSum";
            ws.Cell(1, 5).Value = "ActiveRestaurants";
            ws.Cell(1, 6).Value = "Customers";
            ws.Cell(1, 7).Value = "OpenTickets";
            ws.Cell(1, 8).Value = "ActiveCoupons";
            ws.Cell(2, 1).Value = report.FromUtc;
            ws.Cell(2, 2).Value = report.ToUtc;
            ws.Cell(2, 3).Value = report.OrderCount;
            ws.Cell(2, 4).Value = report.OrderTotalSum;
            ws.Cell(2, 5).Value = report.ActiveRestaurantCount;
            ws.Cell(2, 6).Value = report.CustomerRoleUserCount;
            ws.Cell(2, 7).Value = report.OpenSupportTickets;
            ws.Cell(2, 8).Value = report.CouponCountActive;
            using var ms = new MemoryStream();
            wb.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", stamp + ".xlsx");
        }

        throw new ArgumentException("Formati duhet csv, json ose xlsx.", nameof(format));
    }
}
