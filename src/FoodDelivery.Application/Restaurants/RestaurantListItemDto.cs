namespace FoodDelivery.Application.Restaurants;

public record RestaurantListItemDto(
    long Id,
    string Name,
    string? Slug,
    string? City,
    string? AddressLine,
    string CategoryName,
    long CategoryId,
    decimal DeliveryFee,
    decimal MinOrderAmount,
    decimal AverageRating,
    int ReviewCount,
    int EstimatedDeliveryMinutes,
    IReadOnlyList<RestaurantProductPreviewDto> PreviewItems,
    double? DistanceKm = null,
    string? LogoUrl = null,
    string? CoverUrl = null);
