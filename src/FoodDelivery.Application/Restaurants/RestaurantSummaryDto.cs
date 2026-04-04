namespace FoodDelivery.Application.Restaurants;

/// <summary>Përmbledhje minimale për UI (shportë, tarifë dërgese).</summary>
public record RestaurantSummaryDto(long Id, string Name, decimal DeliveryFee);
