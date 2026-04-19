using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminDashboardService : IAdminDashboardService
{
    private readonly FoodDeliveryDbContext _db;

    public AdminDashboardService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminDashboardDto> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var pendingApps = 0;

        var activeRestaurants = await _db.Restaurants
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var ordersToday = 0;
        var ordersWeek = 0;
        var ordersMonth = 0;

        var revToday = 0m;
        var revWeek = 0m;
        var revMonth = 0m;

        var topRestaurants = new List<AdminTopRestaurantDto>();
        var busiestHours = new List<AdminBusyHourDto>();

        return new AdminDashboardDto(
            pendingApps,
            activeRestaurants,
            ordersToday,
            ordersWeek,
            ordersMonth,
            revToday,
            revWeek,
            revMonth,
            topRestaurants,
            busiestHours);
    }
}