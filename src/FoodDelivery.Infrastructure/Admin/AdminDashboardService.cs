using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Orders;
using FoodDelivery.Application.Partners;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDashboardService : IAdminDashboardService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<AdminDashboardService> _log;

    public AdminDashboardService(IUnitOfWork uow, ILogger<AdminDashboardService> log)
    {
        _uow = uow;
        _log = log;
    }

    public async Task<AdminDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startToday = now.Date;
        var startWeek = startToday.AddDays(-(int)startToday.DayOfWeek + (int)DayOfWeek.Monday);
        if (startToday.DayOfWeek == DayOfWeek.Sunday)
            startWeek = startWeek.AddDays(-7);
        var startMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var orders = _uow.Repository<Order, long>().Query.AsNoTracking();
        var notCancelled = orders.Where(o => o.Status != OrderStatus.Cancelled);

        var totalOrders = await SafeCountAsync(
            () => notCancelled.CountAsync(cancellationToken),
            "totalOrders",
            cancellationToken);

        var ordersToday = await SafeCountAsync(
            () => notCancelled.CountAsync(o => o.PlacedAt >= startToday, cancellationToken),
            "ordersToday",
            cancellationToken);

        var ordersWeek = await SafeCountAsync(
            () => notCancelled.CountAsync(o => o.PlacedAt >= startWeek, cancellationToken),
            "ordersWeek",
            cancellationToken);

        var ordersMonth = await SafeCountAsync(
            () => notCancelled.CountAsync(o => o.PlacedAt >= startMonth, cancellationToken),
            "ordersMonth",
            cancellationToken);

        var revToday = await SafeSumAsync(
            () => notCancelled.Where(o => o.PlacedAt >= startToday).SumAsync(o => (decimal?)o.Total, cancellationToken),
            "revToday",
            cancellationToken);

        var revWeek = await SafeSumAsync(
            () => notCancelled.Where(o => o.PlacedAt >= startWeek).SumAsync(o => (decimal?)o.Total, cancellationToken),
            "revWeek",
            cancellationToken);

        var revMonth = await SafeSumAsync(
            () => notCancelled.Where(o => o.PlacedAt >= startMonth).SumAsync(o => (decimal?)o.Total, cancellationToken),
            "revMonth",
            cancellationToken);

        var restaurants = _uow.Repository<Restaurant, long>().Query.AsNoTracking();
        var activeRestaurants = await SafeCountAsync(
            () => restaurants.CountAsync(r => r.IsActive && r.IsApproved, cancellationToken),
            "activeRestaurants",
            cancellationToken);

        var users = _uow.Repository<User, long>().Query.AsNoTracking();
        var driverProfiles = _uow.Repository<DriverProfile, long>().Query.AsNoTracking();
        var activeDrivers = await SafeCountAsync(
            () =>
                (from d in driverProfiles
                 join u in users on d.UserId equals u.Id
                 where u.IsActive
                 select d).CountAsync(cancellationToken),
            "activeDrivers",
            cancellationToken);

        var partnerApps = _uow.Repository<RestaurantPartnerApplication, long>().Query.AsNoTracking();
        var pendingPartnerApps = await SafeCountAsync(
            () => partnerApps.CountAsync(a => a.Status == PartnerApplicationStatuses.Pending, cancellationToken),
            "pendingPartnerApps",
            cancellationToken);

        var driverApps = _uow.Repository<DriverApplication, long>().Query.AsNoTracking();
        var pendingDriverApps = await SafeCountAsync(
            () => driverApps.CountAsync(a => a.Status == PartnerApplicationStatuses.Pending, cancellationToken),
            "pendingDriverApps",
            cancellationToken);

        var topRestaurants = await SafeListAsync<AdminTopRestaurantDto>(
            async () =>
            {
                return await (
                    from o in notCancelled.Where(o => o.PlacedAt >= startMonth)
                    join r in restaurants on o.RestaurantId equals r.Id
                    group o by r.Name into g
                    select new AdminTopRestaurantDto(g.Key, g.Count()))
                    .OrderByDescending(x => x.OrderCount)
                    .Take(5)
                    .ToListAsync(cancellationToken);
            },
            "topRestaurants",
            cancellationToken);

        var busiestHours = await SafeListAsync<AdminBusyHourDto>(
            async () =>
            {
                return await notCancelled
                    .Where(o => o.PlacedAt >= startToday)
                    .GroupBy(o => o.PlacedAt.Hour)
                    .Select(g => new AdminBusyHourDto(g.Key, g.Count()))
                    .OrderByDescending(x => x.OrderCount)
                    .Take(5)
                    .ToListAsync(cancellationToken);
            },
            "busiestHours",
            cancellationToken);

        return new AdminDashboardDto(
            pendingPartnerApps,
            pendingDriverApps,
            activeRestaurants,
            activeDrivers,
            totalOrders,
            ordersToday,
            ordersWeek,
            ordersMonth,
            revToday,
            revWeek,
            revMonth,
            topRestaurants,
            busiestHours);
    }

    private async Task<int> SafeCountAsync(
        Func<Task<int>> action,
        string metric,
        CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Admin dashboard: {Metric} u anulua — kthehet 0.", metric);
            return 0;
        }
    }

    private async Task<decimal> SafeSumAsync(
        Func<Task<decimal?>> action,
        string metric,
        CancellationToken cancellationToken)
    {
        try
        {
            return await action() ?? 0m;
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Admin dashboard: {Metric} u anulua — kthehet 0.", metric);
            return 0m;
        }
    }

    private async Task<IReadOnlyList<T>> SafeListAsync<T>(
        Func<Task<IReadOnlyList<T>>> action,
        string metric,
        CancellationToken cancellationToken)
    {
        try
        {
            return await action();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Admin dashboard: {Metric} u anulua — listë bosh.", metric);
            return Array.Empty<T>();
        }
    }
}
