namespace FoodDelivery.Application.Restaurants;

// Përmbledhje për UI (shportë, tarifë, hartë, ETA e vlerësuar nga restoranti)
public record RestaurantSummaryDto(
    long Id,
    string Name,
    string CategoryName,
    decimal DeliveryFee,
    int EstimatedDeliveryMinutes,
    decimal AverageRating,
    int ReviewCount,
    string? AddressLine,
    string? City,
    double? Latitude,
    double? Longitude,
    decimal MinOrderAmount,
    string? LogoUrl = null,
    string? CoverUrl = null);
