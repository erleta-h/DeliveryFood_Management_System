namespace FoodDelivery.Application.Admin;

public sealed record AdminCityZoneDto(string City, int RestaurantCount, int ActiveApprovedCount);

public sealed record DeliveryZoneListItemDto(
    long Id,
    string Name,
    string City,
    decimal DeliveryFee,
    decimal MinOrderAmount,
    int EstimatedDeliveryMinutes,
    bool IsActive,
    int RestaurantCount,
    int SortOrder);

public sealed record DeliveryZoneListResultDto(
    IReadOnlyList<DeliveryZoneListItemDto> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record DeliveryZoneStatsDto(
    int ActiveZoneCount,
    int RestaurantsCovered,
    decimal AverageDeliveryFee,
    double AverageEstimatedMinutes,
    int PendingApplicationsCount);

public sealed record DeliveryZoneDetailDto(
    long Id,
    string Name,
    string City,
    decimal DeliveryFee,
    decimal MinOrderAmount,
    int EstimatedDeliveryMinutes,
    string? Description,
    bool IsActive,
    int SortOrder,
    int RestaurantCount,
    IReadOnlyList<DeliveryZoneRestaurantSummaryDto> Restaurants);

public sealed record DeliveryZoneRestaurantSummaryDto(long Id, string Name, bool IsActive, bool IsApproved);

public sealed record CreateDeliveryZoneRequest(
    string Name,
    string City,
    decimal DeliveryFee,
    decimal MinOrderAmount,
    int EstimatedDeliveryMinutes,
    string? Description,
    bool IsActive,
    int? SortOrder);

public sealed record UpdateDeliveryZoneRequest(
    string? Name,
    string? City,
    decimal? DeliveryFee,
    decimal? MinOrderAmount,
    int? EstimatedDeliveryMinutes,
    string? Description,
    bool? IsActive,
    int? SortOrder);

public sealed record DeliveryZoneOptionDto(long Id, string Name, string City, bool IsActive);