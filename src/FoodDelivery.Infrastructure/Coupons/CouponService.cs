using FoodDelivery.Application.Coupons;
using FoodDelivery.Application.Persistence;
using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Coupons;

public sealed class CouponService : ICouponService
{
    private readonly IUnitOfWork _uow;

    public CouponService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<(CouponPreview? Preview, string? ErrorMessage)> PreviewAsync(
        string code,
        decimal subtotal,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeCode(code);
        if (normalized is null)
            return (null, "Kuponi nuk u gjet.");

        var coupon = await _uow.Repository<Coupon, long>().Query.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Code == normalized, cancellationToken);

        if (coupon is null)
            return (null, "Kuponi nuk u gjet.");

        var err = ValidateCoupon(coupon, subtotal, DateTime.UtcNow);
        if (err is not null)
            return (null, err);

        return (BuildPreview(coupon, subtotal), null);
    }

    public async Task<(Coupon? Coupon, CouponPreview? Preview, string? ErrorMessage)> ResolveTrackedAsync(
        string code,
        decimal subtotal,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeCode(code);
        if (normalized is null)
            return (null, null, "Kuponi nuk u gjet.");

        var coupon = await _uow.Repository<Coupon, long>().Query
            .FirstOrDefaultAsync(c => c.Code == normalized, cancellationToken);

        if (coupon is null)
            return (null, null, "Kuponi nuk u gjet.");

        var err = ValidateCoupon(coupon, subtotal, DateTime.UtcNow);
        if (err is not null)
            return (null, null, err);

        return (coupon, BuildPreview(coupon, subtotal), null);
    }

    internal static string? NormalizeCode(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return normalized.Length is >= 3 and <= 32 ? normalized : null;
    }

    internal static string? ValidateCoupon(Coupon coupon, decimal subtotal, DateTime nowUtc)
    {
        if (!coupon.IsActive)
            return "Kuponi nuk është aktiv.";

        if (coupon.ValidFrom.HasValue && nowUtc < coupon.ValidFrom.Value)
            return "Kuponi nuk është aktiv ende.";

        if (coupon.ValidTo.HasValue && nowUtc > coupon.ValidTo.Value)
            return "Kuponi ka skaduar.";

        if (coupon.MaxUses.HasValue && coupon.UsesCount >= coupon.MaxUses.Value)
            return "Kuponi ka arritur limitin e përdorimeve.";

        if (coupon.MinOrderAmount.HasValue && subtotal < coupon.MinOrderAmount.Value)
            return $"Porosia minimale për këtë kupon është {coupon.MinOrderAmount.Value:0.##} €.";

        if (subtotal <= 0)
            return "Shuma e porosisë duhet të jetë pozitive.";

        return null;
    }

    internal static CouponPreview BuildPreview(Coupon coupon, decimal subtotal)
    {
        var discount = CalculateDiscount(subtotal, coupon.DiscountPercent, coupon.MaxDiscountAmount);
        var discountedSubtotal = Math.Max(0, subtotal - discount);
        return new CouponPreview(
            coupon.Id,
            coupon.Code,
            coupon.DiscountPercent,
            discount,
            discountedSubtotal);
    }

    internal static decimal CalculateDiscount(decimal subtotal, decimal discountPercent, decimal? maxDiscountAmount)
    {
        var raw = subtotal * (discountPercent / 100m);
        if (maxDiscountAmount.HasValue)
            raw = Math.Min(raw, maxDiscountAmount.Value);

        raw = Math.Min(raw, subtotal);
        return Math.Round(raw, 2, MidpointRounding.AwayFromZero);
    }
}
