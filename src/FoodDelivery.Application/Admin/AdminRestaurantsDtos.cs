namespace FoodDelivery.Application.Admin;

public sealed record AdminRestaurantListItemDto(
    long Id,
    string Name,
    string? City,
    string? Slug,
    bool IsActive,
    bool IsApproved,
    long? DeliveryZoneId,
    string? DeliveryZoneName,
    decimal EffectiveDeliveryFee,
    decimal EffectiveMinOrderAmount,
    int EffectiveEstimatedDeliveryMinutes,
    bool HasDeliveryOverride,
    decimal? OverrideDeliveryFee,
    decimal? OverrideMinOrderAmount,
    int? OverrideEstimatedDeliveryMinutes,
    int OrderCount);

public sealed record AdminRestaurantListResultDto(
    IReadOnlyList<AdminRestaurantListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminRestaurantPatchRequest(
    bool? IsActive,
    bool? IsApproved,
    long? DeliveryZoneId,
    decimal? OverrideDeliveryFee,
    decimal? OverrideMinOrderAmount,
    int? OverrideEstimatedDeliveryMinutes,
    bool? ClearDeliveryOverrides,
    decimal? DeliveryFee,
    decimal? MinOrderAmount,
    int? EstimatedDeliveryMinutes);
