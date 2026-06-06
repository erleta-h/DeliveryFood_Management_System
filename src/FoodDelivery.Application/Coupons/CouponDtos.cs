namespace FoodDelivery.Application.Coupons;

public sealed record ValidateCouponRequest(string Code, decimal Subtotal);

public sealed record ValidateCouponResponse(
    long CouponId,
    string Code,
    decimal DiscountPercent,
    decimal DiscountAmount,
    /// <summary>Nëntotali pas zbritjes (para tarifës së dërgesës).</summary>
    decimal FinalTotal);

public sealed record CouponPreview(
    long CouponId,
    string Code,
    decimal DiscountPercent,
    decimal DiscountAmount,
    decimal DiscountedSubtotal);
