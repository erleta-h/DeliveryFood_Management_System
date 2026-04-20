using FoodDelivery.Application.Admin;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Admin;

public sealed class AdminCouponsService : IAdminCouponsService
{
    private const int MaxPageSize = 100;

    private readonly FoodDeliveryDbContext _db;

    public AdminCouponsService(FoodDeliveryDbContext db)
    {
        _db = db;
    }

    public async Task<AdminCouponListResultDto> ListAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.Coupons.AsNoTracking();
        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(c => c.CreatedAt)
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

    public async Task<(bool ok, long? id, string? error)> CreateAsync(
        AdminCouponCreateRequest request,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (code.Length is < 3 or > 32)
            return (false, null, "Kodi duhet 3–32 karaktere.");

        if (request.DiscountPercent is <= 0 or > 100)
            return (false, null, "Zbritja duhet të jetë 1–100%.");

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
            IsActive = true,
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
