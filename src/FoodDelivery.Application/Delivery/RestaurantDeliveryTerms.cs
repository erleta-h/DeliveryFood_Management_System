using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Application.Delivery;

public static class RestaurantDeliveryTerms
{
    public static decimal EffectiveDeliveryFee(Restaurant restaurant, DeliveryZone? zone) =>
        restaurant.OverrideDeliveryFee ?? zone?.DeliveryFee ?? restaurant.DeliveryFee;

    public static decimal EffectiveMinOrderAmount(Restaurant restaurant, DeliveryZone? zone) =>
        restaurant.OverrideMinOrderAmount ?? zone?.MinOrderAmount ?? restaurant.MinOrderAmount;

    public static int EffectiveEstimatedMinutes(Restaurant restaurant, DeliveryZone? zone) =>
        restaurant.OverrideEstimatedDeliveryMinutes ?? zone?.EstimatedDeliveryMinutes ?? restaurant.EstimatedDeliveryMinutes;

    public static bool HasOverride(Restaurant restaurant) =>
        restaurant.OverrideDeliveryFee is not null
        || restaurant.OverrideMinOrderAmount is not null
        || restaurant.OverrideEstimatedDeliveryMinutes is not null;
}
