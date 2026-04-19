namespace FoodDelivery.Application.Admin;

public sealed record AdminCouponListItemDto(
    long Id,
    string Code,
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    int? MaxUses,
    int UsesCount,
    bool IsActive,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    DateTime CreatedAt);

public sealed record AdminCouponListResultDto(
    IReadOnlyList<AdminCouponListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminCouponCreateRequest(
    string Code,
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    int? MaxUses,
    DateTime? ValidFrom,
    DateTime? ValidTo);

public sealed record AdminCouponSetActiveRequest(bool IsActive);
