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
    private readonly CouponAuditWriter _audit;

    public AdminCouponsService(FoodDeliveryDbContext db, CouponAuditWriter audit)
    {
        _db = db;
        _audit = audit;
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
                c.MinOrderAmount,
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

        return MapDetail(coupon, createdBy, totalDiscount);
    }

    public async Task<AdminCouponUsesResultDto?> ListUsesAsync(
        long id,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (!await _db.Coupons.AsNoTracking().AnyAsync(c => c.Id == id, cancellationToken))
            return null;

        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, MaxPageSize);

        var q = _db.OrderCoupons.AsNoTracking()
            .Where(oc => oc.CouponId == id)
            .Join(
                _db.Orders.AsNoTracking(),
                oc => oc.OrderId,
                o => o.Id,
                (oc, o) => new { oc, o })
            .Join(
                _db.Users.AsNoTracking(),
                x => x.o.UserId,
                u => u.Id,
                (x, u) => new { x.oc, x.o, u });

        var total = await q.CountAsync(cancellationToken);
        var items = await q
            .OrderByDescending(x => x.o.PlacedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(x => new AdminCouponUseItemDto(
                x.o.Id,
                x.o.OrderNumber,
                x.o.PlacedAt,
                x.oc.DiscountAmount,
                x.o.Total,
                x.u.Email))
            .ToListAsync(cancellationToken);

        return new AdminCouponUsesResultDto(items, total, p, ps);
    }

    public async Task<AdminCouponHistoryResultDto?> ListHistoryAsync(long id, CancellationToken cancellationToken = default)
    {
        if (!await _db.Coupons.AsNoTracking().AnyAsync(c => c.Id == id, cancellationToken))
            return null;

        var items = await (
            from a in _db.CouponAudits.AsNoTracking()
            where a.CouponId == id
            join u in _db.Users.AsNoTracking() on a.CreatedByUserId equals u.Id into users
            from u in users.DefaultIfEmpty()
            orderby a.CreatedAtUtc descending
            select new AdminCouponHistoryItemDto(
                a.EventType,
                a.Detail,
                a.CreatedAtUtc,
                u != null ? u.FirstName + " " + u.LastName : null))
            .ToListAsync(cancellationToken);

        return new AdminCouponHistoryResultDto(items);
    }

    public async Task<(bool ok, long? id, string? error)> CreateAsync(
        AdminCouponCreateRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (code.Length is < 3 or > 32)
            return (false, null, "Kodi duhet 3–32 karaktere.");

        var fieldErr = ValidateFields(
            request.DiscountPercent,
            request.MaxDiscountAmount,
            request.MinOrderAmount,
            request.MaxUses,
            request.ValidFrom,
            request.ValidTo);
        if (fieldErr is not null)
            return (false, null, fieldErr);

        if (await _db.Coupons.AnyAsync(c => c.Code == code, cancellationToken))
            return (false, null, "Ekziston tashmë një kupon me këtë kod.");

        var now = DateTime.UtcNow;
        var coupon = new Coupon
        {
            Code = code,
            DiscountPercent = request.DiscountPercent,
            MaxDiscountAmount = request.MaxDiscountAmount,
            MinOrderAmount = request.MinOrderAmount,
            MaxUses = request.MaxUses,
            ValidFrom = request.ValidFrom,
            ValidTo = request.ValidTo,
            IsActive = request.IsActive,
            UsesCount = 0,
            CreatedAt = now,
            CreatedById = adminUserId,
        };
        _db.Coupons.Add(coupon);
        await _db.SaveChangesAsync(cancellationToken);

        _audit.Add(
            coupon.Id,
            CouponAuditEventTypes.Created,
            $"Kupon {code} ({request.DiscountPercent}%)",
            adminUserId,
            now);
        await _db.SaveChangesAsync(cancellationToken);

        return (true, coupon.Id, null);
    }

    public async Task<string?> UpdateAsync(
        long id,
        AdminCouponUpdateRequest request,
        long? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var coupon = await _db.Coupons.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (coupon is null)
            return "Kupon nuk u gjet.";

        var fieldErr = ValidateFields(
            request.DiscountPercent,
            request.MaxDiscountAmount,
            request.MinOrderAmount,
            request.MaxUses,
            request.ValidFrom,
            request.ValidTo);
        if (fieldErr is not null)
            return fieldErr;

        var changes = new List<string>();
        if (coupon.DiscountPercent != request.DiscountPercent)
            changes.Add($"Zbritja: {coupon.DiscountPercent}% → {request.DiscountPercent}%");
        if (coupon.MaxDiscountAmount != request.MaxDiscountAmount)
            changes.Add("Max. zbritja u ndryshua");
        if (coupon.MinOrderAmount != request.MinOrderAmount)
            changes.Add("Min. porosia u ndryshua");
        if (coupon.MaxUses != request.MaxUses)
            changes.Add("Max. përdorime u ndryshua");
        if (coupon.ValidFrom != request.ValidFrom || coupon.ValidTo != request.ValidTo)
            changes.Add("Periudha u ndryshua");
        if (coupon.IsActive != request.IsActive)
            changes.Add(request.IsActive ? "U aktivizua" : "U çaktivizua");

        var now = DateTime.UtcNow;
        coupon.DiscountPercent = request.DiscountPercent;
        coupon.MaxDiscountAmount = request.MaxDiscountAmount;
        coupon.MinOrderAmount = request.MinOrderAmount;
        coupon.MaxUses = request.MaxUses;
        coupon.ValidFrom = request.ValidFrom;
        coupon.ValidTo = request.ValidTo;
        coupon.IsActive = request.IsActive;
        coupon.UpdatedAt = now;
        coupon.UpdatedById = adminUserId;

        if (changes.Count > 0)
        {
            _audit.Add(
                coupon.Id,
                CouponAuditEventTypes.Updated,
                string.Join("; ", changes),
                adminUserId,
                now);
        }

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    public async Task<string?> SetActiveAsync(
        long id,
        bool isActive,
        long? adminUserId = null,
        CancellationToken cancellationToken = default)
    {
        var coupon = await _db.Coupons.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (coupon is null)
            return "Kupon nuk u gjet.";

        if (coupon.IsActive == isActive)
            return null;

        var now = DateTime.UtcNow;
        coupon.IsActive = isActive;
        coupon.UpdatedAt = now;
        coupon.UpdatedById = adminUserId;

        _audit.Add(
            coupon.Id,
            isActive ? CouponAuditEventTypes.Activated : CouponAuditEventTypes.Deactivated,
            null,
            adminUserId,
            now);

        await _db.SaveChangesAsync(cancellationToken);
        return null;
    }

    private static AdminCouponDetailDto MapDetail(Coupon coupon, string? createdBy, decimal totalDiscount) =>
        new(
            coupon.Id,
            coupon.Code,
            coupon.DiscountPercent,
            coupon.MaxDiscountAmount,
            coupon.MinOrderAmount,
            coupon.MaxUses,
            coupon.UsesCount,
            coupon.IsActive,
            coupon.ValidFrom,
            coupon.ValidTo,
            coupon.CreatedAt,
            createdBy,
            totalDiscount);

    private static string? ValidateFields(
        decimal discountPercent,
        decimal? maxDiscountAmount,
        decimal? minOrderAmount,
        int? maxUses,
        DateTime? validFrom,
        DateTime? validTo)
    {
        if (discountPercent is <= 0 or > 100)
            return "Zbritja duhet të jetë 1–100%.";

        if (maxUses is <= 0)
            return "Max. përdorime duhet të jetë pozitiv.";

        if (maxDiscountAmount is <= 0)
            return "Max. zbritja duhet të jetë pozitive.";

        if (minOrderAmount is <= 0)
            return "Min. porosia duhet të jetë pozitive.";

        if (validFrom.HasValue && validTo.HasValue && validFrom > validTo)
            return "Data e fillimit nuk mund të jetë pas skadimit.";

        return null;
    }
}
