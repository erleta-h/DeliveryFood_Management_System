using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminRestaurantsService : IAdminRestaurantsService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminRestaurantsService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminRestaurantListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.Restaurants.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(r => r.Name.Contains(s) || (r.City != null && r.City.Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);
        var rows = await q
            .OrderBy(r => r.Name)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(r => new AdminRestaurantListItemDto(
                r.Id,
                r.Name,
                r.City,
                r.Slug,
                r.IsActive,
                r.IsApproved,
                r.DeliveryFee,
                r.MinOrderAmount,
                r.EstimatedDeliveryMinutes,
                _db.Orders.Count(o => o.RestaurantId == r.Id)))
            .ToListAsync(cancellationToken);

        return new AdminRestaurantListResultDto(rows, total, p, ps);
    }

    public async Task<string?> PatchAsync(
        long restaurantId,
        AdminRestaurantPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var r = await _db.Restaurants.FirstOrDefaultAsync(x => x.Id == restaurantId, cancellationToken);
        if (r is null)
            return "Restoranti nuk u gjet.";

        if (request.IsActive is { } ia)
            r.IsActive = ia;
        if (request.IsApproved is { } ap)
            r.IsApproved = ap;
        if (request.DeliveryFee is { } df)
        {
            if (df < 0)
                return "Tarifa e dërgesës nuk mund të jetë negative.";
            r.DeliveryFee = df;
        }

        if (request.MinOrderAmount is { } mo)
        {
            if (mo < 0)
                return "Porosia minimale nuk mund të jetë negative.";
            r.MinOrderAmount = mo;
        }

        if (request.EstimatedDeliveryMinutes is { } eta)
        {
            if (eta < 1 || eta > 300)
                return "ETA duhet të jetë 1–300 minuta.";
            r.EstimatedDeliveryMinutes = eta;
        }

        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
