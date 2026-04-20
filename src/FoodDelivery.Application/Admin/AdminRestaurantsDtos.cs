namespace FoodDelivery.Application.Admin;

public sealed record AdminRestaurantListItemDto(
    long Id,
    string Name,
    string? City,
    string? Slug,
    bool IsActive,
    bool IsApproved,
    decimal DeliveryFee,
    decimal MinOrderAmount,
    int EstimatedDeliveryMinutes,
    int OrderCount);

public sealed record AdminRestaurantListResultDto(
    IReadOnlyList<AdminRestaurantListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record AdminRestaurantPatchRequest(
    bool? IsActive,
    bool? IsApproved,
    decimal? DeliveryFee,
    decimal? MinOrderAmount,
    int? EstimatedDeliveryMinutes);
