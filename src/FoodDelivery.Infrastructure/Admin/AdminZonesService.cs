using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminZonesService : IAdminZonesService
{
    private const int MaxPageSize = 100;

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

    public async Task<DeliveryZoneStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var zones = await _db.DeliveryZones.AsNoTracking().ToListAsync(cancellationToken);
        var active = zones.Where(z => z.IsActive).ToList();
        var covered = await _db.Restaurants.AsNoTracking()
            .CountAsync(r => r.DeliveryZoneId != null, cancellationToken);

        return new DeliveryZoneStatsDto(
            active.Count,
            covered,
            active.Count == 0 ? 0 : active.Average(z => z.DeliveryFee),
            active.Count == 0 ? 0 : active.Average(z => z.EstimatedDeliveryMinutes),
            0);
    }

    public async Task<DeliveryZoneListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.DeliveryZones.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            q = q.Where(z => z.Name.Contains(term) || z.City.Contains(term));
        }

        var statusKey = status?.Trim().ToLowerInvariant();
        if (statusKey == "active")
            q = q.Where(z => z.IsActive);
        else if (statusKey == "inactive")
            q = q.Where(z => !z.IsActive);

        q = sort?.Trim().ToLowerInvariant() switch
        {
            "city" => q.OrderBy(z => z.City).ThenBy(z => z.Name),
            "fee" => q.OrderBy(z => z.DeliveryFee).ThenBy(z => z.Name),
            "name" => q.OrderBy(z => z.Name),
            _ => q.OrderBy(z => z.SortOrder).ThenBy(z => z.Name),
        };

        var total = await q.CountAsync(cancellationToken);
        var ids = await q.Skip((p - 1) * ps).Take(ps).Select(z => z.Id).ToListAsync(cancellationToken);

        if (ids.Count == 0)
            return new DeliveryZoneListResultDto(Array.Empty<DeliveryZoneListItemDto>(), total, p, ps);

        var zones = await _db.DeliveryZones.AsNoTracking()
            .Where(z => ids.Contains(z.Id))
            .ToListAsync(cancellationToken);

        var counts = await _db.Restaurants.AsNoTracking()
            .Where(r => r.DeliveryZoneId != null && ids.Contains(r.DeliveryZoneId.Value))
            .GroupBy(r => r.DeliveryZoneId!.Value)
            .Select(g => new { ZoneId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ZoneId, x => x.Count, cancellationToken);

        var byId = zones.ToDictionary(z => z.Id);
        var items = ids
            .Select(id =>
            {
                var z = byId[id];
                return new DeliveryZoneListItemDto(
                    z.Id,
                    z.Name,
                    z.City,
                    z.DeliveryFee,
                    z.MinOrderAmount,
                    z.EstimatedDeliveryMinutes,
                    z.IsActive,
                    counts.GetValueOrDefault(z.Id),
                    z.SortOrder);
            })
            .ToList();

        return new DeliveryZoneListResultDto(items, total, p, ps);
    }

    public async Task<IReadOnlyList<DeliveryZoneOptionDto>> ListOptionsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _db.DeliveryZones.AsNoTracking()
            .OrderBy(z => z.SortOrder)
            .ThenBy(z => z.Name)
            .Select(z => new DeliveryZoneOptionDto(z.Id, z.Name, z.City, z.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<DeliveryZoneDetailDto?> GetDetailAsync(long id, CancellationToken cancellationToken = default)
    {
        var zone = await _db.DeliveryZones.AsNoTracking()
            .FirstOrDefaultAsync(z => z.Id == id, cancellationToken);
        if (zone is null)
            return null;

        var restaurants = await _db.Restaurants.AsNoTracking()
            .Where(r => r.DeliveryZoneId == id)
            .OrderBy(r => r.Name)
            .Select(r => new DeliveryZoneRestaurantSummaryDto(r.Id, r.Name, r.IsActive, r.IsApproved))
            .ToListAsync(cancellationToken);

        return MapDetail(zone, restaurants);
    }

    public async Task<(DeliveryZoneDetailDto? Result, string? Error)> CreateAsync(
        CreateDeliveryZoneRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var err = ValidateTerms(request.DeliveryFee, request.MinOrderAmount, request.EstimatedDeliveryMinutes);
        if (err is not null)
            return (null, err);

        var name = request.Name.Trim();
        var city = request.City.Trim();
        if (string.IsNullOrEmpty(name))
            return (null, "Emri i zon�s �sht� i detyruesh�m.");
        if (string.IsNullOrEmpty(city))
            return (null, "Qyteti �sht� i detyruesh�m.");

        var sort = request.SortOrder ?? await _db.DeliveryZones.CountAsync(cancellationToken) + 1;
        var now = DateTime.UtcNow;

        var zone = new DeliveryZone
        {
            Name = name,
            City = city,
            DeliveryFee = request.DeliveryFee,
            MinOrderAmount = request.MinOrderAmount,
            EstimatedDeliveryMinutes = request.EstimatedDeliveryMinutes,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = request.IsActive,
            SortOrder = sort,
            CreatedAt = now,
            CreatedById = adminUserId,
        };

        _db.DeliveryZones.Add(zone);
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetDetailAsync(zone.Id, cancellationToken), null);
    }

    public async Task<(DeliveryZoneDetailDto? Result, string? Error)> UpdateAsync(
        long id,
        UpdateDeliveryZoneRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var zone = await _db.DeliveryZones.FirstOrDefaultAsync(z => z.Id == id, cancellationToken);
        if (zone is null)
            return (null, "Zona nuk u gjet.");

        if (request.Name is { } n)
        {
            var trimmed = n.Trim();
            if (string.IsNullOrEmpty(trimmed))
                return (null, "Emri i zon�s nuk mund t� jet� bosh.");
            zone.Name = trimmed;
        }

        if (request.City is { } c)
        {
            var trimmed = c.Trim();
            if (string.IsNullOrEmpty(trimmed))
                return (null, "Qyteti nuk mund t� jet� bosh.");
            zone.City = trimmed;
        }

        if (request.DeliveryFee is { } df)
        {
            if (df < 0)
                return (null, "Tarifa nuk mund t� jet� negative.");
            zone.DeliveryFee = df;
        }

        if (request.MinOrderAmount is { } mo)
        {
            if (mo < 0)
                return (null, "Minimumi i porosis� nuk mund t� jet� negative.");
            zone.MinOrderAmount = mo;
        }

        if (request.EstimatedDeliveryMinutes is { } eta)
        {
            if (eta < 1 || eta > 300)
                return (null, "Koha e dor�zimit duhet t� jet� 1�300 minuta.");
            zone.EstimatedDeliveryMinutes = eta;
        }

        if (request.Description is not null)
            zone.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();

        if (request.IsActive is { } active)
            zone.IsActive = active;

        if (request.SortOrder is { } so)
            zone.SortOrder = so;

        zone.UpdatedAt = DateTime.UtcNow;
        zone.UpdatedById = adminUserId;
        await _db.SaveChangesAsync(cancellationToken);

        return (await GetDetailAsync(id, cancellationToken), null);
    }

    public async Task<string?> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        var zone = await _db.DeliveryZones.FirstOrDefaultAsync(z => z.Id == id, cancellationToken);
        if (zone is null)
            return "Zona nuk u gjet.";

        var hasRestaurants = await _db.Restaurants.AnyAsync(r => r.DeliveryZoneId == id, cancellationToken);
        if (hasRestaurants)
            return "Zona ka restorante t� lidhura � zhvendosi ose hiq lidhjen para fshirjes.";

        _db.DeliveryZones.Remove(zone);
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static DeliveryZoneDetailDto MapDetail(
        DeliveryZone zone,
        IReadOnlyList<DeliveryZoneRestaurantSummaryDto> restaurants) =>
        new(
            zone.Id,
            zone.Name,
            zone.City,
            zone.DeliveryFee,
            zone.MinOrderAmount,
            zone.EstimatedDeliveryMinutes,
            zone.Description,
            zone.IsActive,
            zone.SortOrder,
            restaurants.Count,
            restaurants);

    private static string? ValidateTerms(decimal fee, decimal minOrder, int minutes)
    {
        if (fee < 0)
            return "Tarifa nuk mund t� jet� negative.";
        if (minOrder < 0)
            return "Minimumi i porosis� nuk mund t� jet� negative.";
        if (minutes < 1 || minutes > 300)
            return "Koha e dor�zimit duhet t� jet� 1�300 minuta.";
        return null;
    }
}
