using FoodDelivery.Application.Admin;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminZonesService : IAdminZonesService
{
    private readonly FoodDeliveryDbContext _db;

    public AdminZonesService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AdminCityZoneDto>> ListCitySummariesAsync(
        CancellationToken cancellationToken = default)
    {
        var rows = await _db.Restaurants
            .AsNoTracking()
            .Select(r => new { City = r.City ?? string.Empty, r.IsActive, r.IsApproved })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(x => x.City)
            .Select(g => new AdminCityZoneDto(
                string.IsNullOrEmpty(g.Key) ? "(pa qytet)" : g.Key,
                g.Count(),
                g.Count(x => x.IsActive && x.IsApproved)))
            .OrderByDescending(z => z.RestaurantCount)
            .ToList();
    }
}
