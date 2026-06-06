using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminCouponsService : IAdminCouponsService
{
    private const int MaxPageSize = 100;
    private const int ExpiringSoonDays = 7;

    private readonly FoodDeliveryDbContext _db;

    public AdminCouponsService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminCouponStatsDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var soon = now.AddDays(ExpiringSoonDays);

        var activeCount = await _db.Coupons.AsNoTracking()
            .CountAsync(c => c.IsActive
                             && (c.ValidFrom == null || c.ValidFrom <= now)
                             && (c.ValidTo == null || c.ValidTo >= now)
                             && (c.MaxUses == null || c.UsesCount < c.MaxUses),
                cancellationToken);

        var totalUses = await _db.Coupons.AsNoTracking()
            .SumAsync(c => (int?)c.UsesCount, cancellationToken) ?? 0;

        var expiringSoon = await _db.Coupons.AsNoTracking()
            .CountAsync(c => c.IsActive
                             && c.ValidTo != null
                             && c.ValidTo >= now
                             && c.ValidTo <= soon,
                cancellationToken);

        var totalDiscount = await _db.OrderCoupons.AsNoTracking()
            .SumAsync(oc => (decimal?)oc.DiscountAmount, cancellationToken) ?? 0;

        return new AdminCouponStatsDto(activeCount, totalUses, expiringSoon, totalDiscount);
    }

    public async Task<AdminCouponListResultDto> ListAsync(
        int page,
        int pageSize,
        string? search,
        string? status,
        string? sort,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);
        var now = DateTime.UtcNow;

        var q = _db.Coupons.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            q = q.Where(c => c.Code.Contains(term));
        }

        var statusKey = status?.Trim().ToLowerInvariant();
        if (statusKey == "active")
        {
            q = q.Where(c => c.IsActive
                             && (c.ValidFrom == null || c.ValidFrom <= now)
                             && (c.ValidTo == null || c.ValidTo >= now)
                             && (c.MaxUses == null || c.UsesCount < c.MaxUses));
        }
        else if (statusKey == "inactive")
        {
            q = q.Where(c => !c.IsActive);
        }
        else if (statusKey == "expired")
        {
            q = q.Where(c => c.ValidTo != null && c.ValidTo < now);
        }

        q = sort?.Trim().ToLowerInvariant() switch
        {
            "created_asc" => q.OrderBy(c => c.CreatedAt),
            "code_asc" => q.OrderBy(c => c.Code),
            "code_desc" => q.OrderByDescending(c => c.Code),
            "discount_desc" => q.OrderByDescending(c => c.DiscountPercent).ThenByDescending(c => c.CreatedAt),
            "uses_desc" => q.OrderByDescending(c => c.UsesCount).ThenByDescending(c => c.CreatedAt),
            _ => q.OrderByDescending(c => c.CreatedAt),
        };

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(c => new AdminCouponListItemDto(
                c.Id,
                c.Code,
                c.DiscountPercent,
                c.MaxDiscountAmount,
                c.MaxUses,
                c.UsesCount,
                c.IsActive,
                c.ValidFrom,
                c.ValidTo,
                c.CreatedAt))
            .ToListAsync(cancellationToken);

        return new AdminCouponListResultDto(items, total, p, ps);
    }

    public async Task<AdminCouponDetailDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var row = await (
            from c in _db.Coupons.AsNoTracking()
            where c.Id == id
            join u in _db.Users.AsNoTracking() on c.CreatedById equals u.Id into users
            from u in users.DefaultIfEmpty()
            select new
            {
                Coupon = c,
                CreatedByName = u != null ? u.FirstName + " " + u.LastName : null,
            }).FirstOrDefaultAsync(cancellationToken);

        if (row is null)
            return null;

        var totalDiscount = await _db.OrderCoupons.AsNoTracking()
            .Where(oc => oc.CouponId == id)
            .SumAsync(oc => (decimal?)oc.DiscountAmount, cancellationToken) ?? 0;

        var coupon = row.Coupon;
        var createdBy = string.IsNullOrWhiteSpace(row.CreatedByName) ? null : row.CreatedByName.Trim();

        return new AdminCouponDetailDto(
            coupon.Id,
            coupon.Code,
            coupon.DiscountPercent,
            coupon.MaxDiscountAmount,
            coupon.MaxUses,
            coupon.UsesCount,
            coupon.IsActive,
            coupon.ValidFrom,
            coupon.ValidTo,
            coupon.CreatedAt,
            createdBy,
            totalDiscount);
    }

    public async Task<(bool ok, long? id, string? error)> CreateAsync(
        AdminCouponCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (code.Length is < 3 or > 32)
            return (false, null, "Kodi duhet 3–32 karaktere.");

        if (request.DiscountPercent is <= 0 or > 100)
            return (false, null, "Zbritja duhet të jetë 1–100%.");

        if (request.MaxUses is <= 0)
            return (false, null, "Max. përdorime duhet të jetë pozitiv.");

        if (request.MaxDiscountAmount is <= 0)
            return (false, null, "Max. zbritja duhet të jetë pozitive.");

        if (request.ValidFrom.HasValue && request.ValidTo.HasValue && request.ValidFrom > request.ValidTo)
            return (false, null, "Data e fillimit nuk mund të jetë pas skadimit.");

        if (await _db.Coupons.AnyAsync(c => c.Code == code, cancellationToken))
            return (false, null, "Ekziston tashmë një kupon me këtë kod.");

        var now = DateTime.UtcNow;
        var c = new Coupon
        {
            Code = code,
            DiscountPercent = request.DiscountPercent,
            MaxDiscountAmount = request.MaxDiscountAmount,
            MaxUses = request.MaxUses,
            ValidFrom = request.ValidFrom,
            ValidTo = request.ValidTo,
            IsActive = request.IsActive,
            UsesCount = 0,
            CreatedAt = now,
        };
        _db.Coupons.Add(c);
        await _db.SaveChangesAsync(cancellationToken);
        return (true, c.Id, null);
    }

    public async Task<string?> SetActiveAsync(long id, bool isActive, CancellationToken cancellationToken = default)
    {
        var c = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (c is null)
            return "Kupon nuk u gjet.";

        c.IsActive = isActive;
        c.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }
}
