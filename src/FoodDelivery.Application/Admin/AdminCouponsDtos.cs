namespace FoodDelivery.Application.Admin;

public sealed record AdminCouponListItemDto(
    long Id,
    string Code,
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    decimal? MinOrderAmount,
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

public sealed record AdminCouponStatsDto(
    int ActiveCount,
    int TotalUses,
    int ExpiringSoonCount,
    decimal TotalDiscountGiven);

public sealed record AdminCouponDetailDto(
    long Id,
    string Code,
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    decimal? MinOrderAmount,
    int? MaxUses,
    int UsesCount,
    bool IsActive,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    DateTime CreatedAt,
    string? CreatedByName,
    decimal TotalDiscountGiven);

public sealed record AdminCouponCreateRequest(
    string Code,
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    decimal? MinOrderAmount,
    int? MaxUses,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    bool IsActive = true);

public sealed record AdminCouponUpdateRequest(
    decimal DiscountPercent,
    decimal? MaxDiscountAmount,
    decimal? MinOrderAmount,
    int? MaxUses,
    DateTime? ValidFrom,
    DateTime? ValidTo,
    bool IsActive);

public sealed record AdminCouponSetActiveRequest(bool IsActive);

public sealed record AdminCouponUseItemDto(
    long OrderId,
    string OrderNumber,
    DateTime PlacedAtUtc,
    decimal DiscountAmount,
    decimal OrderTotal,
    string CustomerEmail);

public sealed record AdminCouponUsesResultDto(
    IReadOnlyList<AdminCouponUseItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminCouponHistoryItemDto(
    string EventType,
    string? Detail,
    DateTime CreatedAtUtc,
    string? ActorName);

public sealed record AdminCouponHistoryResultDto(IReadOnlyList<AdminCouponHistoryItemDto> Items);
