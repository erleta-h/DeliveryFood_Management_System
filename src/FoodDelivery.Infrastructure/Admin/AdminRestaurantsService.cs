using FoodDelivery.Application.Admin;
using FoodDelivery.Application.Delivery;
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

        IQueryable<Restaurant> q = _db.Restaurants.AsNoTracking().Include(r => r.DeliveryZone);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(r => r.Name.Contains(s) || (r.City != null && r.City.Contains(s)));
        }

        var total = await q.CountAsync(cancellationToken);
        var restaurants = await q
            .OrderBy(r => r.Name)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToListAsync(cancellationToken);

        var ids = restaurants.Select(r => r.Id).ToList();
        var orderCounts = await _db.Orders.AsNoTracking()
            .Where(o => ids.Contains(o.RestaurantId))
            .GroupBy(o => o.RestaurantId)
            .Select(g => new { RestaurantId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RestaurantId, x => x.Count, cancellationToken);

        var rows = restaurants
            .Select(r => new AdminRestaurantListItemDto(
                r.Id,
                r.Name,
                r.City,
                r.Slug,
                r.IsActive,
                r.IsApproved,
                r.DeliveryZoneId,
                r.DeliveryZone?.Name,
                RestaurantDeliveryTerms.EffectiveDeliveryFee(r, r.DeliveryZone),
                RestaurantDeliveryTerms.EffectiveMinOrderAmount(r, r.DeliveryZone),
                RestaurantDeliveryTerms.EffectiveEstimatedMinutes(r, r.DeliveryZone),
                RestaurantDeliveryTerms.HasOverride(r),
                r.OverrideDeliveryFee,
                r.OverrideMinOrderAmount,
                r.OverrideEstimatedDeliveryMinutes,
                orderCounts.GetValueOrDefault(r.Id)))
            .ToList();

        return new AdminRestaurantListResultDto(rows, total, p, ps);
    }

    public async Task<string?> PatchAsync(
        long restaurantId,
        AdminRestaurantPatchRequest request,
        CancellationToken cancellationToken = default)
    {
        var r = await _db.Restaurants
            .Include(x => x.DeliveryZone)
            .FirstOrDefaultAsync(x => x.Id == restaurantId, cancellationToken);
        if (r is null)
            return "Restoranti nuk u gjet.";

        if (request.IsActive is { } ia)
            r.IsActive = ia;
        if (request.IsApproved is { } ap)
            r.IsApproved = ap;

        if (request.DeliveryZoneId is { } zid)
        {
            if (zid <= 0)
            {
                r.DeliveryZoneId = null;
            }
            else
            {
                var exists = await _db.DeliveryZones.AnyAsync(z => z.Id == zid, cancellationToken);
                if (!exists)
                    return "Zona e dërgesës nuk u gjet.";
                r.DeliveryZoneId = zid;
            }
        }

        if (request.ClearDeliveryOverrides == true)
        {
            r.OverrideDeliveryFee = null;
            r.OverrideMinOrderAmount = null;
            r.OverrideEstimatedDeliveryMinutes = null;
        }

        if (request.OverrideDeliveryFee is { } odf)
        {
            if (odf < 0)
                return "Tarifa e dërgesës nuk mund të jetë negative.";
            r.OverrideDeliveryFee = odf;
        }

        if (request.OverrideMinOrderAmount is { } omo)
        {
            if (omo < 0)
                return "Porosia minimale nuk mund të jetë negative.";
            r.OverrideMinOrderAmount = omo;
        }

        if (request.OverrideEstimatedDeliveryMinutes is { } oeta)
        {
            if (oeta < 1 || oeta > 300)
                return "ETA duhet të jetë 1–300 minuta.";
            r.OverrideEstimatedDeliveryMinutes = oeta;
        }

        // Legacy fields — treated as explicit overrides when set.
        if (request.DeliveryFee is { } df)
        {
            if (df < 0)
                return "Tarifa e dërgesës nuk mund të jetë negative.";
            r.OverrideDeliveryFee = df;
        }

        if (request.MinOrderAmount is { } mo)
        {
            if (mo < 0)
                return "Porosia minimale nuk mund të jetë negative.";
            r.OverrideMinOrderAmount = mo;
        }

        if (request.EstimatedDeliveryMinutes is { } eta)
        {
            if (eta < 1 || eta > 300)
                return "ETA duhet të jetë 1–300 minuta.";
            r.OverrideEstimatedDeliveryMinutes = eta;
        }

        r.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
