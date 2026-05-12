namespace FoodDelivery.Infrastructure.Caching;


/// Çelësat e distributed cache për katalogun publik — përputhen me leximet në RestaurantCatalogService.
internal static class RestaurantCatalogCacheKeys
{
    internal const string FoodCategories = "fooddelivery:catalog:food-categories:v1";

    internal static string RestaurantMenu(long restaurantId) =>
        $"fooddelivery:catalog:restaurant-menu:{restaurantId}";

    internal static string RestaurantSummary(long restaurantId) =>
        $"fooddelivery:catalog:restaurant-summary:{restaurantId}";
}
