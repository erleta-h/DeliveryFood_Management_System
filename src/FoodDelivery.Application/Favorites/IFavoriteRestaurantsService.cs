namespace FoodDelivery.Application.Favorites;

public interface IFavoriteRestaurantsService
{
    Task<IReadOnlyList<long>> GetRestaurantIdsAsync(long userId, CancellationToken cancellationToken = default);

    Task<bool> IsFavoriteAsync(long userId, long restaurantId, CancellationToken cancellationToken = default);

    Task<FavoriteRestaurantToggleResult> ToggleAsync(
        long userId,
        long restaurantId,
        CancellationToken cancellationToken = default);
}
