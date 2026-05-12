namespace FoodDelivery.Application.Restaurants;

// Përmbledhje për UI (shportë, tarifë, hartë, ETA e vlerësuar nga restoranti)
public record RestaurantSummaryDto(
    long Id,
    string Name,
    decimal DeliveryFee,
    int EstimatedDeliveryMinutes,
    string? AddressLine,
    string? City,
    double? Latitude,
    double? Longitude,
    decimal MinOrderAmount);
