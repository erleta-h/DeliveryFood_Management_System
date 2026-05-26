namespace FoodDelivery.Application.Restaurants;

public interface IRestaurantCatalogService
{

    // Kërkim sipas tekstit (emër, qytet, adresë, emër kategorie) dhe opsionalisht kategori.
    // Fjalët e ndara me hapësirë duhet të përputhen të gjitha (dhe).

    Task<IReadOnlyList<RestaurantListItemDto>> SearchAsync(
        string? search,
        long? categoryId,
        RestaurantListSort sort,
        double? customerLat,
        double? customerLng,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoodCategoryOptionDto>> GetCategoriesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetRestaurantMenuAsync(
        long restaurantId,
        CancellationToken cancellationToken = default);

    Task<RestaurantSummaryDto?> GetSummaryAsync(
        long restaurantId,
        CancellationToken cancellationToken = default);

    Task<RestaurantReviewsResultDto?> GetRestaurantReviewsAsync(
        long restaurantId,
        int take,
        CancellationToken cancellationToken = default);
}
