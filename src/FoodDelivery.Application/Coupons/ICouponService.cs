using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Application.Coupons;

public interface ICouponService
{
    Task<(CouponPreview? Preview, string? ErrorMessage)> PreviewAsync(
        string code,
        decimal subtotal,
        CancellationToken cancellationToken = default);

    /// <summary>Validon përsëri dhe kthen kuponin me tracking për përdorim në porosi.</summary>
    Task<(Coupon? Coupon, CouponPreview? Preview, string? ErrorMessage)> ResolveTrackedAsync(
        string code,
        decimal subtotal,
        CancellationToken cancellationToken = default);
}
