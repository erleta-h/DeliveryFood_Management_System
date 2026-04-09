namespace FoodDelivery.Application.Restaurants;

/// <summary>Artikuj për karuselin në listën e restoranteve (klient).</summary>
public record RestaurantProductPreviewDto(
    long Id,
    string Name,
    decimal Price,
    string? ImageUrl);
