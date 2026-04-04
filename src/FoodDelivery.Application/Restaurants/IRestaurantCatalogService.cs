namespace FoodDelivery.Application.Restaurants;

public interface IRestaurantCatalogService
{
    /// <summary>
    /// Kërkim sipas tekstit (emër, qytet, adresë, emër kategorie) dhe opsionalisht kategori.
    /// Fjalët e ndara me hapësirë duhet të përputhen të gjitha (dhe).
    /// </summary>
    Task<IReadOnlyList<RestaurantListItemDto>> SearchAsync(
        string? search,
        long? categoryId,
        RestaurantListSort sort,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoodCategoryOptionDto>> GetCategoriesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RestaurantMenuCategoryDto>> GetRestaurantMenuAsync(
        long restaurantId,
        CancellationToken cancellationToken = default);

    Task<RestaurantSummaryDto?> GetSummaryAsync(
        long restaurantId,
        CancellationToken cancellationToken = default);
}
