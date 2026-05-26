namespace FoodDelivery.Application.Favorites;

public sealed record FavoriteRestaurantToggleResult(bool IsFavorite);

public sealed record FavoriteRestaurantIdsResponse(IReadOnlyList<long> RestaurantIds);
