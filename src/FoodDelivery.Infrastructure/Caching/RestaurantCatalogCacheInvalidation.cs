using Microsoft.Extensions.Caching.Distributed;

namespace FoodDelivery.Infrastructure.Caching;

internal static class RestaurantCatalogCacheInvalidation
{
   
    /// Heq cache për faqet publike të një restoranti (menu + përmbledhje) pas ndryshimit të menysë ose të dhënave kryesore të restorantit.
    
    public static Task InvalidateRestaurantPublicCatalogAsync(
        IDistributedCache cache,
        long restaurantId,
        CancellationToken cancellationToken = default) =>
        Task.WhenAll(
            cache.RemoveAsync(RestaurantCatalogCacheKeys.RestaurantMenu(restaurantId), cancellationToken),
            cache.RemoveAsync(RestaurantCatalogCacheKeys.RestaurantSummary(restaurantId), cancellationToken));

    public static Task InvalidateFoodCategoriesAsync(
        IDistributedCache cache,
        CancellationToken cancellationToken = default) =>
        cache.RemoveAsync(RestaurantCatalogCacheKeys.FoodCategories, cancellationToken);
}
